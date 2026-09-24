import Link from "next/link";
import { redirect } from "next/navigation";
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
  MessageCircle
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTrainerScopeIds } from "@/lib/supabase/scope";
import { LogoutButton } from "@/components/logout-button";
import { KpiCard } from "./_components/kpi-card";
import { DashboardEntrance } from "./dashboard-entrance";
import { PwaBanner } from "@/components/pwa-install";
import { OnboardingChecklist, type ChecklistState } from "./_components/onboarding-checklist";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

interface StudentSummary {
  id: string;
  nome: string;
  letra: string;
  oque: string;
  quando: string;
}

export default async function TrainerDashboard() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) return <div className="p-10 text-center">Autenticação necessária.</div>;

  // Lockout de trial ANTES do try geral: redirect() lança exceção e
  // não pode ser engolido por catch (travaria o redirect em loop).
  try {
    const { data: tRow } = await supabase
      .from("trainer_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (tRow) {
      const { getTrainerTrialState } = await import("@/lib/billing/trial");
      if ((await getTrainerTrialState(user.id)).locked) {
        redirect("/app/settings/upgrade");
      }
    }
  } catch (e) {
    const { isRedirectError } = await import(
      "next/dist/client/components/redirect-error"
    );
    if (isRedirectError(e)) throw e;
    // Qualquer outro erro de billing nunca trava o dashboard
  }

  try {
    const scopeIds = await getTrainerScopeIds(supabase, user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const firstName = (profile?.full_name ?? user.email?.split("@")[0] ?? "Treinador");

    let totalAlunos = 0;
    let studentsList: StudentSummary[] = [];
    try {
      const { data: students, error: sErr } = await supabase
        .from("student_profiles")
        .select("user_id, full_name, status, goal")
        .in("trainer_id", scopeIds)
        .order("created_at", { ascending: false });
      
      if (!sErr && students) {
        totalAlunos = students.length;
        studentsList = students.map(s => ({
          id: s.user_id,
          nome: s.full_name ?? "Aluno",
          letra: s.full_name?.[0]?.toUpperCase() ?? "?",
          oque: s.goal || "Sem objetivo",
          quando: s.status === "active" ? "Ativo" : "Inativo",
        }));
      }
    } catch (e) { console.error("Error fetching students:", e); }

    let receitaMes = 0;
    try {
      const { data: payments } = await supabase
        .from("payment_links")
        .select("amount_cents")
        .in("trainer_id", scopeIds)
        .not("paid_at", "is", null);
      if (payments) {
        receitaMes = payments.reduce((acc, p) => acc + (p.amount_cents / 100), 0);
      }
    } catch (e) { console.error("Error fetching revenue:", e); }

    // Mensagens 1:1 não lidas (agrupadas por aluno)
    let unreadChats: Array<{ student_id: string; name: string; count: number }> = [];
    try {
      const { data: unread } = await supabase
        .from("direct_messages")
        .select("student_id")
        .in("trainer_id", scopeIds)
        .neq("sender_id", user.id)
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(100);
      const byStudent = new Map<string, number>();
      for (const m of (unread ?? []) as Array<{ student_id: string }>) {
        byStudent.set(m.student_id, (byStudent.get(m.student_id) ?? 0) + 1);
      }
      if (byStudent.size > 0) {
        const nameMap = new Map(studentsList.map((s) => [s.id, s.nome]));
        unreadChats = Array.from(byStudent.entries()).map(([student_id, count]) => ({
          student_id,
          name: nameMap.get(student_id) ?? "Aluno",
          count,
        }));
      }
    } catch {
      // opcional
    }
    let checklist: ChecklistState | null = null;
    try {
      const [{ count: wCount }, { count: dCount }, { data: tSettings }] = await Promise.all([
        supabase.from("workouts").select("id", { count: "exact", head: true }).in("trainer_id", scopeIds),
        supabase.from("diets").select("id", { count: "exact", head: true }).in("trainer_id", scopeIds),
        supabase.from("trainer_settings").select("pix_key").eq("user_id", user.id).maybeSingle(),
      ]);
      const state: ChecklistState = {
        invited_student: totalAlunos > 0,
        sent_workout: (wCount ?? 0) > 0,
        sent_diet: (dCount ?? 0) > 0,
        configured_pay: Boolean((tSettings as { pix_key?: string } | null)?.pix_key),
      };
      if (Object.values(state).some((v) => !v)) checklist = state;
    } catch {
      // checklist é opcional
    }
    let sessoes7d = 0;
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const studentIds = studentsList.map((s) => s.id);
      if (studentIds.length > 0) {
        const { data: sessions, error: sessErr } = await supabase
          .from("workout_sessions")
          .select("id")
          .in("student_id", studentIds)
          .gte("date", sevenDaysAgo);
        if (!sessErr && sessions) sessoes7d = sessions.length;
      }
    } catch (e) { console.error("Error fetching sessions:", e); }

    // Aderência: % de alunos com ao menos 1 sessão nos últimos 7 dias
    let aderencia = 0;
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const studentIds = studentsList.map((s) => s.id);
      if (studentIds.length > 0) {
        const { data: activeSessions } = await supabase
          .from("workout_sessions")
          .select("student_id")
          .in("student_id", studentIds)
          .gte("date", sevenDaysAgo);
        const unique = new Set((activeSessions ?? []).map((s) => s.student_id));
        aderencia = Math.round((unique.size / studentIds.length) * 100);
      }
    } catch (e) { console.error("Error fetching adherence:", e); }

    return (
      <div className="min-h-screen p-6 space-y-8 max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Olá, <span className="text-primary">{firstName}</span>
            </h1>
            <p className="text-muted-foreground">Seu painel de gestão de alunos.</p>
          </div>
          <div className="flex items-center gap-3">
            <ButtonLink href="/app/students/new" className="shadow-lg shadow-primary/20">
              <Plus className="size-4 mr-2" /> Novo aluno
            </ButtonLink>
            <LogoutButton variant="ghost" label="" />
          </div>
        </header>

        {checklist && <OnboardingChecklist initial={checklist} />}

        <PwaBanner gifUrl="/install-ios.gif" />

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
          <KpiCard icon={CalendarDays} label="Sessões (7d)" value={sessoes7d} hint="Treinos registrados" />
          <KpiCard icon={Flame} label="Aderência" value={aderencia} formatKind="percent" hint="Alunos ativos na semana" />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
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
                  Você ainda não tem alunos vinculados. Comece convidando seu primeiro aluno!
                </p>
                <ButtonLink href="/app/students/new" className="mx-auto">
                  Adicionar primeiro aluno
                </ButtonLink>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {unreadChats.length > 0 && (
              <Card className="p-6 bg-primary/5 border-primary/20">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                    <MessageCircle className="size-5 text-primary" /> Conversas
                  </h2>
                  <Link href="/app/mensagens" className="text-xs font-semibold text-primary hover:underline">
                    Ver todas
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Mensagens novas pra responder
                </p>
                <div className="space-y-2">
                  {unreadChats.slice(0, 5).map((c) => (
                    <QuickAction
                      key={c.student_id}
                      icon={MessageCircle}
                      label={`${c.name} · ${c.count} nova${c.count === 1 ? "" : "s"}`}
                      href={`/app/students/${c.student_id}/mensagens`}
                    />
                  ))}
                </div>
              </Card>
            )}
            <Card className="p-6 bg-card/50 border-white/10">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Plus className="size-5 text-primary" /> Ações Rápidas
              </h2>
              <div className="grid grid-cols-1 gap-3">
                <QuickAction icon={UserPlus} label="Novo Aluno" href="/app/students/new" />
                <QuickAction icon={CalendarCheck2} label="Montar Treino" href="/app/workouts" />
                <QuickAction icon={Receipt} label="Financeiro" href="/app/finance" />
                <QuickAction icon={MessageCircle} label="WhatsApp" href="/app/whatsapp" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  } catch (err) {
    console.error("DASHBOARD ERROR:", err);
    return <div className="p-10 text-center text-red-500">Erro ao carregar painel.</div>;
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
