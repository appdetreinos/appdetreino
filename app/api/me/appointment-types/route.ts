import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { safeLog } from "@/lib/log/safe";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";

const createSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    duration_minutes: z.number().int().min(5).max(480),
    price_cents: z.number().int().nonnegative().max(1_000_000_00).nullable().optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    type: z.enum(["presencial", "online", "avaliacao"]).default("presencial"),
    active: z.boolean().optional().default(true),
  })
  .strict();

/** POST /api/me/appointment-types
 *
 * Cria novo tipo. CSRF + auth.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, createSchema);
  if (!body.ok) return body.response;

  const { data, error } = await auth.supabase
    .from("appointment_types")
    .insert({
      trainer_id: auth.user.id,
      name: body.data.name,
      duration_minutes: body.data.duration_minutes,
      price_cents: body.data.price_cents ?? null,
      color: body.data.color ?? "#FF6B35",
      type: body.data.type,
      active: body.data.active ?? true,
    })
    .select("id")
    .single();

  if (error) {
    safeLog.error("[appointment-types/create] failed", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id });
}
