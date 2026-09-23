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
    email: z
      .string()
      .email()
      .max(200)
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
 * Blindagem em 2 níveis (resolvendo FK violations em cascata):
 *   Nível 1 — Garante `profiles` existe pro auth.uid() (auth.users ≠ profiles)
 *   Nível 2 — Garante `trainer_profiles` existe (FK target de student_invites)
 *
 * Se já existir perfil, atualiza trial_ends_at se estiver NULL.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  // Nível 1+2 — Chama RPC SECURITY DEFINER que garante profile + trainer_profile
  // (bypass RLS, idempotente, segura contra trainer órfão)
  const { data: ready, error: readyError } = await auth.supabase.rpc("ensure_trainer_ready");
  if (readyError) {
    safeLog.error("[student-invites] ensure_trainer_ready failed", readyError.message);
    return NextResponse.json(
      { ok: false, error: `Falha ao configurar perfil: ${readyError.message}` },
      { status: 500 },
    );
  }
  if (!ready || (typeof ready === "object" && "ok" in ready && ready.ok === false)) {
    const msg =
      typeof ready === "object" && ready && "error" in ready
        ? String((ready as { error?: string }).error)
        : "Falha desconhecida";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  // Limite do plano: sem vaga, sem convite
  const { getStudentLimitState } = await import("@/lib/billing/limits");
  const limitState = await getStudentLimitState(auth.user.id);
  if (limitState.reached) {
    return NextResponse.json(
      {
        ok: false,
        error: `Limite do plano ${limitState.planTier} atingido (${limitState.used}/${limitState.limit}). Faz upgrade pra convidar mais.`,
        code: "plan_limit_reached",
      },
      { status: 403 },
    );
  }

  // Cria o convite (trigger gera code automaticamente)
  const { data, error: insertError } = await auth.supabase
    .from("student_invites")
    .insert({
      trainer_id: auth.user.id,
      full_name: body.data.full_name,
      phone: body.data.phone,
      email: body.data.email,
      goal: body.data.goal,
      notes: body.data.notes,
      status: "pending",
    })
    .select("code, full_name, phone, email")
    .single();

  if (insertError || !data) {
    safeLog.error("[student-invites] insert failed", insertError?.message ?? "no data");
    const raw = (insertError?.message ?? "").toLowerCase();
    let friendly = "Não deu pra criar o convite. Tenta de novo.";
    if (raw.includes("foreign key") && raw.includes("trainer_profiles")) {
      friendly =
        "Tua conta de profissional não tá totalmente configurada. Sai e entra de novo.";
    } else if (raw.includes("foreign key") && raw.includes("profiles")) {
      friendly = "Tua conta de usuário não tá totalmente configurada. Sai e entra de novo.";
    } else if (raw.includes("foreign key")) {
      friendly = `Erro de chave estrangeira: ${insertError?.message}`;
    } else if (raw.includes("duplicate")) {
      friendly = "Já existe um convite com esses dados.";
    } else if (raw.includes("row-level security") || raw.includes("policy")) {
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
