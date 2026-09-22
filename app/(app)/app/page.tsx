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
import { staticSupabase } from "@/lib/supabase/static-client";
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
    // USANDO CLIENTE ESTÁTICO (Sem Cookies) para isolar erro de infra
    const supabase = staticSupabase;
    
    // Como não temos o user do cookie, vamos buscar o seu perfil pelo ID fixo para teste
    // O ID do seu perfil que vi no banco: 4f30f9c8-3f46-4e1e-88ce-0598941d6528
    const userId = "4f30f9c8-3f46-4e1e-88ce-0598941d6528";

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    const firstName = (profile?.full_name ?? "Treinador").split(" ")[0];

    let totalAlunos = 0;
    try {
      const { count, error } = await supabase
        .from("student_profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("trainer_id", userId);
      if (!error) totalAlunos = count ?? 0;
    } catch (e) {
      console.error("Erro count alunos:", e);
    }

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
      console.error("Erro receita:", e);
    }

    return (
      <div className="min-h-screen p-6">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Olá, {firstName}! 👋</h1>
          <div className="flex gap-2">
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

        <Card className="p-6 text-center border-purple-500/20 bg-purple-500/5">
          <p className="text-lg font-medium text-purple-600">Modo de Diagnóstico de Cookies Ativo</p>
          <p className="text-sm text-muted-foreground">
            Estamos ignorando os cookies para testar se o crash é na autenticação.
          </p>
        </Card>
      </div>
    );
  } catch (err) {
    console.error("CRASH FINAL:", err);
    return <div className="p-10 text-red-500">Erro fatal: {String(err)}</div>;
  }
}
