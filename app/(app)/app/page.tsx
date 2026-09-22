import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus,
  ArrowUpRight,
  CalendarCheck2,
  Receipt,
  MessageCircle,
  UserPlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardEntrance } from "./dashboard-entrance";
import { LogoutButton } from "@/components/logout-button";
import { OnboardingWizard } from "./_components/onboarding-wizard";
import { OnboardingChecklist } from "./_components/onboarding-checklist";

/**
 * Trainer dashboard — server component com dados reais do Supabase.
 *
 * Se RLS bloquear as queries (algo errado na config), o catchAll garante
 * que o usuário pelo menos vê o shell vazio em vez de 500.
 */

export default async function TrainerDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sem user, manda pro login (proxy.ts também barrou, mas defensivo)
  if (!user) {
    return null;
  }

  // ── Guard de role ────────────────────────────────────────────────
  // Se o user logado é student (não trainer/admin), manda pro painel
  // do aluno. Defesa em camadas — proxy.ts já filtra, mas aqui
  // garante que um student nunca vê o console do trainer.
  const { data: profileRole } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileRole?.role === "student") {
    redirect("/aluno");
  }
  if (profileRole?.role === "admin") {
    redirect("/admin");
  }
  // ────────────────────────────────────────────────────────────────

  // Saudação: nome vem de `profiles.full_name`
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const firstName = (profile?.full_name ?? user.email ?? "treinador").split(" ")[0];

  // Alunos ativos do trainer (top 3 pra "Quem tá esperando você hoje?")
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

  const totalAlunos = (studentsRaw ?? []).length;
  const temAluno = totalAlunos > 0;

  // Atividade recente: últimas sessões de treino dos alunos do trainer
  const { data: sessionsRaw } = await supabase
    .from("workout_sessions")
    .select("created_at, status, student_profiles!inner(full_name, trainer_id)")
    .eq("student_profiles.trainer_id", user.id)
    .order("created_at", { ascending: false })
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
      quando: relativeTime(s.created_at),
    };
  });

  const totalAlunosCount = await supabase
    .from("student_profiles")
    .select("user_id", { count: "exact", head: true })
    .eq("trainer_id", user.id);

  // Wizard de onboarding — mostra se nunca terminou (onboarding_completed_at é NULL)
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
            <h1 className="text-xl font-bold truncate">Bom dia, {firstName} 🔥</h1>
            <p className="text-xs text-foreground/65">
              {temAluno
                ? `${totalAlunos} aluno${totalAlunos > 1 ? "s" : ""} ativo${totalAlunos > 1 ? "s" : ""} no painel`
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

      <main className="p-6 space-y-6 max-w-5xl mx-auto">
        {showChecklist && <OnboardingChecklist initial={checklistState} />}
        <DashboardEntrance
          focus={{ pergunta: "Quem tá esperando você hoje?", itens: focusStudents }}
          recentes={recentes}
          totalAlunos={totalAlunosCount.count ?? 0}
          temAluno={temAluno}
        />

        {/* Atalhos rápidos */}
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
