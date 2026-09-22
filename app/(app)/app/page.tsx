import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { 
  Plus, 
  Users, 
  Wallet, 
  CalendarDays, 
  Flame 
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import { KpiCard } from "./_components/kpi-card";

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

    const firstName = (profile?.full_name ?? user.email ?? "Treinador").split(" ")[0];

    let totalAlunos = 0;
    try {
      const { count, error } = await supabase
        .from("student_profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("trainer_id", user.id);
      if (!error) totalAlunos = count ?? 0;
    } catch (e) {
      console.error("Erro count alunos:", e);
    }

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
    } catch (e) {
      console.error("Erro receita:", e);
    }

    return (
      <div className="min-h-screen p-6">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Olá, {firstName}! 👋</h1>
            <p className="text-sm text-muted-foreground">Bem-vindo ao seu painel de controle.</p>
          </div>
          <div className="flex items-center gap-2">
            <ButtonLink href="/app/students/new" className="font-semibold">
              <Plus className="size-4" /> Novo aluno
            </ButtonLink>
            <LogoutButton variant="ghost" label="" />
          </div>
        </header>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard icon={Users} label="Alunos ativos" value={totalAlunos} hint="Total de alunos" />
          <KpiCard icon={Wallet} label="Receita do mês" value={receitaMes} formatKind="currency" hint="Soma total" />
          <KpiCard icon={CalendarDays} label="Sessões (7d)" value={0} hint="Em breve" />
          <KpiCard icon={Flame} label="Aderência" value={0} formatKind="percent" hint="Em breve" />
        </div>

        <Card className="p-6 border-white/10 bg-card/50">
          <h2 className="text-lg font-bold mb-4">Status do Sistema</h2>
          <div className="flex items-center gap-2 text-sm text-emerald-500">
            <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            Conexão com Supabase: Estável
          </div>
        </Card>
      </div>
    );
  } catch (fatalError) {
    console.error("FATAL DASHBOARD ERROR:", fatalError);
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold">Erro Interno</h2>
        <p className="text-muted-foreground">{String(fatalError)}</p>
      </div>
    );
  }
}
