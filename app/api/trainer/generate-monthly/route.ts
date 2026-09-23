import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";
import { safeLog } from "@/lib/log/safe";

const bodySchema = z.object({ template_id: z.string().uuid() }).strict();

const MES_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Próximo dia 05 (padrão Prime: cobrança todo dia 5). */
function nextDueDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const due = now.getDate() < 5 ? new Date(y, m, 5) : new Date(y, m + 1, 5);
  return due.toISOString().slice(0, 10);
}

/**
 * POST /api/trainer/generate-monthly {template_id}
 *
 * Gera 1 cobrança por aluno ativo a partir do modelo.
 * Idempotente no mês: pula aluno que já tem cobrança com a mesma
 * descrição (template + mês de vencimento).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const { data: me } = await auth.supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (me?.role !== "trainer" && me?.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Só profissional." }, { status: 403 });
  }

  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  const { data: tpl } = await auth.supabase
    .from("payment_templates")
    .select("id, name, amount, billing_type")
    .eq("id", body.data.template_id)
    .eq("trainer_id", auth.user.id)
    .maybeSingle();

  if (!tpl || tpl.amount == null) {
    return NextResponse.json({ ok: false, error: "Modelo não encontrado." }, { status: 404 });
  }

  const dueDate = nextDueDate();
  const due = new Date(dueDate + "T12:00:00");
  const label = `${MES_PT[due.getMonth()]}/${due.getFullYear()}`;
  const description = `${tpl.name} — ${label}`;

  const { data: students } = await auth.supabase
    .from("student_profiles")
    .select("user_id")
    .eq("trainer_id", auth.user.id)
    .eq("status", "active");

  if (!students || students.length === 0) {
    return NextResponse.json({ ok: false, error: "Nenhum aluno ativo." }, { status: 400 });
  }

  // Já cobrados neste ciclo (idempotência)
  const { data: existing } = await auth.supabase
    .from("payments")
    .select("student_id")
    .eq("trainer_id", auth.user.id)
    .eq("description", description);

  const already = new Set((existing ?? []).map((e) => e.student_id as string));
  const todo = students.filter((s) => !already.has(s.user_id as string));

  if (todo.length === 0) {
    return NextResponse.json({ ok: true, created: 0, skipped: students.length });
  }

  const { error } = await auth.supabase.from("payments").insert(
    todo.map((s) => ({
      trainer_id: auth.user.id,
      student_id: s.user_id,
      amount: tpl.amount,
      status: "pending",
      due_date: dueDate,
      gateway: "pix_direto",
      billing_type: tpl.billing_type ?? "PIX",
      description,
    })),
  );

  if (error) {
    safeLog.error("[generate-monthly] insert failed", error.message);
    return NextResponse.json({ ok: false, error: "Falha ao gerar cobranças." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, created: todo.length, skipped: already.size, due_date: dueDate });
}
