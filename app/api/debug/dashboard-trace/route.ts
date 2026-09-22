import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/debug/dashboard-trace
 *
 * Replica o fluxo INTEIRO do /app dashboard passo a passo. Pra cada
 * etapa registra { ok, error, sample }. Retorna a stack completa de
 * qualquer erro — coisa que o error.tsx global não faz porque só
 * mostra o digest.
 *
 * Diferente do /api/debug/dashboard-test (que roda só as queries),
 * este inclui: auth → profile.role → redirect path → contagens → Kpi →
 * Sessions etc., exatamente como o page.tsx faz.
 *
 * Acessa logado em https://appdetreino-eight.vercel.app/api/debug/dashboard-trace
 *
 * ⚠️ Remover quando estiver estável.
 */
export async function GET() {
  const trace: Array<{ step: string; ok: boolean; error?: string; sample?: unknown }> = [];

  // 1. createClient
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
    trace.push({ step: "createClient", ok: true });
  } catch (e) {
    trace.push({ step: "createClient", ok: false, error: String(e) });
    return NextResponse.json({ trace }, { status: 500 });
  }

  // 2. auth.getUser
  let user: { id: string; email?: string | null } | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    user = data.user;
    trace.push({ step: "auth.getUser", ok: !!user, sample: { id: user?.id } });
    if (!user) {
      return NextResponse.json({ ok: false, trace }, { status: 401 });
    }
  } catch (e) {
    trace.push({
      step: "auth.getUser",
      ok: false,
      error: String(e),
      sample: { stack: (e as Error).stack?.split("\n").slice(0, 8) },
    });
    return NextResponse.json({ trace }, { status: 500 });
  }

  // 3. profile.role
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    trace.push({
      step: "profile.role",
      ok: !error,
      error: error?.message,
      sample: data,
    });
    if (error) throw error;
  } catch (e) {
    trace.push({
      step: "profile.role",
      ok: false,
      error: String(e),
      sample: { stack: (e as Error).stack?.split("\n").slice(0, 8) },
    });
    return NextResponse.json({ trace }, { status: 500 });
  }

  // 4. profile full_name
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    trace.push({
      step: "profile.full_name",
      ok: !error,
      error: error?.message,
      sample: data,
    });
    if (error) throw error;
  } catch (e) {
    trace.push({
      step: "profile.full_name",
      ok: false,
      error: String(e),
      sample: { stack: (e as Error).stack?.split("\n").slice(0, 8) },
    });
  }

  // 5. student_profiles list (limit 3)
  let totalAlunosCount = 0;
  try {
    const { data, error } = await supabase
      .from("student_profiles")
      .select("user_id, full_name, status, joined_at, goal")
      .eq("trainer_id", user.id)
      .order("joined_at", { ascending: false })
      .limit(3);
    trace.push({
      step: "student_profiles_list",
      ok: !error,
      error: error?.message,
      sample: { count: data?.length ?? 0 },
    });
    if (error) throw error;
  } catch (e) {
    trace.push({
      step: "student_profiles_list",
      ok: false,
      error: String(e),
      sample: { stack: (e as Error).stack?.split("\n").slice(0, 8) },
    });
  }

  // 6. student_profiles count
  try {
    const { count, error } = await supabase
      .from("student_profiles")
      .select("user_id", { count: "exact", head: true })
      .eq("trainer_id", user.id);
    totalAlunosCount = count ?? 0;
    trace.push({
      step: "student_profiles_count",
      ok: !error,
      error: error?.message,
      sample: { count },
    });
    if (error) throw error;
  } catch (e) {
    trace.push({
      step: "student_profiles_count",
      ok: false,
      error: String(e),
      sample: { stack: (e as Error).stack?.split("\n").slice(0, 8) },
    });
  }

  // 7. workout_sessions 7d (join)
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("workout_sessions")
      .select("student_id, student_profiles!inner(trainer_id)")
      .eq("student_profiles.trainer_id", user.id)
      .gte("date", sevenDaysAgo);
    trace.push({
      step: "workout_sessions_7d",
      ok: !error,
      error: error?.message,
      sample: { count: data?.length ?? 0 },
    });
    if (error) throw error;
  } catch (e) {
    trace.push({
      step: "workout_sessions_7d",
      ok: false,
      error: String(e),
      sample: { stack: (e as Error).stack?.split("\n").slice(0, 8) },
    });
  }

  // 8. payment_links 12m
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setUTCMonth(twelveMonthsAgo.getUTCMonth() - 11);
    twelveMonthsAgo.setUTCDate(1);
    twelveMonthsAgo.setUTCDate(1);
    twelveMonthsAgo.setUTCHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from("payment_links")
      .select("amount_cents, paid_at")
      .eq("trainer_id", user.id)
      .not("paid_at", "is", null)
      .gte("paid_at", twelveMonthsAgo.toISOString());
    trace.push({
      step: "payment_links_12m",
      ok: !error,
      error: error?.message,
      sample: { count: data?.length ?? 0 },
    });
    if (error) throw error;
  } catch (e) {
    trace.push({
      step: "payment_links_12m",
      ok: false,
      error: String(e),
      sample: { stack: (e as Error).stack?.split("\n").slice(0, 8) },
    });
  }

  // 9. workout_sessions recent
  try {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select("date, status, student_profiles!inner(full_name, trainer_id)")
      .eq("student_profiles.trainer_id", user.id)
      .order("date", { ascending: false })
      .limit(3);
    trace.push({
      step: "workout_sessions_recent",
      ok: !error,
      error: error?.message,
      sample: { count: data?.length ?? 0 },
    });
    if (error) throw error;
  } catch (e) {
    trace.push({
      step: "workout_sessions_recent",
      ok: false,
      error: String(e),
      sample: { stack: (e as Error).stack?.split("\n").slice(0, 8) },
    });
  }

  // 10. trainer_profiles (onboarding)
  try {
    const { data, error } = await supabase
      .from("trainer_profiles")
      .select(
        "onboarding_completed_at, onboarding_checklist_completed_at, checklist_invited_student_at, checklist_sent_workout_at, checklist_sent_diet_at, checklist_configured_pay_at",
      )
      .eq("user_id", user.id)
      .maybeSingle();
    trace.push({
      step: "trainer_profiles",
      ok: !error,
      error: error?.message,
      sample: data,
    });
    if (error) throw error;
  } catch (e) {
    trace.push({
      step: "trainer_profiles",
      ok: false,
      error: String(e),
      sample: { stack: (e as Error).stack?.split("\n").slice(0, 8) },
    });
  }

  // 11. tenta instanciar um componente que pode falhar fora do try
  try {
    // testa se há problema em serializar estruturas grandes — page.tsx
    // faz `months.map((m) => m.label)` em Sparkline. Vamos validar.
    const months: { label: string; total: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setUTCMonth(d.getUTCMonth() - i);
      const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      months.push({ label, total: 0 });
    }
    trace.push({
      step: "months_build",
      ok: true,
      sample: { first: months[0], last: months.at(-1) },
    });
  } catch (e) {
    trace.push({
      step: "months_build",
      ok: false,
      error: String(e),
      sample: { stack: (e as Error).stack?.split("\n").slice(0, 8) },
    });
  }

  const failed = trace.filter((t) => !t.ok);
  return NextResponse.json(
    {
      ok: failed.length === 0,
      user_id: user.id,
      failed_count: failed.length,
      failed_steps: failed.map((f) => f.step),
      trace,
    },
    { status: 200 },
  );
}
