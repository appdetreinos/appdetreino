import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";
import { safeLog } from "@/lib/log/safe";

const bodySchema = z
  .object({
    full_name: z.string().min(1).max(120),
    phone: z
      .string()
      .max(40)
      .nullable()
      .optional()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
    goal: z
      .string()
      .max(200)
      .nullable()
      .optional()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
    notes: z
      .string()
      .max(2000)
      .nullable()
      .optional()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
  })
  .strict();

/**
 * POST /api/me/student-invites
 *
 * Trainer cria convite pra aluno entrar.
 *
 * Blindagem: se o trainer logado não tem `trainer_profiles` (por bug em
 * migrações antigas), cria antes pra evitar FK violation em `student_invites`.
 *
 * O trigger `student_invites_auto_code` (migration 0007) gera o `code`
 * automaticamente se omitido.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  // Garante que o trainer tem trainer_profiles (FK target)
  const { data: tp, error: tpError } = await auth.supabase
    .from("trainer_profiles")
    .select("user_id, plan_tier, trial_ends_at")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (tpError) {
    safeLog.error("[student-invites] trainer_profile fetch failed", tpError.message);
    return NextResponse.json({ ok: false, error: tpError.message }, { status: 500 });
  }

  if (!tp) {
    // Trainer órfão (não tem trainer_profiles) — cria on-demand com trial de 3 dias
    safeLog.warn("[student-invites] trainer_profile ausente, criando on-demand", {
      user_id: auth.user.id,
    });
    const { error: createTpError } = await auth.supabase
      .from("trainer_profiles")
      .insert({
        user_id: auth.user.id,
        plan_tier: "start",
        trial_ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      });
    if (createTpError) {
      safeLog.error("[student-invites] trainer_profile create failed", createTpError.message);
      return NextResponse.json(
        { ok: false, error: `Falha ao configurar perfil de profissional: ${createTpError.message}` },
        { status: 500 },
      );
    }
  } else if (!tp.trial_ends_at) {
    // Tem perfil mas sem trial — garante
    await auth.supabase
      .from("trainer_profiles")
      .update({
        trial_ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("user_id", auth.user.id);
  }

  // Cria o convite (trigger gera code automaticamente)
  const { data, error: insertError } = await auth.supabase
    .from("student_invites")
    .insert({
      trainer_id: auth.user.id,
      full_name: body.data.full_name,
      phone: body.data.phone,
      goal: body.data.goal,
      notes: body.data.notes,
      status: "pending",
    })
    .select("code, full_name, phone")
    .single();

  if (insertError || !data) {
    safeLog.error("[student-invites] insert failed", insertError?.message ?? "no data");
    const raw = (insertError?.message ?? "").toLowerCase();
    let friendly = "Não deu pra criar o convite. Tenta de novo.";
    if (raw.includes("foreign key") && raw.includes("trainer_profiles")) {
      friendly =
        "Tua conta de profissional não tá totalmente configurada ainda. Sai e entra de novo.";
    } else if (raw.includes("foreign key") && raw.includes("profiles")) {
      friendly = "Tua conta de usuário não tá totalmente configurada. Sai e entra de novo.";
    } else if (raw.includes("foreign key")) {
      friendly = `Erro de chave estrangeira: ${insertError?.message}`;
    } else if (raw.includes("duplicate")) {
      friendly = "Já existe um convite com esses dados.";
    } else if (raw.includes("row-level security") || raw.includes("rls") || raw.includes("policy")) {
      friendly = "Sem permissão pra criar convite.";
    } else if (insertError?.message) {
      friendly = `Erro: ${insertError.message}`;
    }
    return NextResponse.json({ ok: false, error: friendly }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    code: data.code,
    full_name: data.full_name,
    phone: data.phone,
  });
}
