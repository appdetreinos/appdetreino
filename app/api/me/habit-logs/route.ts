import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { safeLog } from "@/lib/log/safe";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";
import { todayBR } from "@/lib/utils/date";

const bodySchema = z
  .object({
    habit_id: z.string().uuid(),
    count: z.number().nonnegative().max(1000),
  })
  .strict();

/**
 * POST /api/me/habit-logs
 *
 * Upsert do log de hoje do hábito. UNIQUE (habit_id, logged_at) garante
 * idempotência. RLS garante que habit_id pertece ao student logado.
 * Guard: CSRF + auth.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  const { error } = await auth.supabase
    .from("habit_logs")
    .upsert(
      {
        habit_id: body.data.habit_id,
        student_id: auth.user.id,
        logged_at: todayBR(),
        count: body.data.count,
      },
      { onConflict: "habit_id,logged_at" },
    );

  if (error) {
    safeLog.error("[habit-logs] upsert failed", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
