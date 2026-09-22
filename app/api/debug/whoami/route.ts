import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * API route de debug: retorna quem é o user logado + estado de tudo.
 *
 * Mostra o que o servidor vê no momento: cookie JWT, profile role,
 * trainer_profiles, student_profiles. Pra ajudar a entender por que
 * o user tá caindo em /aluno em vez de /app.
 *
 * REMOVER DEPOIS DE RESOLVER O BUG.
 */

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      ok: false,
      msg: "Sem user logado (cookie JWT inválido ou expirado).",
      user: null,
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: trainerProfile } = await supabase
    .from("trainer_profiles")
    .select("user_id, plan_tier, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: studentProfile } = await supabase
    .from("student_profiles")
    .select("user_id, trainer_id, status, full_name, goal")
    .eq("user_id", user.id)
    .maybeSingle();

  // Decisão: pra qual dashboard o user deveria ir?
  const destino = profile?.role === "student"
    ? "/aluno"
    : profile?.role === "trainer"
      ? "/app"
      : profile?.role === "admin"
        ? "/admin"
        : "INDEFINIDO";

  return NextResponse.json({
    ok: true,
    auth_user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
    profile,
    trainerProfile: trainerProfile ?? null,
    studentProfile: studentProfile ?? null,
    destino_esperado: destino,
  });
}
