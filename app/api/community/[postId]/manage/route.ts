import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { safeLog } from "@/lib/log/safe";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";

const patchSchema = z.object({ pinned: z.boolean() }).strict();

async function ownPost(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  userId: string,
  postId: string,
) {
  const { data: post } = await supabase
    .from("community_posts")
    .select("id, trainer_id")
    .eq("id", postId)
    .maybeSingle();
  const p = post as { id: string; trainer_id: string } | null;
  if (!p) return null;
  const { data: scope } = await supabase.rpc("trainer_scope_ids");
  const ids = ((scope as string[] | null) ?? [userId]) as string[];
  if (!ids.includes(p.trainer_id)) return null;
  return p;
}

/**
 * PATCH   /api/community/[postId]/manage {pinned} — fixar/desafixar
 * DELETE  /api/community/[postId]/manage — apagar post próprio (ou da equipe)
 */
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ postId: string }> },
) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;
  const { postId } = await ctx.params;

  const body = await parseJsonBody(request, patchSchema);
  if (!body.ok) return body.response;

  const post = await ownPost(auth.supabase, auth.user.id, postId);
  if (!post) return NextResponse.json({ ok: false, error: "Sem acesso." }, { status: 403 });

  const { error } = await auth.supabase
    .from("community_posts")
    .update({ pinned: body.data.pinned })
    .eq("id", postId);
  if (error) {
    safeLog.error("[post-manage] pin failed", error.message);
    return NextResponse.json({ ok: false, error: "Não deu pra atualizar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ postId: string }> },
) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;
  const { postId } = await ctx.params;

  const post = await ownPost(auth.supabase, auth.user.id, postId);
  if (!post) return NextResponse.json({ ok: false, error: "Sem acesso." }, { status: 403 });

  const { error } = await auth.supabase.from("community_posts").delete().eq("id", postId);
  if (error) {
    safeLog.error("[post-manage] delete failed", error.message);
    return NextResponse.json({ ok: false, error: "Não deu pra apagar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
