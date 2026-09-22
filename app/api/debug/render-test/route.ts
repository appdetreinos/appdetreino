import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeLog } from "@/lib/log/safe";

/**
 * GET /api/debug/render-test
 *
 * Replica o CORPO do /app dashboard mas retorna a exception real com
 * stack trace completa (em vez do digest genérico que o error.tsx
 * mostra).
 *
 * A diferença pro /api/debug/dashboard-trace é que este tenta fazer
 * EXATAMENTE o que o page.tsx faz — incluindo o `months.find((x) =>
 * x.key === k)` que pode dar problema se `monthKey` retornar formato
 * inesperado, e o `.sort` em arrays.
 */
export async function GET() {
  const logs: string[] = [];
  const errors: Array<{ where: string; error: string; stack?: string[] }> = [];

  function track(where: string) {
    logs.push(`[${where}] enter`);
  }
  function fail(where: string, e: unknown) {
    const err = e as Error;
    errors.push({
      where,
      error: String(e),
      stack: err.stack?.split("\n").slice(0, 12),
    });
  }

  try {
    track("createClient");
    const supabase = await createClient();

    track("auth.getUser");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "sem user", logs }, { status: 401 });
    }

    track("profile.full_name");
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const firstName = (profile?.full_name ?? user.email ?? "treinador").split(" ")[0];

    track("student_profiles_list");
    const { data: studentsRaw } = await supabase
      .from("student_profiles")
      .select("user_id, full_name, status, joined_at, goal")
      .eq("trainer_id", user.id)
      .order("joined_at", { ascending: false })
      .limit(3);

    const focusStudents = (studentsRaw ?? []).map((s) => ({
      id: s.user_id,
      nome: s.full_name,
      letra: s.full_name?.[0]?.toUpperCase() ?? "?",
      oque: s.goal || "Sem objetivo definido ainda",
      quando: s.status === "active" ? "Ativo" : "Inativo",
    }));

    track("student_profiles_count");
    const totalAlunosCount = await supabase
      .from("student_profiles")
      .select("user_id", { count: "exact", head: true })
      .eq("trainer_id", user.id);

    track("workout_sessions_7d");
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data: activeStudentsRaw } = await supabase
      .from("workout_sessions")
      .select("student_id, student_profiles!inner(trainer_id)")
      .eq("student_profiles.trainer_id", user.id)
      .gte("date", sevenDaysAgo);

    const activeStudentsSet = new Set(
      (activeStudentsRaw ?? []).map((s) => s.student_id).filter(Boolean),
    );
    const activeStudents = activeStudentsSet.size;
    const activeRate =
      (totalAlunosCount.count ?? 0) > 0
        ? Math.round((activeStudents / (totalAlunosCount.count ?? 1)) * 100)
        : 0;

    const sessionsLast7Days = (activeStudentsRaw ?? []).length;

    track("payment_links_12m");
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setUTCMonth(twelveMonthsAgo.getUTCMonth() - 11);
    twelveMonthsAgo.setUTCDate(1);
    twelveMonthsAgo.setUTCHours(0, 0, 0, 0);

    const { data: paymentsRaw } = await supabase
      .from("payment_links")
      .select("amount_cents, paid_at")
      .eq("trainer_id", user.id)
      .not("paid_at", "is", null)
      .gte("paid_at", twelveMonthsAgo.toISOString());

    track("months_build");
    function brMonthLabel(d: Date): string {
      return d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    }
    function monthKey(d: Date): string {
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    }

    const months: { label: string; total: number; key: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setUTCMonth(d.getUTCMonth() - i);
      d.setUTCDate(1);
      d.setUTCHours(0, 0, 0, 0);
      months.push({ label: brMonthLabel(d), key: monthKey(d), total: 0 });
    }

    for (const p of paymentsRaw ?? []) {
      if (!p.paid_at) continue;
      const k = monthKey(new Date(p.paid_at));
      const m = months.find((x) => x.key === k);
      if (m) m.total += p.amount_cents / 100;
    }

    const receita12m = months.reduce((acc, m) => acc + m.total, 0);
    const receitaMes = months.at(-1)?.total ?? 0;
    const receitaMesAnterior = months.at(-2)?.total ?? 0;
    const variacaoMes =
      receitaMesAnterior > 0
        ? Math.round(((receitaMes - receitaMesAnterior) / receitaMesAnterior) * 100)
        : 0;

    track("workout_sessions_recent");
    const { data: sessionsRaw } = await supabase
      .from("workout_sessions")
      .select("date, status, student_profiles!inner(full_name, trainer_id)")
      .eq("student_profiles.trainer_id", user.id)
      .order("date", { ascending: false })
      .limit(3);

    const recentes = (sessionsRaw ?? []).map((s) => {
      const sp = Array.isArray(s.student_profiles) ? s.student_profiles[0] : s.student_profiles;
      const nome = sp?.full_name ?? "Aluno";
      return {
        nome,
        letra: nome[0]?.toUpperCase() ?? "?",
        oque:
          s.status === "completed"
            ? "Completou treino"
            : s.status === "skipped"
              ? "Pulou treino"
              : "Iniciou treino",
        quando: relativeTime(s.date),
      };
    });

    track("trainer_profiles");
    const { data: trainerOnboarding } = await supabase
      .from("trainer_profiles")
      .select(
        "onboarding_completed_at, onboarding_checklist_completed_at, checklist_invited_student_at, checklist_sent_workout_at, checklist_sent_diet_at, checklist_configured_pay_at",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json(
      {
        ok: true,
        logs,
        derived: {
          firstName,
          totalAlunosCount: totalAlunosCount.count ?? 0,
          activeStudents,
          activeRate,
          sessionsLast7Days,
          receita12m,
          receitaMes,
          receitaMesAnterior,
          variacaoMes,
          months: months.length,
          focusStudents_count: focusStudents.length,
          recentes_count: recentes.length,
          showOnboarding: !trainerOnboarding?.onboarding_completed_at,
          showChecklist: !trainerOnboarding?.onboarding_checklist_completed_at,
        },
      },
      { status: 200 },
    );
  } catch (e) {
    const err = e as Error;
    fail("top-level", e);
    safeLog.error("[render-test] failed", String(e));
    return NextResponse.json(
      {
        ok: false,
        errors,
        logs,
        error_message: String(e),
        error_stack: err.stack?.split("\n").slice(0, 20),
        error_name: err.name,
        NEXT_REDIRECT: err.message?.includes("NEXT_REDIRECT") || err.message?.includes("NEXT_HTTP"),
      },
      { status: Math.random() > 2 ? 500 : 200 },
    );
  } finally {
    safeLog.info("[render-test] done", { ok: errors.length === 0 });
  }
}

function relativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d}d`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
