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
import { LogoutButton } from "@/components/logout-button";
import { DashboardEntrance } from "./dashboard-entrance";
import { KpiCard } from "./_components/kpi-card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TrainerDashboard() {
  try {
    return await TrainerDashboardInner();
  } catch (err) {
    console.error("[DASHBOARD_FATAL]:", err);
    return (
      <div className="min-h-screen p-10 flex items-center justify-center">
        <Card className="p-6 text-center border-red-500">
          <h1 className="text-red-500 font-bold">Erro Crítico no Servidor</h1>
          <p className="text-sm opacity-70">{String(err)}</p>
        </Card>
      </div>
    );
  }
}

async function TrainerDashboardInner() {
  const supabase = await createClient();
  
  // 1. Autenticação básica
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return null;
  const userId = user.id;

  // 2. Perfil (Sem forçar .single() para evitar erro 406/404)
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  const firstName = (profile?.full_name ?? user.email ?? "Treinador").split(" ")[0];

  // 3. Alunos - Busca simplificada para evitar crash
  let totalAlunos = 0;
  let studentsList = [];

  try {
    const { data: students, error: sErr } = await supabase
      .from("student_profiles")
      .select("user_id, full_name, status, goal")
      .eq("trainer_id", userId)
      .limit(5);
    
    if (!sErr && students) {
      totalAlunos = students.length; // Usando o tamanho do array para evitar a query de count
      studentsList = students.map(s => ({
        id: s.user_id,
        nome: s.full_name ?? "Aluno",
        letra: s.full_name?.[0]?.toUpperCase() ?? "?",
        oque: s.goal || "Sem objetivo definido",
        quando: s.status === "active" ? "Ativo" : "Inativo",
      }));
    }
  } catch (e) {
    console.error("Erro ao buscar alunos:", e);
  }

  // 4. Financeiro - Query ultra simples
  let receitaMes = 0;
  try {
    const { data: payments } = await supabase
      .from("payment_links")
      .select("amount_cents")
      .eq("trainer_id", userId)
      .not("paid_at", "is", null);
    
    if (payments) {
      receitaMes = payments.reduce((acc, p) => acc + (p.amount_cents / 100), 0);
    }
  } catch (e) {
    console.error("Erro ao buscar receita:", e);
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">Bom dia, <span className="text-primary">{firstName}</span> 🔥</h1>
            <p className="text-xs text-foreground/65">
              {totalAlunos > 0 
                ? `${totalAlunos} aluno${totalAlunos === 1 ? "" : "s"} ativo${totalAlunos === 1 ? "" : "s"}`
                : "Convide seu primeiro aluno!"}
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
          <KpiCard icon={Users} label="Alunos ativos" value={totalAlunos} badge={totalAlunos > 0 ? <Badge variant="outline" className="border-emerald-500/30 text-emerald-500">Sincronizado</Badge> : null} hint="Total de alunos" />
          <KpiCard icon={Wallet} label="Receita do mês" value={receitaMes} formatKind="currency" hint="Soma total" />
          <KpiCard icon={CalendarDays} label="Sessões (7d)" value={0} hint="Em breve" />
          <KpiCard icon={Flame} label="Aderência" value={0} formatKind="percent" hint="Em breve" />
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

        {studentsList.length > 0 && (
          <DashboardEntrance
            focus={{ pergunta: "Quem tá esperando você hoje?", itens: studentsList }}
            recentes={[]}
            totalAlunos={totalAlunos}
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
