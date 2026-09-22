import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { 
  Plus, 
  Users, 
  Wallet, 
  CalendarDays, 
  Flame,
  ArrowUpRight,
  UserPlus,
  CalendarCheck2,
  Receipt,
  MessageCircle,
  Dumbbell,
  Salad
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import { KpiCard } from "./_components/kpi-card";
import { DashboardEntrance } from "./dashboard-entrance";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface StudentSummary {
  id: string;
  nome: string;
  letra: string;
  oque: string;
  quando: string;
}

export default async function TrainerDashboard() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return <div className="p-10 text-center">Autenticação necessária.</div>;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const firstName = (profile?.full_name ?? user.email?.split("@")[0] ?? "Treinador");

    // --- DATA FETCHING ---
    let totalAlunos = 0;
    try {
      const { count, error } = await supabase
        .from("student_profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("trainer_id", user.id);
      if (!error) totalAlunos = count ?? 0;
    } catch (e) { console.error("KPI Alunos error:", e); }

    let receitaMes = 0;
    try {
      const { data: payments } = await supabase
        .from("payment_links")
        .select("amount_cents")
        .eq("trainer_id", user.id)
        .not("paid_at", "is", null);
      if (payments) {
        receitaMes = payments.reduce((acc, p) => acc + (p.amount_cents / 100), 0);
      }
    } catch (e) { console.error("KPI Receita error:", e); }

    let studentsList: StudentSummary[] = [];
    try {
      const { data: students, error: sErr } = await supabase
        .from("student_profiles")
        .select("user_id, full_name, status, goal")
        .eq("trainer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(6);
      
      if (!sErr && students) {
        studentsList = students.map(s => ({
          id: s.user_id,
          nome: s.full_name ?? "Aluno",
          letra: s.full_name?.[0]?.toUpperCase() ?? "?",
          oque: s.goal || "Sem objetivo",
          quando: s.status === "active" ? "Ativo" : "Inativo",
        }));
      }
    } catch (e) { console.error("Students list error:", e); }

    return (
      <div className="min-h-screen p-6 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Olá, <span className="text-primary">{firstName}</span>! 👋
            </h1>
            <p className="text-muted-foreground">Bem-vindo ao seu centro de comando.</p>
          </div>
          <div className="flex items-center gap-3">
            <ButtonLink href="/app/students/new" className="shadow-lg shadow-primary/20">
              <Plus className="size-4 mr-2" /> Novo aluno
            </ButtonLink>
            <LogoutButton variant="ghost" label="" />
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard 
            icon={Users} 
            label="Alunos ativos" 
            value={totalAlunos} 
            hint="Total de alunos vinculados" 
            badge={totalAlunos > 0 ? <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">Sincronizado</Badge> : null}
          />
          <KpiCard 
            icon={Wallet} 
            label="Receita do mês" 
            value={receitaMes} 
            formatKind="currency" 
            hint="Soma de pagamentos confirmados" 
          />
          <KpiCard icon={CalendarDays} label="Sessões (7d)" value={0} hint="Em breve" />
          <KpiCard icon={Flame} label="Aderência" value={0} formatKind="percent" hint="Em breve" />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Section */}
          <div className="lg:col-span-2 space-y-6">
            {studentsList.length > 0 ? (
              <DashboardEntrance
                focus={{ pergunta: "Quem está aguardando você hoje?", itens: studentsList }}
                recentes={[]}
                totalAlunos={totalAlunos}
                temAluno={true}
              />
            ) : (
              <Card className="p-12 text-center border-dashed border-2">
                <div className="bg-muted rounded-full size-16 flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="size-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">Nenhum aluno encontrado</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Comece convidando seu primeiro aluno para gerenciar aqui!
                </p>
                <ButtonLink href="/app/students/new" className="mx-auto">
                  Adicionar primeiro aluno
                </ButtonLink>
              </Card>
            )}
          </div>

          {/* Quick Actions Section */}
          <div className="space-y-6">
            <Card className="p-6 bg-card/50 border-white/10">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Plus className="size-5 text-primary" /> Ações Rápidas
              </h2>
              <div className="grid grid-cols-1 gap-3">
                <QuickAction icon={UserPlus} label="Novo Aluno" href="/app/students/new" />
                <QuickAction icon={Dumbbell} label="Montar Treino" href="/app/workouts" />
                <QuickAction icon={Salad} label="Montar Dieta" href="/app/diets" />
                <QuickAction icon={Receipt} label="Financeiro" href="/app/finance" />
                <QuickAction icon={MessageCircle} label="WhatsApp" href="/app/whatsapp" />
              </div>
            </Card>

            <Card className="p-6 bg-primary/10 border-primary/20">
              <h2 className="text-lg font-bold mb-2 text-primary">Dica de Gestão 💡</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Use os atalhos acima para agilizar a entrega de treinos e dietas para seus alunos.
              </p>
            </Card>
          </div>
        </div>
      </div>
    );
  } catch (err) {
    console.error("DASHBOARD CRITICAL ERROR:", err);
    return (
      <div className="p-10 text-center">
        <h2 className="text-2xl font-bold text-red-500">Erro no Painel</h2>
        <p className="text-muted-foreground">{String(err)}</p>
      </div>
    );
  }
}

function QuickAction({ icon: Icon, label, href }: { icon: React.ComponentType<{ className?: string }>; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-background/50 hover:bg-primary/5 hover:border-primary/30 transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/20 transition-colors">
          <Icon className="size-4 text-foreground/70 group-hover:text-primary" />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <ArrowUpRight className="size-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
    </Link>
  );
}
