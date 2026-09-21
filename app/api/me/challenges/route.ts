import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { safeLog } from "@/lib/log/safe";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";

const bodySchema = z
  .object({
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().max(500).nullable().optional(),
    starts_at: z.string(),
    ends_at: z.string(),
    reward_xp: z.number().int().min(0).max(10_000).optional(),
    reward_badge: z.string().uuid().nullable().optional(),
  })
  .strict();

/**
 * POST /api/me/challenges — trainer cria um desafio.
 * Guard: CSRF + auth.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  if (new Date(body.data.starts_at) >= new Date(body.data.ends_at)) {
    return NextResponse.json({ ok: false, error: "invalid_period" }, { status: 400 });
  }

  const { error } = await auth.supabase.from("challenges").insert({
    trainer_id: auth.user.id,
    title: body.data.title,
    description: body.data.description ?? null,
    starts_at: body.data.starts_at,
    ends_at: body.data.ends_at,
    reward_xp: body.data.reward_xp ?? 0,
    reward_badge: body.data.reward_badge ?? null,
  });

  if (error) {
    safeLog.error("[challenges] insert failed", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
