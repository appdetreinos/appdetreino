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
import { KpiCard } from "./_components/kpi-card";

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
    console.error("[CRITICAL DASHBOARD ERROR]:", err);
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const userId = user.id;

  const trial = await safe("trial.state", { locked: false } as any, async () => {
    const { getTrainerTrialState } = await import("@/lib/billing/trial");
    return await getTrainerTrialState(userId);
  });
  if (trial.locked) {
    const { redirect } = await import("next/navigation");
    redirect("/app/checkout?reason=trial_expired");
  }

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  const firstName = (profile?.full_name ?? user.email ?? "treinador").split(" ")[0];

  // MOCK DATA para isolar o erro completamente e garantir que a página carregue
  const studentsRaw = [];
  const focusStudents = [];
  const totalAlunos = 0;
  const temAluno = false;
  const totalAlunosCountValue = 0;
  const activeStudents = 0;
  const activeRate = 0;
  const sessionsLast7Days = 0;
  const receita12m = 0;
  const receitaMes = 0;
  const receitaMesAnterior = 0;
  const variacaoMes = 0;
  const trainerOnboarding = null;
  const showOnboarding = false;
  const checklistState = { invited_student: false, sent_workout: false, sent_diet: false, configured_pay: false };
  const showChecklist = false;
  const months = [];

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">Bom dia, <span className="text-primary">{firstName}</span> 🔥</h1>
            <p className="text-xs text-foreground/65">Painel em modo de diagnóstico (Dados simplificados)</p>
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-cols-4 gap-3">
          <KpiCard icon={Users} label="Alunos ativos" value={0} hint="Diagnóstico..." />
          <KpiCard icon={Wallet} label="Receita do mês" value={0} formatKind="currency" hint="Diagnóstico..." />
          <KpiCard icon={CalendarDays} label="Sessões (7d)" value={0} hint="Diagnóstico..." />
          <KpiCard icon={Flame} label="Streak" value={0} formatKind="percent" hint="Diagnóstico..." />
        </div>
        <Card className="bg-card/80 border-white/10 p-6">
          <h2 className="text-lg font-bold mb-4">Atalhos</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Atalho icon={UserPlus} label="Novo aluno" href="/app/students/new" />
            <Atalho icon={CalendarCheck2} label="Mandar treino" href="/app/workouts" />
            <Atalho icon={Receipt} label="Cobrar atrasado" href="/app/finance" />
            <Atalho icon={MessageCircle} label="Conectar WhatsApp" href="/app/whatsapp" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Atalho({ icon: Icon, label, href }: { icon: React.ComponentType<{ className?: string }>; label: string; href: string }) {
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

async function safe<T>(label: string, fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    safeLog.warn(`[dashboard] ${label} falhou`, String(e));
    return fallback;
  }
}
