import { NextResponse, type NextRequest } from "next/server";
import { safeLog } from "@/lib/log/safe";
import { requireAuthenticated } from "@/lib/security/guards";

/**
 * POST   /api/community/[postId]/like — curtir
 * DELETE /api/community/[postId]/like — descurtir
 *
 * Idempotente: UNIQUE (post_id, user_id) na tabela community_likes.
 * Guard: CSRF + auth.
 */
async function handler(
  request: NextRequest,
  ctx: { params: Promise<{ postId: string }> },
  action: "like" | "unlike",
) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const { postId } = await ctx.params;

  if (action === "like") {
    const { error } = await auth.supabase
      .from("community_likes")
      .insert({ post_id: postId, user_id: auth.user.id });
    if (error && !error.message.includes("duplicate key")) {
      safeLog.error("[community-like] insert failed", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await auth.supabase
      .from("community_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", auth.user.id);
    if (error) {
      safeLog.error("[community-like] delete failed", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ postId: string }> },
) {
  return handler(req, ctx, "like");
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ postId: string }> },
) {
  return handler(req, ctx, "unlike");
}
