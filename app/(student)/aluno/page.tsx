import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Dumbbell,
  Salad,
  PlayCircle,
  Video,
  LineChart,
  Utensils,
  History,
  MessagesSquare,
  ArrowRight,
  ShoppingBasket,
  CheckSquare,
  Trophy,
  Calendar,
  Flame,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { LogoutButton } from "@/components/logout-button";
import { Sparkline } from "@/components/ui/sparkline";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Stagger, StaggerItem, AnimatedNumber } from "@/components/ui/stagger";
import { createClient } from "@/lib/supabase/server";
import { isToday } from "@/lib/utils/date";
import { calcHabitStreak } from "@/lib/utils/streak";

/**
 * Aluno "Hoje" — server component com dados reais do Supabase.
 *
 * Princípios mantidos:
 *  - Saudação humana + 1 pergunta, sem poluição numérica.
 *  - 1 card de treino + 1 linha de dieta (sem kcal exposto).
 *  - 6 tiles grandes com nome do que o aluno acessa.
 *  - Gráfico "Minha evolução" puxado de `measurements` reais.
 *  - Bottom nav com 5 destinos.
 *
 * Melhorias 2026-09-22:
 *  - Streak grande no header (dias consecutivos batendo hábito)
 *  - ProgressRing do "hoje" (treinos hábitos sessão)
 *  - Sparkline de peso com animação
 *  - Stagger de entrada nos tiles
 */

const tiles = [
  { label: "Meus treinos", icon: Dumbbell, href: "/aluno/treinos" },
  { label: "Plano alimentar", icon: Utensils, href: "/aluno/dieta" },
  { label: "Hábitos de hoje", icon: CheckSquare, href: "/aluno/habitos" },
  { label: "WOD do dia", icon: Trophy, href: "/aluno/wod" },
  { label: "Lista de compras", icon: ShoppingBasket, href: "/aluno/compras" },
  { label: "Agendar com coach", icon: Calendar, href: "/aluno/agenda" },
  { label: "Vídeos dos exercícios", icon: Video, href: "/aluno/treinos" },
  { label: "Minha evolução", icon: LineChart, href: "/aluno/progresso" },
  { label: "Meu histórico", icon: History, href: "/aluno/historico" },
  { label: "Acompanhamento", icon: MessagesSquare, href: "/aluno/mensagens" },
] as const;

