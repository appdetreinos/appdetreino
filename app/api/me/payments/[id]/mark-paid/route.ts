import { NextResponse, type NextRequest } from "next/server";
import { requireAuthenticated } from "@/lib/security/guards";
import { safeLog } from "@/lib/log/safe";

/**
 * POST /api/me/payments/:id/mark-paid
 *
 * Trainer marca uma cobrança como paga manualmente (aluno já transferiu).
 *
 * Segurança: verifica que o payment.student_id pertence ao trainer logado
 * antes de atualizar.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const { id: paymentId } = await params;

  // Confere que a cobrança é de um aluno do trainer logado
  const { data: payment, error: fetchError } = await auth.supabase
    .from("payments")
    .select(`
      id, status,
      student_profiles!inner(trainer_id)
    `)
    .eq("id", paymentId)
    .maybeSingle();

  if (fetchError || !payment) {
    return NextResponse.json(
      { ok: false, error: "Cobrança não encontrada." },
      { status: 404 },
    );
  }

  const sp = Array.isArray(payment.student_profiles)
    ? payment.student_profiles[0]
    : payment.student_profiles;

  if (!sp || sp.trainer_id !== auth.user.id) {
    return NextResponse.json(
      { ok: false, error: "Sem permissão sobre essa cobrança." },
      { status: 403 },
    );
  }

  if (payment.status === "paid") {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  const { error } = await auth.supabase
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", paymentId);

  if (error) {
    safeLog.error("[mark-paid] update failed", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
