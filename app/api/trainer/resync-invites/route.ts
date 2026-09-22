import { NextResponse, type NextRequest } from "next/server";
import { requireAuthenticated } from "@/lib/security/guards";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { safeLog } from "@/lib/log/safe";

/**
 * POST /api/trainer/resync-invites
 *
 * Re-sincroniza o estado dos convites do trainer:
 *  1. Varre todos os invites 'pending' antigos (>1h)
 *  2. Verifica se existe user cujo email bate com invite.email
 *  3. Se sim, marca invite como aceito E cria student_profile
 *
 * Útil quando o fluxo de signup teve bug e os convites ficaram pendentes.
 * Idempotente. Pode ser chamado várias vezes.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  // Guard: só trainer
  const { data: meProfile } = await auth.supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (meProfile?.role !== "trainer" && meProfile?.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Só profissional pode re-sincronizar." },
      { status: 403 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: false, error: "Configuração incompleta." }, { status: 500 });
  }

  const admin = createSbClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Busca invites pending do trainer (com email)
  const { data: pendingInvites, error: invitesError } = await admin
    .from("student_invites")
    .select("id, code, full_name, phone, goal, email, trainer_id, status")
    .eq("trainer_id", auth.user.id)
    .eq("status", "pending");

  if (invitesError) {
    safeLog.error("[resync-invites] list failed", invitesError.message);
    return NextResponse.json({ ok: false, error: "Falha ao listar convites." }, { status: 500 });
  }

  if (!pendingInvites || pendingInvites.length === 0) {
    return NextResponse.json({
      ok: true,
      synced: 0,
      message: "Nenhum convite pendente pra sincronizar.",
    });
  }

  // 2. Lista users
  const { data: usersList, error: usersError } = await admin.auth.admin.listUsers();
  if (usersError) {
    safeLog.error("[resync-invites] listUsers failed", usersError.message);
    return NextResponse.json({ ok: false, error: "Falha ao listar usuários." }, { status: 500 });
  }

  const syncedInvites: Array<{
    invite_code: string;
    invite_email: string | null;
    matched_user_email: string;
    student_id: string;
  }> = [];

  for (const inv of pendingInvites) {
    if (!inv.email) continue; // sem email gravado, não dá pra casar

    const matchedUser = usersList.users.find(
      (u) => u.email?.toLowerCase() === inv.email!.toLowerCase(),
    );
    if (!matchedUser) continue;

    // Garante trainer_profile existe
    const { data: trainerExists } = await admin
      .from("trainer_profiles")
      .select("user_id")
      .eq("user_id", inv.trainer_id)
      .maybeSingle();
    if (!trainerExists) {
      await admin.from("trainer_profiles").insert({
        user_id: inv.trainer_id,
        plan_tier: "start",
        trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // Garante profile do aluno
    await admin.from("profiles").upsert(
      {
        id: matchedUser.id,
        role: "student",
        full_name: inv.full_name,
      },
      { onConflict: "id" },
    );

    // Cria/atualiza student_profile
    const { error: spError } = await admin.from("student_profiles").insert({
      user_id: matchedUser.id,
      trainer_id: inv.trainer_id,
      full_name: inv.full_name,
      phone: inv.phone,
      goal: inv.goal,
      status: "active",
      joined_at: new Date().toISOString(),
    });
    if (spError) {
      await admin.from("student_profiles").update({
        trainer_id: inv.trainer_id,
        full_name: inv.full_name,
        phone: inv.phone,
        goal: inv.goal,
        status: "active",
      }).eq("user_id", matchedUser.id);
    }

    // Marca invite como aceito
    await admin.from("student_invites").update({
      status: "accepted",
      accepted_by: matchedUser.id,
      accepted_at: new Date().toISOString(),
    }).eq("id", inv.id);

    syncedInvites.push({
      invite_code: inv.code,
      invite_email: inv.email,
      matched_user_email: matchedUser.email!,
      student_id: matchedUser.id,
    });
  }

  return NextResponse.json({
    ok: true,
    synced: syncedInvites.length,
    invites: syncedInvites,
    total_pending: pendingInvites.length,
    message:
      syncedInvites.length === 0
        ? `Verifiquei ${pendingInvites.length} convite(s) pendente(s). Nenhum aluno casou com os e-mails dos convites — provavelmente o aluno cadastrou com e-mail diferente. Use "Vincular manualmente" pra resolver.`
        : `${syncedInvites.length} convite(s) sincronizado(s). Recarregue o painel pra ver os alunos ativos.`,
  });
}