export default async function StudentHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Guard de role
  const { data: profileRole } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileRole?.role === "trainer") redirect("/app");
  if (profileRole?.role === "admin") redirect("/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  let { data: student } = await supabase
    .from("student_profiles")
    .select("id, full_name, goal, xp_total")
    .eq("user_id", user.id)
    .maybeSingle();

  // SELF-HEAL: tenta auto-vincular/backfillar via invite matching email.
  // Migration 0028 implementa student_self_link (idempotente).
  // Best-effort: se falhar, segue sem (mostra "Sem objetivo definido").
  try {
    await supabase.rpc("student_self_link");
  } catch {
    // silent — não bloqueia o dashboard
  }

  // Re-fetch pra pegar dados atualizados após self-heal/backfill
  const { data: studentRetry } = await supabase
    .from("student_profiles")
    .select("id, full_name, goal, xp_total")
    .eq("user_id", user.id)
    .maybeSingle();
  if (studentRetry) {
    student = studentRetry;
  }

  // Workout session de hoje
  const { data: todaySession } = await supabase
    .from("workout_sessions")
    .select("id, workouts:workout_id(title, id), date")
    .eq("student_id", user.id)
    .eq("status", "pending")
    .order("date", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Plano alimentar
  const { data: todayDiet } = await supabase
    .from("diets")
    .select("id, title, meals(id)")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Measurements dos últimos 30 (peso + gordura)
  const { data: measurementsRaw } = await supabase
    .from("measurements")
    .select("date, weight_kg, body_fat_pct")
    .eq("student_id", user.id)
    .order("date", { ascending: false })
    .limit(30);

  const evolucaoPontos = (measurementsRaw ?? [])
    .slice()
    .reverse()
    .map((m) => ({
      mes: new Date(m.date).toLocaleDateString("pt-BR", { month: "short" }),
      peso: m.weight_kg ?? 0,
    }))
    .filter((p) => p.peso > 0);

  const variacao =
    evolucaoPontos.length >= 2
      ? +(
          evolucaoPontos[evolucaoPontos.length - 1].peso -
          evolucaoPontos[0].peso
        ).toFixed(1)
      : null;

  // Hábitos (streak)
  const { data: habitsRaw } = await supabase
    .from("habits")
    .select(
      `id, name, icon, target_count, unit, frequency,
       logs:habit_logs(count, logged_at)`,
    )
    .eq("student_id", user.id)
    .eq("active", true)
    .order("created_at", { ascending: true });

  const habitList = ((habitsRaw ?? []) as Array<{
    id: string;
    name: string;
    icon: string | null;
    target_count: number;
    unit: string | null;
    frequency: string;
    logs: { count: number; logged_at: string }[] | null;
  }>).map((h) => {
    const byDate = new Map<string, number>();
    for (const l of h.logs ?? []) byDate.set(l.logged_at, l.count);
    return { ...h, byDate };
  });

  // Streak: maior sequência entre os hábitos
  let bestStreak = 0;
  for (const h of habitList) {
    const s = calcHabitStreak(h.byDate, h.target_count, 14);
    if (s > bestStreak) bestStreak = s;
  }

  // Progresso de hábitos HOJE
  const todayBR = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  let habitsDone = 0;
  for (const h of habitList) {
    if ((h.byDate.get(todayBR) ?? 0) >= h.target_count) habitsDone++;
  }
  const habitsProgress = habitList.length === 0 ? 0 : (habitsDone / habitList.length) * 100;

  const firstName = (student?.full_name ?? profile?.full_name ?? user.email ?? "aluno").split(" ")[0];

  const dateLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  const workoutsJoin = todaySession?.workouts as
    | { title: string }
    | { title: string }[]
    | null
    | undefined;
  const todayTitle = Array.isArray(workoutsJoin)
    ? workoutsJoin[0]?.title
    : workoutsJoin?.title ?? "Descanso";

  const todayMeta =
    todaySession && isToday(todaySession.date)
      ? "Treino de hoje"
      : "Próximo treino programado";

  const mealCount = Array.isArray(todayDiet?.meals) ? todayDiet.meals.length : 0;

  const xp = student?.xp_total ?? 0;

  return (
    <main className="min-h-screen pb-24">
      <header className="px-5 md:px-8 pt-8 pb-2 max-w-3xl mx-auto flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground capitalize">{dateLabel}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
            Olá, <span className="text-primary">{firstName}</span>!
          </h1>
          <p className="mt-1 text-muted-foreground">
            {bestStreak > 0
              ? `🔥 ${bestStreak} ${bestStreak === 1 ? "dia" : "dias"} seguidos de hábito — bora manter!`
              : "Bora evoluir hoje?"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/5 text-primary font-bold"
          >
            <Flame className="size-3 mr-1" />
            <AnimatedNumber value={xp} /> XP
          </Badge>
          <LogoutButton variant="ghost" label="" />
        </div>
      </header>

      <Stagger className="px-5 md:px-8 mt-6 max-w-3xl mx-auto" delay={0.05}>
        {/* Treino + ProgressRing de hábitos */}
        <StaggerItem>
          <div className="grid sm:grid-cols-[1fr_auto] gap-3">
            <Card className="overflow-hidden border-white/5 bg-card p-0">
              <div
                className="relative h-40 w-full bg-gradient-to-br from-primary/30 via-primary/10 to-background"
                aria-hidden
              >
                <div className="absolute inset-0 flex items-end p-5">
                  <div>
                    <Badge className="bg-background/70 text-foreground border-white/10 backdrop-blur">
                      <PlayCircle className="size-3.5 mr-1" />
                      {todayMeta}
                    </Badge>
                    <h2 className="mt-3 text-2xl font-extrabold">{todayTitle}</h2>
                    <p className="text-sm text-muted-foreground">
                      {todaySession
                        ? "Toca em começar pra registrar"
                        : "Aproveita o descanso ou faz um WOD"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 p-5">
                <p className="text-sm text-muted-foreground">
                  {student?.goal ? (
                    <>
                      Foco:{" "}
                      <span className="font-semibold text-foreground">{student.goal}</span>
                    </>
                  ) : (
                    "Sem objetivo definido ainda"
                  )}
                </p>
                <ButtonLink
                  href={todaySession ? "/aluno/treinos" : "/aluno/wod"}
                  className="font-semibold shrink-0"
                >
                  Começar
                  <ArrowRight className="size-4" />
                </ButtonLink>
              </div>
            </Card>

            {/* ProgressRing dos hábitos de hoje */}
            {habitList.length > 0 && (
              <Card className="border-white/5 bg-card p-4 grid place-items-center min-w-[140px]">
                <ProgressRing
                  value={habitsProgress}
                  size={100}
                  strokeWidth={8}
                  progressColor="oklch(0.685 0.196 38.5)"
                  label={
                    <span className="text-2xl">
                      {habitsDone}
                      <span className="text-base text-muted-foreground">/{habitList.length}</span>
                    </span>
                  }
                  sublabel="hábitos"
                />
                <p className="mt-2 text-xs text-muted-foreground text-center">Hoje</p>
              </Card>
            )}
          </div>
        </StaggerItem>

        {/* Dieta */}
        <StaggerItem>
          <section className="mt-4">
            <Link
              href="/aluno/dieta"
              className="flex items-center gap-4 rounded-xl border border-white/5 bg-card p-4 hover:border-primary/30 transition-colors"
            >
              <div className="grid size-10 place-items-center rounded-full bg-primary/15 text-primary">
                <Salad className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">Plano alimentar de hoje</div>
                <div className="text-sm text-muted-foreground truncate">
                  {mealCount > 0
                    ? `${mealCount} refeições · montado pelo seu coach`
                    : "Sem plano definido ainda — pede pro seu coach"}
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>
          </section>
        </StaggerItem>

        {/* Tiles */}
        <StaggerItem>
          <section className="mt-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              O que você quer ver
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {tiles.map((t) => (
                <Link
                  key={t.label}
                  href={t.href}
                  className="group relative flex flex-col gap-3 rounded-2xl border border-white/5 bg-card p-4 overflow-hidden hover:border-primary/40 transition-colors"
                >
                  {/* Glow no hover */}
                  <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/10 group-hover:to-transparent transition-colors duration-500" />
                  <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:scale-110 transition-all">
                    <t.icon className="size-5" />
                  </div>
                  <span className="font-semibold leading-tight">{t.label}</span>
                </Link>
              ))}
            </div>
          </section>
        </StaggerItem>

        {/* Evolução com sparkline animado */}
        <StaggerItem>
          <section className="mt-6">
            <Card className="border-white/5 bg-card p-5">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold">Minha evolução</h3>
                  <p className="text-sm text-muted-foreground">Peso corporal</p>
                </div>
                {variacao !== null && (
                  <Badge
                    className={
                      variacao < 0
                        ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                        : "bg-primary/15 text-primary border-primary/30"
                    }
                  >
                    {variacao > 0 ? "+" : ""}
                    {variacao} kg em {Math.max(1, evolucaoPontos.length - 1)} medições
                  </Badge>
                )}
              </div>

              {evolucaoPontos.length >= 2 ? (
                <div className="mt-4 text-primary">
                  <Sparkline
                    data={evolucaoPontos.map((p) => p.peso)}
                    labels={evolucaoPontos.map((p) => p.mes)}
                    height={120}
                    showArea
                    showDots
                  />
                </div>
              ) : (
                <p className="mt-4 text-sm text-foreground/65">
                  Quando você registrar peso, sua linha de evolução aparece aqui.
                </p>
              )}
            </Card>
          </section>
        </StaggerItem>
      </Stagger>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-white/5 bg-background/90 backdrop-blur-md">
        <ul className="mx-auto max-w-3xl grid grid-cols-5">
          <NavItem label="Início" icon={Dumbbell} href="/aluno" active />
          <NavItem label="Treinos" icon={PlayCircle} href="/aluno/treinos" />
          <NavItem label="Dieta" icon={Salad} href="/aluno/dieta" />
          <NavItem label="WOD" icon={Trophy} href="/aluno/wod" />
          <NavItem label="Mais" icon={MessagesSquare} href="/aluno/mensagens" />
        </ul>
      </nav>
    </main>
  );
}

function NavItem({
  label,
  icon: Icon,
  href,
  active,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  active?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className={`flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
          active ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Icon className="size-5" />
        <span className={active ? "font-bold" : "font-medium"}>{label}</span>
      </Link>
    </li>
  );
}
