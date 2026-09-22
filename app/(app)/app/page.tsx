import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Plus,
  ArrowUpRight,
  CalendarCheck2,
  Receipt,
  MessageCircle,
  UserPlus,
  TrendingUp,
  Users,
  Wallet,
  CalendarDays,
  Flame,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { safeLog } from "@/lib/log/safe";
import { LogoutButton } from "@/components/logout-button";
import { DashboardEntrance } from "./dashboard-entrance";
import { OnboardingWizard } from "./_components/onboarding-wizard";
import { OnboardingChecklist } from "./_components/onboarding-checklist";
import { Sparkline } from "@/components/ui/sparkline";
import { ProgressRing } from "@/components/ui/progress-ring";

/**
 * Trainer dashboard — versão SEM motion/react.
 *
 * Suspeita: motion v13.4.0 (fork de framer-motion) quebra com Next 16
 * + React 19. Aqui eu:
 *  - Removi import de motion/react
 *  - Removi <Stagger>, <StaggerItem>, <AnimatedNumber>
 *  - Animations via CSS puro (animate-fade-in, animate-pulse do Tailwind)
 *  - Números renderizados diretamente (sem AnimatedNumber)
 *
 * Build tag: NO-MOTION-2026-09-22T13:45
 * Se carregar, o vilão é motion/react e reescrevo AnimatePresence/Stagger.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

function brMonthLabel(d: Date): string {
  return d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function TrainerDashboard() {
  try {
    return await TrainerDashboardInner();
  } catch (err) {
    safeLog.error("[dashboard] render failed", String(err));
    return <DashboardDegraded />;
  }
}

function DashboardDegraded() {
  const buildTag = "NO-MOTION-2026-09-22T13:45";
  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold truncate">Painel ({buildTag})</h1>
          <ButtonLink href="/app/students/new" className="font-semibold">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Novo aluno</span>
          </ButtonLink>
        </div>
      </header>
      <main className="p-6 max-w-5xl mx-auto space-y-4">
        <Card className="bg-card/80 border-amber-500/30 p-6">
          <h2 className="text-lg font-bold">Não conseguimos carregar os dados agora</h2>
          <p className="mt-2 text-sm text-foreground/65">
            Tenta recarregar em alguns segundos. Se persistir, fale com a gente no WhatsApp.
          </p>
        </Card>
      </main>
    </div>
  );
}

async function TrainerDashboardInner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profileRole } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileRole?.role === "student") {
    const { redirect } = await import("next/navigation");
    redirect("/aluno");
  }
  if (profileRole?.role === "admin") {
    const { redirect } = await import("next/navigation");
    redirect("/admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const firstName = (profile?.full_name ?? user.email ?? "treinador").split(" ")[0];

  async function safe<T>(label: string, fallback: T, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      safeLog.warn(`[dashboard] ${label} falhou`, String(e));
      return fallback;
    }
  }

  const studentsRaw = await safe("students.list", [] as Array<{
    user_id: string;
    full_name: string | null;
    status: string | null;
    joined_at: string | null;
    goal: string | null;
  }>, async () => {
    const { data, error } = await supabase
      .from("student_profiles")
      .select("user_id, full_name, status, joined_at, goal")
      .eq("trainer_id", user.id)
      .order("joined_at", { ascending: false })
      .limit(3);
    if (error) throw error;
    return (data ?? []) as Array<{
      user_id: string;
      full_name: string | null;
      status: string | null;
      joined_at: string | null;
      goal: string | null;
    }>;
  });

  const focusStudents = studentsRaw.map((s) => ({
    id: s.user_id,
    nome: s.full_name ?? "Aluno",
    letra: s.full_name?.[0]?.toUpperCase() ?? "?",
    oque: s.goal || "Sem objetivo definido ainda",
    quando: s.status === "active" ? "Ativo" : "Inativo",
  }));

  const totalAlunos = focusStudents.length;
  const temAluno = totalAlunos > 0;

  const totalAlunosCountValue = await safe("students.count", 0, async () => {
    const { count, error } = await supabase
      .from("student_profiles")
      .select("user_id", { count: "exact", head: true })
      .eq("trainer_id", user.id);
    if (error) throw error;
    return count ?? 0;
  });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const activeStudentsRaw = await safe("sessions.7d", [] as Array<{ student_id: string | null }>, async () => {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select("student_id, student_profiles!inner(trainer_id)")
      .eq("student_profiles.trainer_id", user.id)
      .gte("date", sevenDaysAgo);
    if (error) throw error;
    return (data ?? []) as Array<{ student_id: string | null }>;
  });

  const activeStudentsSet = new Set(
    activeStudentsRaw.map((s) => s.student_id).filter(Boolean) as string[],
  );
  const activeStudents = activeStudentsSet.size;
  const activeRate =
    totalAlunosCountValue > 0
      ? Math.round((activeStudents / totalAlunosCountValue) * 100)
      : 0;

  const sessionsLast7Days = activeStudentsRaw.length;

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setUTCMonth(twelveMonthsAgo.getUTCMonth() - 11);
  twelveMonthsAgo.setUTCDate(1);
  twelveMonthsAgo.setUTCHours(0, 0, 0, 0);

  const paymentsRaw = await safe("payments.12m", [] as Array<{ amount_cents: number; paid_at: string | null }>, async () => {
    const { data, error } = await supabase
      .from("payment_links")
      .select("amount_cents, paid_at")
      .eq("trainer_id", user.id)
      .not("paid_at", "is", null)
      .gte("paid_at", twelveMonthsAgo.toISOString());
    if (error) throw error;
    return (data ?? []) as Array<{ amount_cents: number; paid_at: string | null }>;
  });

  const months: { label: string; total: number; key: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() - i);
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);
    months.push({ label: brMonthLabel(d), key: monthKey(d), total: 0 });
  }
  for (const p of paymentsRaw) {
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

  const trainerOnboarding = await safe("trainer.profile", null as {
    onboarding_completed_at: string | null;
    onboarding_checklist_completed_at: string | null;
    checklist_invited_student_at: string | null;
    checklist_sent_workout_at: string | null;
    checklist_sent_diet_at: string | null;
    checklist_configured_pay_at: string | null;
  } | null, async () => {
    const { data, error } = await supabase
      .from("trainer_profiles")
      .select(
        "onboarding_completed_at, onboarding_checklist_completed_at, checklist_invited_student_at, checklist_sent_workout_at, checklist_sent_diet_at, checklist_configured_pay_at"
      )
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    return data;
  });
  const showOnboarding = !trainerOnboarding?.onboarding_completed_at;
  const checklistState = {
    invited_student: !!trainerOnboarding?.checklist_invited_student_at,
    sent_workout: !!trainerOnboarding?.checklist_sent_workout_at,
    sent_diet: !!trainerOnboarding?.checklist_sent_diet_at,
    configured_pay: !!trainerOnboarding?.checklist_configured_pay_at,
  };
  const showChecklist = !trainerOnboarding?.onboarding_checklist_completed_at;

  return (
    <div className="min-h-screen">
      {showOnboarding && <OnboardingWizard />}

      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">
              Bom dia, <span className="text-primary">{firstName}</span> 🔥
            </h1>
            <p className="text-xs text-foreground/65">
              {temAluno
                ? `${totalAlunosCountValue} aluno${totalAlunosCountValue === 1 ? "" : "s"} ativo${totalAlunosCountValue === 1 ? "" : "s"} · ${activeStudents} treinaram nos últimos 7 dias`
                : "Tá esperando você convidar o primeiro aluno"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ButtonLink href="/app/students/new" className="font-semibold">
              <Plus className="size-4" />
              <span className="hidden sm:inline">Novo aluno</span>
            </ButtonLink>
            <div className="sm:hidden">
              <LogoutButton variant="ghost" label="" />
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6 max-w-5xl mx-auto animate-fade-in">
        {/* KPIs SEM AnimatedNumber */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi
            icon={Users}
            label="Alunos ativos"
            value={totalAlunosCountValue}
            badge={
              activeRate > 0 ? (
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-500">
                  {activeRate}% ativos
                </Badge>
              ) : null
            }
            hint={`${activeStudents} treinaram nos últimos 7 dias`}
          />
          <Kpi
            icon={Wallet}
            label="Receita do mês"
            value={receitaMes}
            format={(v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
            badge={
              variacaoMes !== 0 ? (
                <Badge
                  variant="outline"
                  className={
                    variacaoMes > 0
                      ? "border-emerald-500/30 text-emerald-500"
                      : "border-rose-500/30 text-rose-500"
                  }
                >
                  <TrendingUp className="size-3 mr-1" />
                  {variacaoMes > 0 ? "+" : ""}
                  {variacaoMes}% vs mês anterior
                </Badge>
              ) : null
            }
          />
          <Kpi
            icon={CalendarDays}
            label="Sessões (7d)"
            value={sessionsLast7Days}
            hint="treinos iniciados/concluídos"
          />
          <Kpi
            icon={Flame}
            label="Streak da consultoria"
            value={activeRate}
            format={(v) => `${Math.round(v)}%`}
            hint="aderência média semanal"
          />
        </div>

        {/* Sparkline */}
        <Card className="bg-card/80 border-white/10 p-5">
          <div className="flex items-baseline justify-between gap-2 mb-3">
            <div>
              <h2 className="text-lg font-bold">Receita — últimos 12 meses</h2>
              <p className="text-sm text-foreground/65">
                Total acumulado:{" "}
                <span className="font-semibold text-foreground">
                  {receita12m.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                </span>
              </p>
            </div>
            <Link
              href="/app/finance"
              className="text-xs text-foreground/65 hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              ver financeiro <ArrowUpRight className="size-3" />
            </Link>
          </div>
          <div className="text-primary">
            <Sparkline
              data={months.map((m) => m.total)}
              labels={months.map((m) => m.label)}
              height={100}
              showDots
              showArea
            />
          </div>
        </Card>

        {showChecklist && <OnboardingChecklist initial={checklistState} />}

        <DashboardEntrance
          focus={{ pergunta: "Quem tá esperando você hoje?", itens: focusStudents }}
          recentes={[]}
          totalAlunos={totalAlunosCountValue}
          temAluno={temAluno}
        />

        <Card className="bg-card/80 border-white/10 p-6">
          <h2 className="text-lg font-bold mb-4">Atalhos</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Atalho icon={UserPlus} label="Novo aluno" href="/app/students/new" />
            <Atalho icon={CalendarCheck2} label="Mandar treino" href="/app/workouts" />
            <Atalho icon={Receipt} label="Cobrar atrasado" href="/app/finance" />
            <Atalho icon={MessageCircle} label="Conectar WhatsApp" href="/app/whatsapp" />
          </div>
        </Card>

        <Card className="bg-card/80 border-white/10 p-6">
          <div className="flex items-center gap-5">
            <ProgressRing
              value={activeRate}
              size={88}
              strokeWidth={7}
              progressColor="oklch(0.685 0.196 38.5)"
              label={
                <span className="text-xl">
                  {activeRate}%
                </span>
              }
              sublabel="aderência"
            />
            <div>
              <h2 className="text-base font-bold">Aderência da semana</h2>
              <p className="text-sm text-foreground/65 max-w-md">
                {activeRate >= 70
                  ? "Sua consultoria tá voando. Mais de 70% dos alunos treinaram essa semana."
                  : activeRate >= 30
                    ? "Tá indo bem. Alguns alunos sumiram — manda um oi pra puxar de volta."
                    : "Hora de cutucar quem tá parado. Manda uma mensagem pra quem tá frio."}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  format,
  badge,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  format?: (n: number) => string;
  badge?: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card className="bg-card/80 border-white/10 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
          <Icon className="size-4" />
        </div>
        {badge}
      </div>
      <div className="mt-3 text-2xl font-extrabold tracking-tight tabular-nums">
        {format ? format(value) : value}
      </div>
      <div className="text-xs text-foreground/65">{label}</div>
      {hint && <div className="mt-2 text-[11px] text-foreground/55">{hint}</div>}
    </Card>
  );
}

function Atalho({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-white/10 bg-background/50 px-3.5 py-3 text-sm hover:border-primary/40 transition-colors"
    >
      <Icon className="size-4 text-foreground/70" />
      <span className="flex-1">{label}</span>
      <ArrowUpRight className="size-4 text-foreground/60" />
    </Link>
  );
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
