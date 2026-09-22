import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { safeLog } from "@/lib/log/safe";

const bodySchema = z
  .object({
    email: z.string().email().max(200),
    full_name: z.string().min(1).max(120),
  })
  .strict();

/**
 * POST /api/trainer/claim-student
 *
 * Trainer "reivindica" manualmente um aluno que se cadastrou mas ficou
 * sem vínculo (caso comum: aluno cadastrou com email diferente do
 * esperado, ou preencheu o form com nome errado).
 *
 * Usa admin client (service_role) pra bypassar RLS. Cria/atualiza:
 *   - student_profiles (vincula ao trainer)
 *   - profiles (atualiza nome)
 *
 * Idempotente: se o aluno já é do trainer, só atualiza nome.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  // Guard: só trainer pode reivindicar
  const { data: meProfile } = await auth.supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (meProfile?.role !== "trainer" && meProfile?.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Só profissional pode vincular aluno." },
      { status: 403 },
    );
  }

  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: "Configuração do servidor incompleta." },
      { status: 500 },
    );
  }

  const admin = createSbClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Acha o user pelo email
  const { data: usersList, error: userError } = await admin.auth.admin.listUsers();
  if (userError) {
    safeLog.error("[claim-student] listUsers failed", userError.message);
    return NextResponse.json({ ok: false, error: "Falha ao buscar aluno." }, { status: 500 });
  }

  const targetUser = usersList.users.find(
    (u) => u.email?.toLowerCase() === body.data.email.toLowerCase(),
  );

  if (!targetUser) {
    return NextResponse.json(
      {
        ok: false,
        error: "Nenhum aluno cadastrado com esse e-mail. Pede pra ele criar conta primeiro.",
      },
      { status: 404 },
    );
  }

  // 2. Garante trainer_profile do trainer existe
  const { data: trainerExists } = await admin
    .from("trainer_profiles")
    .select("user_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!trainerExists) {
    const { error: trainerCreateError } = await admin
      .from("trainer_profiles")
      .insert({
        user_id: auth.user.id,
        plan_tier: "start",
        trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    if (trainerCreateError) {
      safeLog.error("[claim-student] trainer_profile create failed", trainerCreateError.message);
      return NextResponse.json({ ok: false, error: "Falha ao criar perfil de profissional." }, { status: 500 });
    }
  }

  // 3. Garante profile do aluno existe e tem role='student'
  const { data: studentProfileExists } = await admin
    .from("profiles")
    .select("id")
    .eq("id", targetUser.id)
    .maybeSingle();

  if (!studentProfileExists) {
    await admin.from("profiles").insert({
      id: targetUser.id,
      full_name: body.data.full_name,
      role: "student",
    });
  } else {
    await admin
      .from("profiles")
      .update({ role: "student", full_name: body.data.full_name })
      .eq("id", targetUser.id);
  }

  // 4. Cria/atualiza student_profile (INSERT, se falhar com conflito, UPDATE)
  const { error: spInsertError } = await admin.from("student_profiles").insert({
    user_id: targetUser.id,
    trainer_id: auth.user.id,
    full_name: body.data.full_name,
    phone: null,
    goal: null,
    status: "active",
    joined_at: new Date().toISOString(),
  });

  if (spInsertError && !spInsertError.message?.toLowerCase().includes("duplicate")) {
    safeLog.error("[claim-student] student_profile insert failed", spInsertError.message);
    return NextResponse.json(
      { ok: false, error: `Falha ao vincular: ${spInsertError.message}` },
      { status: 500 },
    );
  }

  // Se já existia (duplicate), atualiza trainer_id
  if (spInsertError) {
    const { error: spUpdateError } = await admin
      .from("student_profiles")
      .update({
        trainer_id: auth.user.id,
        full_name: body.data.full_name,
        status: "active",
      })
      .eq("user_id", targetUser.id);
    if (spUpdateError) {
      safeLog.error("[claim-student] student_profile update failed", spUpdateError.message);
      return NextResponse.json(
        { ok: false, error: `Falha ao atualizar: ${spUpdateError.message}` },
        { status: 500 },
      );
    }
  }

  // 5. Marca todos os invites pending do trainer que matcham esse email como aceitos
  //    (caso o convite anterior tenha ficado pendente)
  await admin
    .from("student_invites")
    .update({
      status: "accepted",
      accepted_by: targetUser.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("trainer_id", auth.user.id)
    .eq("status", "pending")
    .ilike("email", body.data.email);

  // (Convites sem email gravado ficam — trainer deleta manualmente se quiser)

  return NextResponse.json({
    ok: true,
    student_id: targetUser.id,
    full_name: body.data.full_name,
    email: body.data.email,
  });
}
