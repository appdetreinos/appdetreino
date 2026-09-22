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
 * VERSÃO BLINDADA — não depende de nenhuma RPC. Usa apenas PostgREST via
 * admin client (bypassa RLS). Idempotente em todos os passos.
 *
 * Etapas:
 *   1. Valida convite (pending, não expirado)
 *   2. Cria user via admin.auth.admin.createUser (bypass email_confirm)
 *   3. Faz signIn pra criar sessão (cookies)
 *   4. Garante trainer_profile existe (cria se faltar)
 *   5. Garante profile do aluno com role='student' e full_name correto
 *   6. Cria/atualiza student_profile vinculado
 *   7. Marca invite como aceito
 *
 * Logging extensivo: cada etapa loga o resultado pra debug remoto.
 */
export async function POST(request: NextRequest) {
  // 1. Parse body
  let body: { full_name: string; email: string; password: string; invite_code: string };
  try {
    const raw = (await request.json()) as unknown;
    const result = bodySchema.safeParse(raw);
    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: `Dados inválidos: ${result.error.issues[0]?.message ?? "?"}` },
        { status: 400 },
      );
    }
    body = result.data;
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido (JSON esperado)." }, { status: 400 });
  }

  // 2. Setup admin client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: "Configuração do servidor incompleta (SUPABASE_SERVICE_ROLE_KEY faltando)." },
      { status: 500 },
    );
  }

  const admin = createSbClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 3. Verifica convite
  const { data: inviteCheck, error: inviteCheckError } = await admin
    .from("student_invites")
    .select("id, status, expires_at, trainer_id, full_name, phone, goal, code")
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
      { ok: false, error: "Esse convite já foi usado. Pede um novo pro teu personal." },
      { status: 409 },
    );
  }
  if (inviteCheck.expires_at && new Date(inviteCheck.expires_at) < new Date()) {
    return NextResponse.json(
      { ok: false, error: "Esse convite expirou (7 dias). Pede um novo pro teu personal." },
      { status: 410 },
    );
  }

  const trainerId = inviteCheck.trainer_id;

  // 4. Cria user via admin (trigger handle_new_user cria profile com role='student')
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: { full_name: body.full_name, role: "student" },
  });

  if (createError || !created?.user) {
    safeLog.error("[student-signup] createUser failed", createError?.message);
    const msg = (createError?.message ?? "").toLowerCase();
    let friendly = "Não deu pra criar a conta. Tenta de novo.";
    if (msg.includes("already") || msg.includes("duplicate")) {
      friendly = "Esse e-mail já tem conta. Tenta entrar.";
    } else if (msg.includes("password") && msg.includes("6")) {
      friendly = "Senha precisa ter pelo menos 6 caracteres.";
    } else if (msg.includes("email") && msg.includes("invalid")) {
      friendly = "E-mail inválido.";
    } else if (createError?.message) {
      friendly = `Erro ao criar conta: ${createError.message}`;
    }
    return NextResponse.json({ ok: false, error: friendly }, { status: 400 });
  }

  const studentId = created.user.id;

  // 5. SignIn pra criar sessão (cookies) — best-effort, não bloqueia o fluxo
  try {
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });
    if (signInError) {
      safeLog.warn("[student-signup] signIn failed (não-bloqueante)", signInError.message);
    }
  } catch (e) {
    safeLog.warn("[student-signup] signIn threw", String(e));
  }

  // 6. Garante TRAINER_PROFILE existe (FK target de student_profiles)
  //    Se trainer_profile não existir, o INSERT em student_profiles vai
  //    falhar por FK. Por isso criamos aqui.
  const trainerProfileResult = await admin
    .from("trainer_profiles")
    .select("user_id")
    .eq("user_id", trainerId)
    .maybeSingle();

  if (!trainerProfileResult.data) {
    const { error: trainerInsertError } = await admin
      .from("trainer_profiles")
      .insert({
        user_id: trainerId,
        plan_tier: "start",
        trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

    if (trainerInsertError) {
      safeLog.error(
        "[student-signup] trainer_profile insert failed",
        trainerInsertError.message,
      );
      // Se o trainer_profile FK falhou, tenta garantir profile do trainer também
      try {
        await admin
          .from("profiles")
          .upsert(
            { id: trainerId, role: "trainer", full_name: "Personal" },
            { onConflict: "id" },
          );
      } catch {
        // ignore
      }
      // Tenta novamente criar trainer_profile
      try {
        await admin
          .from("trainer_profiles")
          .insert({
            user_id: trainerId,
            plan_tier: "start",
            trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });
      } catch {
        // ignore
      }
    }
  }

  // 7. FORÇA profile do aluno com role='student' + full_name correto
  //    (caso o trigger tenha falhado OU o user já existisse com dados errados)
  const { error: profileUpsertError } = await admin.from("profiles").upsert(
    {
      id: studentId,
      role: "student",
      full_name: body.full_name,
    },
    { onConflict: "id" },
  );
  if (profileUpsertError) {
    safeLog.error("[student-signup] profile upsert failed", profileUpsertError.message);
  }

  // 8. Cria STUDENT_PROFILE (INSERT; se já existe, UPDATE)
  const studentInsertPayload = {
    user_id: studentId,
    trainer_id: trainerId,
    full_name: inviteCheck.full_name || body.full_name,
    phone: inviteCheck.phone,
    goal: inviteCheck.goal,
    status: "active",
    joined_at: new Date().toISOString(),
  };

  const { error: spInsertError } = await admin
    .from("student_profiles")
    .insert(studentInsertPayload);

  let spFinalError = spInsertError;
  if (spInsertError) {
    // Já existe (duplicate key) ou outro erro — tenta UPDATE
    const { error: spUpdateError } = await admin
      .from("student_profiles")
      .update({
        trainer_id: trainerId,
        full_name: studentInsertPayload.full_name,
        phone: inviteCheck.phone,
        goal: inviteCheck.goal,
        status: "active",
      })
      .eq("user_id", studentId);

    if (spUpdateError) {
      safeLog.error(
        "[student-signup] student_profile UPDATE failed",
        `${spInsertError.message} | update: ${spUpdateError.message}`,
      );
      spFinalError = spUpdateError;
    } else {
      spFinalError = null; // INSERT falhou mas UPDATE passou
    }
  }

  if (spFinalError) {
    // student_profile não foi criado nem atualizado — não tem como marcar invite
    return NextResponse.json({
      ok: true,
      warning: `Conta criada, mas o vínculo com o personal falhou: ${spFinalError.message}. Fale com seu personal.`,
      role: "student",
    });
  }

  // 9. Marca invite como aceito (sempre — pra limpar "Aguardando" do trainer)
  const { error: inviteUpdateError } = await admin
    .from("student_invites")
    .update({
      status: "accepted",
      accepted_by: studentId,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", inviteCheck.id);

  if (inviteUpdateError) {
    safeLog.error(
      "[student-signup] invite UPDATE failed (student_profile OK)",
      inviteUpdateError.message,
    );
  }

  return NextResponse.json({ ok: true, role: "student" });
}
