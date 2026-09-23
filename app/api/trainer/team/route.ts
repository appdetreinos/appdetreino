import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { safeLog } from "@/lib/log/safe";

const addSchema = z.object({ email: z.string().email().max(200) }).strict();
const removeSchema = z.object({ member_id: z.string().uuid() }).strict();

import { createClient } from "@/lib/supabase/server";

type Sb = Awaited<ReturnType<typeof createClient>>;

async function isTrainer(supabase: Sb, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  const role = (data as { role?: string } | null)?.role;
  return role === "trainer" || role === "admin";
}

/**
 * GET — lista staff da consultoria (owner vê membros; membro vê onde está).
 * POST {email} — adiciona colaborador (precisa ter conta de profissional).
 * DELETE {member_id} — remove.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const { data } = await auth.supabase
    .from("team_members")
    .select("id, member_id, role, status, created_at, member:member_id(full_name)")
    .eq("owner_id", auth.user.id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ ok: true, members: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;
  if (!(await isTrainer(auth.supabase, auth.user.id))) {
    return NextResponse.json({ ok: false, error: "Só profissional." }, { status: 403 });
  }

  const body = await parseJsonBody(request, addSchema);
  if (!body.ok) return body.response;

  const admin = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: usersList, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) {
    safeLog.error("[team] listUsers failed", listErr.message);
    return NextResponse.json({ ok: false, error: "Falha ao buscar usuário." }, { status: 500 });
  }
  const target = usersList.users.find(
    (u) => u.email?.toLowerCase() === body.data.email.toLowerCase(),
  );
  if (!target) {
    return NextResponse.json(
      { ok: false, error: "Nenhuma conta com esse e-mail. A pessoa precisa se cadastrar primeiro." },
      { status: 404 },
    );
  }
  if (target.id === auth.user.id) {
    return NextResponse.json({ ok: false, error: "Esse e-mail é o seu." }, { status: 400 });
  }

  const { data: prof } = await admin.from("profiles").select("role").eq("id", target.id).maybeSingle();
  if ((prof as { role?: string } | null)?.role !== "trainer") {
    return NextResponse.json(
      { ok: false, error: "Só contas de profissional podem entrar na equipe." },
      { status: 400 },
    );
  }

  const { error } = await admin.from("team_members").upsert(
    { owner_id: auth.user.id, member_id: target.id, role: "staff", status: "accepted" },
    { onConflict: "owner_id,member_id" },
  );
  if (error) {
    safeLog.error("[team] upsert failed", error.message);
    return NextResponse.json({ ok: false, error: "Não deu pra adicionar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, removeSchema);
  if (!body.ok) return body.response;

  const { error } = await auth.supabase
    .from("team_members")
    .delete()
    .eq("owner_id", auth.user.id)
    .eq("member_id", body.data.member_id);
  if (error) return NextResponse.json({ ok: false, error: "Não deu pra remover." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
