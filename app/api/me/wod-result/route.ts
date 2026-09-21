import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { safeLog } from "@/lib/log/safe";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";

const bodySchema = z
  .object({
    wod_id: z.string().uuid(),
    result_time_seconds: z.number().int().nonnegative().max(99_999).nullable().optional(),
    result_rounds: z.number().int().nonnegative().max(100_000).nullable().optional(),
    result_notes: z.string().max(500).nullable().optional(),
  })
  .strict();

/**
 * POST /api/me/wod-result
 *
 * Upsert em wod_participants (PRIMARY KEY = wod_id + student_id).
 * Guard: CSRF + auth (via requireAuthenticated).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  // Pelo menos um dos dois
  if (body.data.result_time_seconds == null && body.data.result_rounds == null) {
    return NextResponse.json(
      { ok: false, error: "missing_result" },
      { status: 400 },
    );
  }

  const { error } = await auth.supabase.from("wod_participants").upsert(
    {
      wod_id: body.data.wod_id,
      student_id: auth.user.id,
      result_time_seconds: body.data.result_time_seconds ?? null,
      result_rounds: body.data.result_rounds ?? null,
      result_notes: body.data.result_notes ?? null,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "wod_id,student_id" },
  );

  if (error) {
    safeLog.error("[wod-result] upsert failed", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
