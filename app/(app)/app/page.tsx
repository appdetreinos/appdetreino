import Link from "next/link";
import { redirect } from "next/navigation";
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
import { DashboardEntrance } from "./dashboard-entrance";
import { LogoutButton } from "@/components/logout-button";
import { OnboardingWizard } from "./_components/onboarding-wizard";
import { OnboardingChecklist } from "./_components/onboarding-checklist";
import { Sparkline } from "@/components/ui/sparkline";
import { Stagger, StaggerItem, AnimatedNumber } from "@/components/ui/stagger";
import { ProgressRing } from "@/components/ui/progress-ring";

/**
 * Trainer dashboard — server component com dados reais do Supabase.
 *
 * Melhorias 2026-09-22 (audit UIX):
 *  - Faixa de KPIs no topo: Alunos / Receita do mês / Sessões (7d) / Renovações pendentes
 *  - Sparkline de receita últimos 12 meses
 *  - Contadores animados
 *  - ProgressRing de "foco de hoje" (% de alunos que treinaram nos últimos 7 dias)
 *  - Stagger pra entrada dos blocos
 */

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
    // Não deixa uma query quebrar o dashboard inteiro — loga e renderiza
    // versão "degradada" só com o básico (header + atalhos).
    safeLog.error("[dashboard] render failed", String(err));
    return <DashboardDegraded />;
  }
}

function DashboardDegraded() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold truncate">Painel</h1>
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
            Tenta recarregar em alguns segundos. Se persistir, fale com a gente no WhatsApp
            — pode ser migração pendente no banco.
          </p>
        </Card>
        <Card className="bg-card/80 border-white/10 p-6">
          <h2 className="text-lg font-bold mb-4">Atalhos</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Atalho icon={UserPlus} label="Novo aluno" href="/app/students/new" />
            <Atalho icon={CalendarCheck2} label="Mandar treino" href="/app/workouts" />
            <Atalho icon={Receipt} label="Cobrar atrasado" href="/app/finance" />
            <Atalho icon={MessageCircle} label="Conectar WhatsApp" href="/app/whatsapp" />
          </div>
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

  // ── Guard de role ────────────────────────────────────────────────
  const { data: profileRole } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileRole?.role === "student") redirect("/aluno");
  if (profileRole?.role === "admin") redirect("/admin");
  // ────────────────────────────────────────────────────────────────

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const firstName = (profile?.full_name ?? user.email ?? "treinador").split(" ")[0];

  // Alunos ativos do trainer
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

  const totalAlunos = focusStudents.length;
  const temAluno = totalAlunos > 0;

  // Total de alunos do trainer (count)
  const totalAlunosCount = await supabase
    .from("student_profiles")
    .select("user_id", { count: "exact", head: true })
    .eq("trainer_id", user.id);

  // Alunos ativos nos últimos 7 dias (treinaram)
  // workout_sessions tem coluna `date` (não `created_at`).
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

  // Sessões nos últimos 7 dias (volume)
  const sessionsLast7Days = (activeStudentsRaw ?? []).length;

  // Receita últimos 12 meses — soma de payment_links pagos por mês do trainer
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

  // Agrupa por mês
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

  // Atividade recente: últimas sessões de treino
  // workout_sessions tem coluna `date` (não `created_at`).
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

  // Wizard / checklist de onboarding
  const { data: trainerOnboarding } = await supabase
    .from("trainer_profiles")
    .select(
      "onboarding_completed_at, onboarding_checklist_completed_at, checklist_invited_student_at, checklist_sent_workout_at, checklist_sent_diet_at, checklist_configured_pay_at"
    )
    .eq("user_id", user.id)
    .maybeSingle();
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
                ? `${totalAlunosCount.count ?? 0} aluno${(totalAlunosCount.count ?? 0) === 1 ? "" : "s"} ativo${(totalAlunosCount.count ?? 0) === 1 ? "" : "s"} · ${activeStudents} treinaram nos últimos 7 dias`
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

      <Stagger className="p-6 space-y-6 max-w-5xl mx-auto" delay={0.05}>
        {/* KPIs com sparkline de receita */}
        <StaggerItem>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi
              icon={Users}
              label="Alunos ativos"
              value={totalAlunosCount.count ?? 0}
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
        </StaggerItem>

        {/* Sparkline de receita 12 meses */}
        <StaggerItem>
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
        </StaggerItem>

        {showChecklist && <OnboardingChecklist initial={checklistState} />}

        <StaggerItem>
          <DashboardEntrance
            focus={{ pergunta: "Quem tá esperando você hoje?", itens: focusStudents }}
            recentes={recentes}
            totalAlunos={totalAlunosCount.count ?? 0}
            temAluno={temAluno}
          />
        </StaggerItem>

        <StaggerItem>
          <Card className="bg-card/80 border-white/10 p-6">
            <h2 className="text-lg font-bold mb-4">Atalhos</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Atalho icon={UserPlus} label="Novo aluno" href="/app/students/new" />
              <Atalho icon={CalendarCheck2} label="Mandar treino" href="/app/workouts" />
              <Atalho icon={Receipt} label="Cobrar atrasado" href="/app/finance" />
              <Atalho icon={MessageCircle} label="Conectar WhatsApp" href="/app/whatsapp" />
            </div>
          </Card>
        </StaggerItem>

        {/* ProgressRing de "foco de hoje" */}
        <StaggerItem>
          <Card className="bg-card/80 border-white/10 p-6">
            <div className="flex items-center gap-5">
              <ProgressRing
                value={activeRate}
                size={88}
                strokeWidth={7}
                progressColor="oklch(0.685 0.196 38.5)"
                label={
                  <span className="text-xl">
                    <AnimatedNumber value={activeRate} />%
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
        </StaggerItem>
      </Stagger>
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
      <div className="mt-3 text-2xl font-extrabold tracking-tight">
        <AnimatedNumber value={value} format={format} />
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
