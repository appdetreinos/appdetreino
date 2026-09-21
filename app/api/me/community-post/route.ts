import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { safeLog } from "@/lib/log/safe";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";

const bodySchema = z
  .object({
    content: z.string().trim().min(1).max(2000),
    audience: z.enum(["students", "all"]).default("students"),
    pinned: z.boolean().optional(),
  })
  .strict();

/**
 * POST /api/me/community-post
 *
 * Trainer cria um post. trainer_id = auth.uid() (forçado via RLS).
 * Guard: CSRF + auth.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  const { error } = await auth.supabase.from("community_posts").insert({
    trainer_id: auth.user.id,
    author_id: auth.user.id,
    audience: body.data.audience,
    content: body.data.content,
    pinned: body.data.pinned ?? false,
  });

  if (error) {
    safeLog.error("[community-post] insert failed", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
