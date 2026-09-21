import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { safeLog } from "@/lib/log/safe";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";

const bodySchema = z
  .object({
    checked: z.boolean(),
  })
  .strict();

/**
 * PATCH /api/me/shopping-items/[id]
 *
 * Toggle de item da lista de compras. RLS garante que o item pertence
 * a uma lista do aluno logado.
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
    .from("shopping_list_items")
    .update({ checked: body.data.checked })
    .eq("id", id);

  if (error) {
    safeLog.error("[shopping-items] update failed", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
