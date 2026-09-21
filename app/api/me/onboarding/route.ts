import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { safeLog } from "@/lib/log/safe";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";

const bodySchema = z
  .object({
    step: z.number().int().min(0).max(10),
    answers: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

/**
 * PATCH /api/me/onboarding
 *
 * Trainer persiste seu progresso no questionário de onboarding.
 * Guard: CSRF + auth.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  const completed = body.data.step >= 5; // 4 steps + resultado

  const { error } = await auth.supabase
    .from("trainer_profiles")
    .update({
      onboarding_step: body.data.step,
      onboarding_completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("user_id", auth.user.id);

  if (error) {
    safeLog.error("[onboarding] update failed", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
