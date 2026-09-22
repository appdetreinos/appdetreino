import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeLog } from "@/lib/log/safe";

const bodySchema = z
  .object({
    full_name: z.string().min(1).max(120),
    email: z.string().email().max(200),
    password: z.string().min(6).max(200),
    invite_code: z.string().min(1).max(40),
  })
  .strict();

/**
 * POST /api/auth/student-signup
 *
 * Cria conta de aluno via convite — fluxo otimizado:
 *   1. Cria o user (auth.admin.createUser com service_role — bypass confirmação
 *      de e-mail, já que o convite valida o email indiretamente)
 *   2. Faz signIn pra criar sessão
 *   3. Chama RPC accept_invite com SECURITY DEFINER que cria profile + student_profile
 *      e vincula ao trainer
 *
 * Erros retornam a mensagem ORIGINAL do Supabase pra debugar.
 */
export async function POST(request: NextRequest) {
  let body: { full_name: string; email: string; password: string; invite_code: string };
  try {
    const raw = (await request.json()) as unknown;
    const result = bodySchema.safeParse(raw);
    if (!result.success) {
      return NextResponse.json(
        {
          ok: false,
          error: `Dados inválidos: ${result.error.issues[0]?.message ?? "?"}`,
        },
        { status: 400 },
      );
    }
    body = result.data;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body inválido (JSON esperado)." },
      { status: 400 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "Configuração do servidor incompleta (SUPABASE_SERVICE_ROLE_KEY faltando).",
      },
      { status: 500 },
    );
  }

  // Cliente admin (bypass RLS e email_confirm)
  const admin = createSbClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 0. Verifica se o convite ainda tá válido (não usado, não expirado)
  //    Bloqueia ANTES de criar o user pra evitar contas órfãs.
  const { data: inviteCheck, error: inviteCheckError } = await admin
    .from("student_invites")
    .select("id, status, expires_at, trainer_id")
    .eq("code", body.invite_code)
    .maybeSingle();

  if (inviteCheckError || !inviteCheck) {
    return NextResponse.json(
      { ok: false, error: "Convite não encontrado. Pede um novo pro teu personal." },
      { status: 404 },
    );
  }

  if (inviteCheck.status === "accepted") {
    return NextResponse.json(
      {
        ok: false,
        error: "Esse convite já foi usado. Pede um novo pro teu personal.",
      },
      { status: 409 },
    );
  }

  if (inviteCheck.expires_at && new Date(inviteCheck.expires_at) < new Date()) {
    return NextResponse.json(
      { ok: false, error: "Esse convite expirou (7 dias). Pede um novo pro teu personal." },
      { status: 410 },
    );
  }

  // 1. Cria user via admin (bypass email confirm)
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: {
      full_name: body.full_name,
      role: "student",
    },
  });

  if (createError || !created?.user) {
    safeLog.error("[student-signup] createUser failed", createError?.message);
    const msg = (createError?.message ?? "").toLowerCase();
    let friendly: string;
    if (msg.includes("already") || msg.includes("duplicate")) {
      friendly = "Esse e-mail já tem conta. Tenta entrar.";
    } else if (msg.includes("password") && msg.includes("6")) {
      friendly = "Senha precisa ter pelo menos 6 caracteres.";
    } else if (msg.includes("email") && msg.includes("invalid")) {
      friendly = "E-mail inválido.";
    } else if (createError?.message) {
      friendly = `Erro ao criar conta: ${createError.message}`;
    } else {
      friendly = "Não deu pra criar a conta. Tenta de novo.";
    }
    return NextResponse.json({ ok: false, error: friendly }, { status: 400 });
  }

  // 2. Cria sessão pro user recém-criado via cookies
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });
  if (signInError) {
    safeLog.error("[student-signup] signIn failed", signInError.message);
    return NextResponse.json(
      {
        ok: false,
        error: `Conta criada, mas não foi possível iniciar sessão: ${signInError.message}. Tenta entrar em /login.`,
      },
      { status: 500 },
    );
  }

  // 3. Aceita o convite — usa admin client pra bypassar RLS no INSERT em student_profiles.
  //    (O aluno novo acabou de ser criado, e a RLS de student_profiles exige
  //    trainer_id = auth.uid() OR user_id = auth.uid(), o que ainda não tá
  //    configurado. Admin vai direto.)
  const { error: rpcError } = await admin.rpc("accept_invite", {
    invite_code: body.invite_code,
  });
  if (rpcError) {
    safeLog.error("[student-signup] accept_invite failed", rpcError.message);
    // Fallback: tenta criar student_profile direto via admin (caso a RPC tenha
    // falhado em algum edge case)
    const { data: inviteForFallback } = await admin
      .from("student_invites")
      .select("trainer_id, full_name, phone, goal, code")
      .eq("code", body.invite_code)
      .maybeSingle();

    if (inviteForFallback) {
      const { error: spError } = await admin.from("student_profiles").upsert(
        {
          user_id: created.user.id,
          trainer_id: inviteForFallback.trainer_id,
          full_name: inviteForFallback.full_name,
          phone: inviteForFallback.phone,
          goal: inviteForFallback.goal,
          status: "active",
          joined_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (!spError) {
        // Marca convite como aceito
        await admin
          .from("student_invites")
          .update({
            status: "accepted",
            accepted_by: created.user.id,
            accepted_at: new Date().toISOString(),
          })
          .eq("id", inviteCheck.id);

        return NextResponse.json({ ok: true, role: "student" });
      }
      safeLog.error("[student-signup] fallback student_profile upsert failed", spError.message);
    }

    return NextResponse.json({
      ok: true,
      warning: `Conta criada, mas o vínculo com o personal falhou: ${rpcError.message}. Fale com seu personal.`,
      role: "student",
    });
  }

  return NextResponse.json({ ok: true, role: "student" });
}
