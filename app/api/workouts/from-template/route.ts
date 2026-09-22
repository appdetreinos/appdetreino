import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { safeLog } from "@/lib/log/safe";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";

const bodySchema = z
  .object({
    templateId: z.string().uuid(),
    studentId: z.string().uuid(),
  })
  .strict();

/**
 * POST /api/workouts/from-template
 *
 * Trainer clona um workout_templates num workout real atribuído
 * ao aluno. Chama a RPC `clone_workout_template` que faz tudo em
 * transação (workout + workout_day + workout_items).
 *
 * Guard: CSRF + auth + aluno precisa ser do próprio trainer.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  // Verifica que o aluno pertence ao trainer logado (anti-ataque:
  // trainer A não pode atribuir treino pra aluno do trainer B)
  const { data: student, error: studentErr } = await auth.supabase
    .from("student_profiles")
    .select("user_id, trainer_id")
    .eq("user_id", body.data.studentId)
    .maybeSingle();

  if (studentErr || !student) {
    return NextResponse.json(
      { ok: false, error: "Aluno não encontrado." },
      { status: 404 },
    );
  }
  if (student.trainer_id !== auth.user.id) {
    safeLog.warn("[from-template] cross-trainer assign attempt", {
      trainer: auth.user.id,
      student: body.data.studentId,
    });
    return NextResponse.json(
      { ok: false, error: "Esse aluno não é teu." },
      { status: 403 },
    );
  }

  // Chama a RPC que faz a clonagem em transação
  const { data: workoutId, error: cloneErr } = await auth.supabase.rpc(
    "clone_workout_template",
    {
      p_template_id: body.data.templateId,
      p_student_id: body.data.studentId,
    },
  );

  if (cloneErr || !workoutId) {
    safeLog.error("[from-template] clone failed", cloneErr?.message);
    return NextResponse.json(
      {
        ok: false,
        error:
          cloneErr?.message.includes("template_not_found")
            ? "Template não encontrado."
            : "Não deu pra criar o treino. Tenta de novo.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, workoutId });
}
