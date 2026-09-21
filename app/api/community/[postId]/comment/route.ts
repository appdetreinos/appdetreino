import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { safeLog } from "@/lib/log/safe";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";

const bodySchema = z
  .object({
    content: z.string().trim().min(1).max(500),
  })
  .strict();

/**
 * POST /api/community/[postId]/comment
 * Adiciona um comentário. RLS garante que post existe e aluno está
 * no audience correto (handled by policy).
 * Guard: CSRF + auth.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ postId: string }> },
) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  const { postId } = await ctx.params;

  const { error } = await auth.supabase.from("community_comments").insert({
    post_id: postId,
    author_id: auth.user.id,
    content: body.data.content,
  });

  if (error) {
    safeLog.error("[community-comment] insert failed", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
