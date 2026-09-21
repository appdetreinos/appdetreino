import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { safeLog } from "@/lib/log/safe";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";
import { todayBR } from "@/lib/utils/date";

const bodySchema = z
  .object({
    workout_id: z.string().uuid(),
    notes: z.string().max(500).optional(),
  })
  .strict();

/**
 * POST /api/me/workout-sessions
 *
 * Aluno marca check-in do treino de hoje.
 * Upsert em (workout_id, student_id, date) — UNIQUE constraint no DB.
 * Guard: CSRF + auth.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  const { error } = await auth.supabase
    .from("workout_sessions")
    .upsert(
      {
        workout_id: body.data.workout_id,
        student_id: auth.user.id,
        date: todayBR(),
        status: "done",
        notes: body.data.notes ?? null,
      },
      { onConflict: "workout_id,student_id,date" },
    );

  if (error) {
    safeLog.error("[workout-sessions] upsert failed", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
