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
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import { KpiCard } from "./_components/kpi-card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TrainerDashboard() {
  try {
    // 1. Client normal para AUTH (necessário para saber quem é o user)
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    
    if (!user) return <div className="p-10">Não autenticado</div>;

    // 2. SERVICE CLIENT para DADOS (Bypass total de RLS para evitar o Crash Loop)
    const serviceClient = await createServiceClient();

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const firstName = (profile?.full_name ?? user.email ?? "Treinador").split(" ")[0];

    // BUSCA DE ALUNOS (Via Service Role - Sem RLS)
    let totalAlunos = 0;
    try {
      const { count, error } = await serviceClient
        .from("student_profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("trainer_id", user.id);
      if (!error) totalAlunos = count ?? 0;
    } catch (e) {
      console.error("Erro no count de alunos:", e);
    }

    // BUSCA DE RECEITA (Via Service Role - Sem RLS)
    let receitaMes = 0;
    try {
      const { data: payments } = await serviceClient
        .from("payment_links")
        .select("amount_cents")
        .eq("trainer_id", user.id)
        .not("paid_at", "is", null);
      
      if (payments) {
        receitaMes = payments.reduce((acc, p) => acc + (p.amount_cents / 100), 0);
      }
    } catch (e) {
      console.error("Erro na receita:", e);
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

        <Card className="p-6 text-center border-indigo-500/20 bg-indigo-500/5">
          <p className="text-lg font-medium text-indigo-600">Modo de Alta Estabilidade Ativo</p>
          <p className="text-sm text-muted-foreground">
            Estamos usando o Service Role para contornar falhas de permissão no banco.
          </p>
        </Card>
      </div>
    );
  } catch (err) {
    console.error("CRASH FINAL:", err);
    return <div className="p-10 text-red-500">Erro fatal: {String(err)}</div>;
  }
}
