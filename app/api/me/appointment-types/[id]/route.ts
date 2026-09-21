import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { safeLog } from "@/lib/log/safe";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";

const bodySchema = z
  .object({
    active: z.boolean().optional(),
    name: z.string().trim().min(2).max(80).optional(),
    duration_minutes: z.number().int().min(5).max(480).optional(),
    price_cents: z.number().int().nonnegative().max(1_000_000_00).nullable().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    type: z.enum(["presencial", "online", "avaliacao"]).optional(),
  })
  .strict();

/**
 * PATCH /api/me/appointment-types/[id]
 * Atualiza um tipo. Apenas dono.
 * Guard: CSRF + auth.
 */
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  const { id } = await ctx.params;

  const { error } = await auth.supabase
    .from("appointment_types")
    .update(body.data)
    .eq("id", id)
    .eq("trainer_id", auth.user.id); // garante ownership

  if (error) {
    safeLog.error("[appointment-types] update failed", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
