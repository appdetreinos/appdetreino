import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { safeLog } from "@/lib/log/safe";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";
import { todayBR } from "@/lib/utils/date";

/**
 * POST /api/me/measurements
 *
 * Aluno registra a PRÓPRIA medição, OU trainer registra pra um aluno dele.
 * - Se aluno: student_id é o próprio auth.uid().
 * - Se trainer: precisa passar student_id e o aluno precisa ser dele (validação cross-trainer).
 *
 * RLS já permite (migration 0021). Aqui a gente reforça trainer_id no app layer.
 */

const bodySchema = z
  .object({
    student_id: z.string().uuid().optional(), // se ausente, é o próprio aluno
    date: z.string().optional(),               // default = hoje BR
    weight_kg: z.number().min(20).max(300).nullable().optional(),
    body_fat_pct: z.number().min(1).max(60).nullable().optional(),
    chest_cm: z.number().min(40).max(200).nullable().optional(),
    waist_cm: z.number().min(40).max(200).nullable().optional(),
    hip_cm: z.number().min(40).max(200).nullable().optional(),
    arm_cm: z.number().min(15).max(80).nullable().optional(),
    thigh_cm: z.number().min(25).max(100).nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
  })
  .strict();

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  let studentId: string;

  if (body.data.student_id) {
    // Trainer inserindo pra um aluno
    const { data: sp } = await auth.supabase
      .from("student_profiles")
      .select("trainer_id")
      .eq("user_id", body.data.student_id)
      .maybeSingle();
    if (!sp || sp.trainer_id !== auth.user.id) {
      return NextResponse.json(
        { ok: false, error: "Aluno não pertence a esse trainer." },
        { status: 403 },
      );
    }
    studentId = body.data.student_id;
  } else {
    // Aluno inserindo pra si mesmo
    studentId = auth.user.id;
  }

  const { error } = await auth.supabase.from("measurements").insert({
    student_id: studentId,
    date: body.data.date || todayBR(),
    weight_kg: body.data.weight_kg ?? null,
    body_fat_pct: body.data.body_fat_pct ?? null,
    chest_cm: body.data.chest_cm ?? null,
    waist_cm: body.data.waist_cm ?? null,
    hip_cm: body.data.hip_cm ?? null,
    arm_cm: body.data.arm_cm ?? null,
    thigh_cm: body.data.thigh_cm ?? null,
    notes: body.data.notes ?? null,
  });

  if (error) {
    safeLog.error("[measurements] insert failed", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
