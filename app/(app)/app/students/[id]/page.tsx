import { createClient } from "@/lib/supabase/server";
import { getTrainerScopeIds } from "@/lib/supabase/scope";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { notFound } from "next/navigation";
import {
  Phone,
  Mail,
  Calendar,
  Dumbbell,
  Salad,
  TrendingUp,
  TrendingDown,
  Wallet,
  Flame,
  MessageSquare,
} from "lucide-react";
import { MeasurementForm } from "./measurement-form";
import { Sparkline } from "@/components/ui/sparkline";
import { Stagger, StaggerItem, AnimatedNumber } from "@/components/ui/stagger";

const MES_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div className="p-10 text-center">Sessão expirada.</div>;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, avatar_url")
    .eq("id", id)
    .maybeSingle();

  const { data: studentProfile } = await supabase
    .from("student_profiles")
    .select("status, birth_date, goals, plan_tier, xp_total, goal, joined_at, full_name")
    .eq("user_id", id)
    .maybeSingle();

  if (!studentProfile || !profile) {
    notFound();
  }

  const { data: trainerCheck } = await supabase
    .from("student_profiles")
    .select("trainer_id")
    .eq("user_id", id)
    .in("trainer_id", await getTrainerScopeIds(supabase, user.id))
    .maybeSingle();

  if (!trainerCheck) {
    return <div className="p-10 text-center text-red-500">Você não tem permissão para acessar este aluno.</div>;
  }

  const { data: measurementsAll } = await supabase
    .from("measurements")
    .select("id, date, weight_kg, body_fat_pct, waist_cm")
    .eq("student_id", id)
    .order("date", { ascending: false })
    .limit(30);

  const measurementsList = (measurementsAll ?? []).slice(0, 5);
  const measurementsCresc = (measurementsAll ?? []).slice().reverse();

  const pesoSerie = measurementsCresc
    .filter((m) => m.weight_kg != null)
    .map((m) => m.weight_kg as number);
  
  const pesoLabels = measurementsCresc
    .filter((m) => m.weight_kg != null)
    .map((m) => {
      const d = new Date(m.date);
      return `${MES_PT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    });

  const pesoDelta =
    pesoSerie.length >= 2
      ? +(pesoSerie[pesoSerie.length - 1] - pesoSerie[0]).toFixed(1)
      : null;

  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, title, goal")
    .eq("student_id", id)
    .limit(5);

  const { data: diets } = await supabase
    .from("diets")
    .select("id, title, kcal_target")
    .eq("student_id", id)
    .limit(5);

  const { data: pendingPayments } = await supabase
    .from("payments")
    .select("id, amount, due_date, description")
    .eq("student_id", id)
    .eq("status", "pending")
    .order("due_date", { ascending: true })
    .limit(5);

  const { data: lastSession } = await supabase
    .from("workout_sessions")
    .select("created_at, status")
    .eq("student_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const initials = profile.full_name?.slice(0, 2).toUpperCase() ?? "??";
  const statusLabel = studentProfile.status === "active" ? "Ativo" : studentProfile.status ?? "—";
  const xp = studentProfile.xp_total ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 pb-12">
      <Card className="bg-card border-white/5 p-6 overflow-hidden relative">
        <div
          className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent pointer-events-none"
          aria-hidden
        />
        <div className="relative flex items-start gap-4">
          <div className="size-16 rounded-full bg-primary/15 text-primary grid place-items-center text-xl font-bold shrink-0 border-2 border-primary/30">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">{profile.full_name}</h1>
              <Badge
                variant="outline"
                className={
                  studentProfile.status === "active"
                    ? "border-emerald-500/30 text-emerald-500"
                    : "border-rose-500/30 text-rose-500"
                }
              >
                {statusLabel}
              </Badge>
              {studentProfile.plan_tier && (
                <Badge variant="outline" className="border-primary/30 text-primary">
                  {studentProfile.plan_tier}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
              {profile.email && (
                <span className="flex items-center gap-1">
                  <Mail className="size-3.5" />
                  {profile.email}
                </span>
              )}
              {profile.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="size-3.5" />
                  {profile.phone}
                </span>
              )}
              {studentProfile.birth_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  {new Date(studentProfile.birth_date).toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>
            {(studentProfile.goals ?? studentProfile.goal) && (
              <p className="text-sm mt-3 italic text-foreground/80">
                "{(studentProfile.goals ?? studentProfile.goal) as string}"
              </p>
            )}
          </div>
          <ButtonLink href={`/app/finance/new?student_id=${id}`} size="sm">
            <Wallet className="size-4" />
            Nova cobrança
          </ButtonLink>
        </div>

        <div className="relative grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-white/5">
          <Mini
            icon={Flame}
            label="XP acumulado"
            value={xp}
            format={(v) => v.toLocaleString("pt-BR")}
          />
          <Mini
            icon={TrendingUp}
            label="Δ peso"
            value={pesoDelta ?? 0}
            format={(v) => (v > 0 ? "+" : "") + v.toFixed(1)}
            extra="kg"
            tone={pesoDelta == null ? "muted" : pesoDelta < 0 ? "good" : "neutral"}
          />
          <Mini
            icon={Calendar}
            label="Última sessão"
            valueText={lastSession ? relativeTime(lastSession.created_at) : "—"}
          />
        </div>
      </Card>

      <Stagger className="space-y-6" delay={0.05}>
        {pesoSerie.length >= 2 && (
          <StaggerItem>
            <Card className="bg-card border-white/5 p-5">
              <div className="flex items-baseline justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-lg font-bold">Evolução do peso</h2>
                  <p className="text-xs text-muted-foreground">
                    {pesoSerie.length} medições registradas
                  </p>
                </div>
                {pesoDelta !== null && (
                  <Badge
                    className={
                      pesoDelta < 0
                        ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                        : pesoDelta > 0
                          ? "bg-primary/15 text-primary border-primary/30"
                          : "bg-secondary text-secondary-foreground border-white/10"
                    }
                  >
                    {pesoDelta < 0 ? (
                      <TrendingDown className="size-3 mr-1" />
                    ) : (
                      <TrendingUp className="size-3 mr-1" />
                    )}
                    {pesoDelta > 0 ? "+" : ""}
                    {pesoDelta} kg
                  </Badge>
                )}
              </div>
              <div className="text-primary">
                <Sparkline data={pesoSerie} labels={pesoLabels} height={140} showDots showArea />
              </div>
            </Card>
          </StaggerItem>
        )}

        <StaggerItem>
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="bg-card border-white/5 p-5">
              <h2 className="font-semibold mb-3">Últimas medições</h2>
              <MeasurementForm studentId={id} />
               {measurementsList.length === 0 ? (
                 <p className="text-sm text-muted-foreground mt-3">
                   Nenhuma medição registrada.
                 </p>
               ) : (
                 <ul className="space-y-2 mt-4">
                   {measurementsList.map((m) => (
                     <li
                       key={m.id}
                       className="text-sm border-b border-white/5 last:border-0 pb-2 last:pb-0"
                     >
                       <div className="flex justify-between">
                         <span className="text-muted-foreground">
                           {new Date(m.date).toLocaleDateString("pt-BR", {
                             day: "2-digit",
                             month: "short",
                           })}
                         </span>
                         <span className="font-mono">
                           {m.weight_kg != null && `${m.weight_kg.toFixed(1)} kg`}
                           {m.body_fat_pct != null && ` · ${m.body_fat_pct.toFixed(1)}%`}
                           {m.waist_cm != null && ` · ${m.waist_cm}cm`}
                         </span>
                       </div>
                     </li>
                   ))}
                 </ul>
                )}
              </Card>

            <Card className="bg-card border-white/5 p-5">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Dumbbell className="size-4" />
                Treinos atribuídos
              </h2>
              {(!workouts || workouts.length === 0) ? (
                <p className="text-sm text-muted-foreground">Nenhum treino atribuído.</p>
              ) : (
                <ul className="space-y-2">
                  {workouts.map((w) => (
                    <li
                      key={w.id}
                      className="text-sm border-b border-white/5 last:border-0 pb-2 last:pb-0"
                    >
                      <div className="font-medium">{w.title}</div>
                      {w.goal && (
                        <div className="text-xs text-muted-foreground">{w.goal}</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="bg-card border-white/5 p-5">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Salad className="size-4" />
                Dietas
              </h2>
              {(!diets || diets.length === 0) ? (
                <p className="text-sm text-muted-foreground">Nenhuma dieta.</p>
              ) : (
                <ul className="space-y-2">
                  {diets.map((d) => (
                    <li
                      key={d.id}
                      className="text-sm border-b border-white/5 last:border-0 pb-2 last:pb-0"
                    >
                      <div className="font-medium">{d.title}</div>
                      {d.kcal_target != null && (
                        <div className="text-xs text-muted-foreground">
                          {d.kcal_target} kcal/dia
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="bg-card border-white/5 p-5">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Wallet className="size-4" />
                Pagamentos pendentes
              </h2>
              {(!pendingPayments || pendingPayments.length === 0) ? (
                <p className="text-sm text-muted-foreground">Nada em aberto.</p>
              ) : (
                <ul className="space-y-2">
                  {pendingPayments.map((p) => (
                    <li
                      key={p.id}
                      className="text-sm border-b border-white/5 last:border-0 pb-2 last:pb-0"
                    >
                      <div className="flex justify-between">
                        <span className="truncate">{p.description ?? "—"}</span>
                        <span className="font-mono">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(Number(p.amount))}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Vence {new Date(p.due_date).toLocaleDateString("pt-BR")}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </StaggerItem>

        <StaggerItem>
          <Card className="bg-card border-white/5 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Conversa</h2>
                <p className="text-xs text-muted-foreground">
                  Feedback direto 1:1 com o aluno, dentro do app.
                </p>
              </div>
              <ButtonLink href={`/app/students/${id}/mensagens`} size="sm">
                <MessageSquare className="size-4" />
                Abrir conversa
              </ButtonLink>
            </div>
          </Card>
        </StaggerItem>
      </Stagger>
    </div>
  );
}

function Mini({
  icon: Icon,
  label,
  value,
  valueText,
  format,
  extra,
  tone = "muted",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: number;
  valueText?: string;
  format?: (n: number) => string;
  extra?: string;
  tone?: "muted" | "good" | "neutral";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-500"
      : tone === "neutral"
        ? "text-primary"
        : "text-foreground";
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </div>
      <div className={`mt-1 text-xl font-extrabold ${toneClass}`}>
        {valueText ?? <AnimatedNumber value={value ?? 0} format={format} />}
        {extra && <span className="text-sm text-muted-foreground ml-1">{extra}</span>}
      </div>
    </div>
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
