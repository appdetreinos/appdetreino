import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";
import { safeLog } from "@/lib/log/safe";

/**
 * POST /api/diets/from-template
 *
 * Trainer aplica um diet_template (global ou próprio) a um aluno.
 * Verifica cross-trainer antes de chamar RPC clone_diet_template.
 */
const bodySchema = z
  .object({
    templateId: z.string().uuid(),
    studentId: z.string().uuid(),
  })
  .strict();

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  // Confirma que o aluno é do trainer logado (anti cross-trainer)
  const { data: sp } = await auth.supabase
    .from("student_profiles")
    .select("trainer_id")
    .eq("user_id", body.data.studentId)
    .maybeSingle();

  if (!sp || sp.trainer_id !== auth.user.id) {
    return NextResponse.json(
      { ok: false, error: "Aluno não pertence a esse trainer." },
      { status: 403 },
    );
  }

  // Chama RPC
  const { data: dietId, error } = await auth.supabase.rpc("clone_diet_template", {
    p_template_id: body.data.templateId,
    p_student_id: body.data.studentId,
  });

  if (error || !dietId) {
    safeLog.error("[diets/from-template] rpc failed", error?.message);
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Erro ao clonar template." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, dietId });
}
