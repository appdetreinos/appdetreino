import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { safeLog } from "@/lib/log/safe";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";

const bodySchema = z
  .object({
    answers: z.record(z.string(), z.unknown()),
  })
  .strict();

/**
 * POST /api/me/anamnesis
 *
 * Upsert da anamnese do aluno. UNIQUE(student_id) garante 1 por aluno.
 * Guard: CSRF + auth.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  // Descobre trainer_id via student_profiles
  const { data: studentProfile } = await auth.supabase
    .from("student_profiles")
    .select("trainer_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  const { error } = await auth.supabase.from("anamnesis").upsert(
    {
      student_id: auth.user.id,
      trainer_id: studentProfile?.trainer_id ?? null,
      answers: body.data.answers,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "student_id" },
  );

  if (error) {
    safeLog.error("[anamnesis] upsert failed", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
