import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/debug/dashboard-test
 *
 * Roda TODAS as queries que o /app faz, uma por uma, e retorna
 * status OK/erro pra cada. Acessa direto pra ver qual query quebra
 * sem precisar entrar no dashboard.
 *
 * Output JSON: { user, queries: [{ name, ok, error?, sample }] }
 *
 * ⚠️ Remover ou esconder em produção quando estiver estável.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sem user logado" }, { status: 401 });
  }

  const queries: Array<{ name: string; ok: boolean; error?: string; sample?: unknown }> = [];

  // 1. profile
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", user.id)
      .maybeSingle();
    queries.push({ name: "profiles", ok: !error, error: error?.message, sample: data });
  } catch (e) {
    queries.push({ name: "profiles", ok: false, error: String(e) });
  }

  // 2. student_profiles (count)
  try {
    const { count, error } = await supabase
      .from("student_profiles")
      .select("user_id", { count: "exact", head: true })
      .eq("trainer_id", user.id);
    queries.push({ name: "student_profiles_count", ok: !error, error: error?.message, sample: { count } });
  } catch (e) {
    queries.push({ name: "student_profiles_count", ok: false, error: String(e) });
  }

  // 3. student_profiles (lista 3)
  try {
    const { data, error } = await supabase
      .from("student_profiles")
      .select("user_id, full_name, status, joined_at, goal")
      .eq("trainer_id", user.id)
      .order("joined_at", { ascending: false })
      .limit(3);
    queries.push({ name: "student_profiles_list", ok: !error, error: error?.message, sample: data });
  } catch (e) {
    queries.push({ name: "student_profiles_list", ok: false, error: String(e) });
  }

  // 4. workout_sessions 7d (com join) — provável causador
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("workout_sessions")
      .select("student_id, student_profiles!inner(trainer_id)")
      .eq("student_profiles.trainer_id", user.id)
      .gte("date", sevenDaysAgo);
    queries.push({
      name: "workout_sessions_7d",
      ok: !error,
      error: error?.message,
      sample: { count: data?.length ?? 0 },
    });
  } catch (e) {
    queries.push({ name: "workout_sessions_7d", ok: false, error: String(e) });
  }

  // 5. payment_links 12m
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setUTCMonth(twelveMonthsAgo.getUTCMonth() - 11);
    twelveMonthsAgo.setUTCDate(1);
    twelveMonthsAgo.setUTCHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("payment_links")
      .select("amount_cents, paid_at, status")
      .eq("trainer_id", user.id)
      .eq("status", "paid")
      .gte("paid_at", twelveMonthsAgo.toISOString());
    queries.push({
      name: "payment_links_12m",
      ok: !error,
      error: error?.message,
      sample: { count: data?.length ?? 0 },
    });
  } catch (e) {
    queries.push({ name: "payment_links_12m", ok: false, error: String(e) });
  }

  // 6. workout_sessions order by date (3 mais recentes)
  try {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select("date, status, student_profiles!inner(full_name, trainer_id)")
      .eq("student_profiles.trainer_id", user.id)
      .order("date", { ascending: false })
      .limit(3);
    queries.push({
      name: "workout_sessions_recent",
      ok: !error,
      error: error?.message,
      sample: { count: data?.length ?? 0 },
    });
  } catch (e) {
    queries.push({ name: "workout_sessions_recent", ok: false, error: String(e) });
  }

  // 7. trainer_profiles (onboarding)
  try {
    const { data, error } = await supabase
      .from("trainer_profiles")
      .select(
        "onboarding_completed_at, onboarding_checklist_completed_at, checklist_invited_student_at, checklist_sent_workout_at, checklist_sent_diet_at, checklist_configured_pay_at",
      )
      .eq("user_id", user.id)
      .maybeSingle();
    queries.push({ name: "trainer_profiles", ok: !error, error: error?.message, sample: data });
  } catch (e) {
    queries.push({ name: "trainer_profiles", ok: false, error: String(e) });
  }

  const failed = queries.filter((q) => !q.ok);

  return NextResponse.json(
    {
      ok: failed.length === 0,
      user_id: user.id,
      failed_count: failed.length,
      failed_names: failed.map((q) => q.name),
      queries,
    },
    { status: 200 },
  );
}
