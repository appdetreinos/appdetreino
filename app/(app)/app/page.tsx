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
  Users,
  Wallet,
  CalendarDays,
  Flame,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { safeLog } from "@/lib/log/safe";
import { LogoutButton } from "@/components/logout-button";
import { DashboardEntrance } from "./dashboard-entrance";
import { KpiCard } from "./_components/kpi-card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TrainerDashboard() {
  try {
    return await TrainerDashboardInner();
  } catch (err) {
    console.error("[DASHBOARD_CRASH]:", err);
    safeLog.error("[dashboard] fatal crash", String(err));
    return <DashboardDegraded />;
  }
}

function DashboardDegraded() {
  return (
    <div className="min-h-screen p-6 flex items-center justify-center">
      <Card className="max-w-md border-red-500/50 bg-red-500/5 p-6 text-center">
        <h2 className="text-lg font-bold text-red-500 mb-2">Ops! Algo deu errado</h2>
        <p className="text-sm text-muted-foreground">
          Estamos trabalhando para estabilizar seu painel. Tente recarregar a página.
        </p>
      </Card>
    </div>
  );
}

async function TrainerDashboardInner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const userId = user.id;

  async function safe<T>(label: string, fallback: T, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      safeLog.warn(`[dashboard] ${label} falhou`, String(e));
      return fallback;
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  const firstName = (profile?.full_name ?? user.email ?? "Treinador").split(" ")[0];

  const studentsRaw = await safe("students.list", [] as any[], async () => {
    const { data, error } = await supabase
      .from("student_profiles")
      .select("user_id, full_name, status, joined_at, goal")
      .eq("trainer_id", userId)
      .order("joined_at", { ascending: false })
      .limit(3);
    if (error) throw error;
    return data ?? [];
  });

  const focusStudents = studentsRaw.map((s) => ({
    id: s.user_id,
    nome: s.full_name ?? "Aluno",
    letra: s.full_name?.[0]?.toUpperCase() ?? "?",
    oque: s.goal || "Sem objetivo definido",
    quando: s.status === "active" ? "Ativo" : "Inativo",
  }));

  const totalAlunosCount = await safe("students.count", 0, async () => {
    const { count, error } = await supabase
      .from("student_profiles")
      .select("id", { count: "exact", head: true })
      .eq("trainer_id", userId);
    if (error) throw error;
    return count ?? 0;
  });

  const temAluno = totalAlunosCount > 0;

  const receitaMes = await safe("receita.mes", 0, async () => {
    const { data: payments } = await supabase
      .from("payment_links")
      .select("amount_cents")
      .eq("trainer_id", userId)
      .not("paid_at", "is", null)
      .gte("paid_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
    return payments ? payments.reduce((acc, p) => acc + (p.amount_cents / 100), 0) : 0;
  });

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">Bom dia, <span className="text-primary">{firstName}</span> 🔥</h1>
            <p className="text-xs text-foreground/65">
              {temAluno
                ? `${totalAlunosCount} aluno${totalAlunosCount === 1 ? "" : "s"} ativo${totalAlunosCount === 1 ? "" : "s"}`
                : "Convide seu primeiro aluno para começar!"}
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard 
            icon={Users} 
            label="Alunos ativos" 
            value={totalAlunosCount} 
            badge={totalAlunosCount > 0 ? <Badge variant="outline" className="border-emerald-500/30 text-emerald-500">Sincronizado</Badge> : null} 
            hint="Total de alunos vinculados" 
          />
          <KpiCard 
            icon={Wallet} 
            label="Receita do mês" 
            value={receitaMes} 
            formatKind="currency" 
            hint="Soma de pagamentos confirmados" 
          />
          <KpiCard 
            icon={CalendarDays} 
            label="Sessões (7d)" 
            value={0} 
            hint="Em breve" 
          />
          <KpiCard 
            icon={Flame} 
            label="Aderência" 
            value={0} 
            formatKind="percent" 
            hint="Em breve" 
          />
        </div>

        <Card className="bg-card/80 border-white/10 p-6">
          <h2 className="text-lg font-bold mb-4">Atalhos Rápidos</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Atalho icon={UserPlus} label="Novo aluno" href="/app/students/new" />
            <Atalho icon={CalendarCheck2} label="Mandar treino" href="/app/workouts" />
            <Atalho icon={Receipt} label="Cobrar atrasado" href="/app/finance" />
            <Atalho icon={MessageCircle} label="Conectar WhatsApp" href="/app/whatsapp" />
          </div>
        </Card>

        {focusStudents.length > 0 && (
          <DashboardEntrance
            focus={{ pergunta: "Quem tá esperando você hoje?", itens: focusStudents }}
            recentes={[]}
            totalAlunos={totalAlunosCount}
            temAluno={true}
          />
        )}
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
