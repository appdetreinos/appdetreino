import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeLog } from "@/lib/log/safe";

/**
 * GET /api/debug/whoami
 *
 * Diagnóstico rápido do user logado e seu estado no banco.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "sem user" }, { status: 401 });
    }

    // Pega profile + trainer_profile em paralelo
    const [profileRes, trainerProfileRes, studentProfileRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("trainer_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("student_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

    // Tenta forçar `redirect("/aluno")` se fosse student pra ver se é isso
    let redirectSimulation = null;
    if (profileRes.data?.role === "student") {
      redirectSimulation = "WOULD_REDIRECT_TO_ALUNO";
    } else if (profileRes.data?.role === "admin") {
      redirectSimulation = "WOULD_REDIRECT_TO_ADMIN";
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        aud: user.aud,
        role: user.role,
      },
      profile: profileRes.data,
      profile_error: profileRes.error?.message,
      trainer_profile: trainerProfileRes.data,
      trainer_profile_error: trainerProfileRes.error?.message,
      student_profile: studentProfileRes.data,
      student_profile_error: studentProfileRes.error?.message,
      redirect_simulation: redirectSimulation,
    });
  } catch (e) {
    safeLog.error("[whoami] error", String(e));
    return NextResponse.json(
      {
        ok: false,
        error: String(e),
        stack: (e as Error).stack?.split("\n").slice(0, 20),
      },
      { status: 500 },
    );
  }
}
