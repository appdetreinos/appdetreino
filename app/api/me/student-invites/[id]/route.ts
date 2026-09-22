import { NextResponse, type NextRequest } from "next/server";
import { requireAuthenticated } from "@/lib/security/guards";
import { safeLog } from "@/lib/log/safe";

/**
 * DELETE /api/me/student-invites/:id
 *
 * Trainer cancela (exclui) um convite que ele criou.
 *
 * Segurança:
 *   - Só permite excluir convites onde trainer_id = auth.uid()
 *   - Se o convite já foi aceito, recusa (não tem como "desvincular" sem
 *     deletar o aluno — operação separada)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const { id: inviteId } = await params;

  const { data: invite, error: fetchError } = await auth.supabase
    .from("student_invites")
    .select("id, trainer_id, status")
    .eq("id", inviteId)
    .maybeSingle();

  if (fetchError || !invite) {
    return NextResponse.json(
      { ok: false, error: "Convite não encontrado." },
      { status: 404 },
    );
  }

  if (invite.trainer_id !== auth.user.id) {
    return NextResponse.json(
      { ok: false, error: "Sem permissão pra excluir esse convite." },
      { status: 403 },
    );
  }

  if (invite.status === "accepted") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Esse convite já foi aceito — o aluno já tá vinculado. Pra remover, exclui o aluno.",
      },
      { status: 400 },
    );
  }

  const { error: deleteError } = await auth.supabase
    .from("student_invites")
    .delete()
    .eq("id", inviteId);

  if (deleteError) {
    safeLog.error("[student-invites] delete failed", deleteError.message);
    return NextResponse.json(
      { ok: false, error: deleteError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
