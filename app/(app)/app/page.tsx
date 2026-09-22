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

    const firstName = (profile?.full_name ?? user.email ?? "Treinador").split(" ")[0];

    let totalAlunos = 0;
    let studentsList: StudentSummary[] = [];
    try {
      const { data: students, error: sErr } = await supabase
        .from("student_profiles")
        .select("user_id, full_name, status, goal")
        .eq("trainer_id", user.id)
        .limit(5);
      
      if (!sErr && students) {
        totalAlunos = students.length;
        studentsList = students.map(s => ({
          id: s.user_id,
          nome: s.full_name ?? "Aluno",
          letra: s.full_name?.[0]?.toUpperCase() ?? "?",
          oque: s.goal || "Sem objetivo definido",
          quando: s.status === "active" ? "Ativo" : "Inativo",
        }));
      }
    } catch (e) {
      console.error("Erro alunos:", e);
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

        {studentsList.length > 0 && (
          <DashboardEntrance
            focus={{ pergunta: "Quem tá esperando você hoje?", itens: studentsList }}
            recentes={[]}
            totalAlunos={totalAlunos}
            temAluno={true}
          />
        )}
      </div>
    );
  } catch (err) {
    console.error("CRASH FINAL:", err);
    return <div className="p-10 text-red-500">Erro ao carregar Dashboard: {String(err)}</div>;
  }
}
