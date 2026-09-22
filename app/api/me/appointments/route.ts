import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";
import { safeLog } from "@/lib/log/safe";

/**
 * POST /api/me/appointments
 *
 * Aluno cria agendamento com seu personal.
 * Guard: auth + CSRF. Aluno só pode agendar COM O PRÓPRIO trainer.
 */
const bodySchema = z
  .object({
    trainer_id: z.string().uuid(),
    student_id: z.string().uuid(),
    appointment_type_id: z.string().uuid(),
    title: z.string().min(1).max(120),
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime(),
    notes: z.string().max(500).nullable().optional(),
  })
  .strict();

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  // Aluno só pode agendar para si mesmo, e com seu próprio trainer.
  if (body.data.student_id !== auth.user.id) {
    return NextResponse.json(
      { ok: false, error: "Você só pode agendar pra você mesmo." },
      { status: 403 },
    );
  }

  // Confirma que o trainer da requisição é realmente o trainer do aluno
  const { data: sp } = await auth.supabase
    .from("student_profiles")
    .select("trainer_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!sp || sp.trainer_id !== body.data.trainer_id) {
    return NextResponse.json(
      { ok: false, error: "Trainer inválido pra esse aluno." },
      { status: 403 },
    );
  }

  const { data, error } = await auth.supabase
    .from("appointments")
    .insert({
      trainer_id: body.data.trainer_id,
      student_id: body.data.student_id,
      appointment_type_id: body.data.appointment_type_id,
      title: body.data.title,
      starts_at: body.data.starts_at,
      ends_at: body.data.ends_at,
      notes: body.data.notes ?? null,
      status: "scheduled",
    })
    .select("id")
    .single();

  if (error || !data) {
    safeLog.error("[appointments] insert failed", error?.message);
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Erro ao criar agendamento" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: data.id });
}
