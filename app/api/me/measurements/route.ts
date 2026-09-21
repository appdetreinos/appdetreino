import { NextResponse, type NextRequest } from "next/server";
import { measurementSchema } from "@/lib/validation/student";
import { safeLog } from "@/lib/log/safe";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";
import { todayBR } from "@/lib/utils/date";

/**
 * POST /api/me/measurements
 *
 * Aluno registra sua própria medição. RLS garante que student_id = auth.uid().
 * Guard: CSRF + auth.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, measurementSchema);
  if (!body.ok) return body.response;

  const { error } = await auth.supabase.from("measurements").insert({
    student_id: auth.user.id,
    date: todayBR(),
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
