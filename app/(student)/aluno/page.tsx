import Link from "next/link";
import { headers } from "next/headers";
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
  LogOut,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { LogoutButton } from "@/components/logout-button";
import { createClient } from "@/lib/supabase/server";
import { isToday } from "@/lib/utils/date";

/**
 * Aluno "Hoje" — server component com dados reais do Supabase.
 *
 * Princípios mantidos do mock anterior:
 *  - Saudação humana + 1 pergunta, sem poluição numérica.
 *  - 1 card de treino + 1 linha de dieta (sem kcal exposto).
 *  - 6 tiles grandes com nome do que o aluno acessa.
 *  - Gráfico "Minha evolução" puxado de `measurements` reais.
 *  - Bottom nav com 5 destinos.
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

  // ── Guard de role ────────────────────────────────────────────────
  // Se o user logado é trainer/admin, manda pro painel certo.
  // Caso contrário (role='student' mas sem student_profiles), deixa
  // entrar — vai mostrar a tela vazia do aluno (UX honesta).
  const { data: profileRole } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileRole?.role === "trainer") {
    redirect("/app");
  }
  if (profileRole?.role === "admin") {
    redirect("/admin");
  }
  // ────────────────────────────────────────────────────────────────

  // Perfil + student_profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { data: student } = await supabase
    .from("student_profiles")
    .select("id, full_name, goal")
    .eq("user_id", user.id)
    .maybeSingle();

  // Workout session de hoje (pending)
  const { data: todaySession } = await supabase
    .from("workout_sessions")
    .select("id, workouts:workout_id(title, id), date")
    .eq("student_id", user.id)
    .eq("status", "pending")
    .order("date", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Plano alimentar atual
  const { data: todayDiet } = await supabase
    .from("diets")
    .select("id, title, meals(id)")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Measurements dos últimos 5 (peso)
  const { data: measurementsRaw } = await supabase
    .from("measurements")
    .select("date, weight_kg")
    .eq("student_id", user.id)
    .order("date", { ascending: false })
    .limit(5);

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
          evolucaoPontos[0].peso -
          evolucaoPontos[evolucaoPontos.length - 1].peso
        ).toFixed(1)
      : null;

  const firstName = (student?.full_name ?? profile?.full_name ?? user.email ?? "aluno").split(" ")[0];

  // Saudação datada (data atual do server, com fuso BR)
  const dateLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  // Workout do dia (workouts é uma FK → pode vir como objeto ou array dependendo do tipo inferido)
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

  // Forçar o path do logout como botão absoluto no header (mobile-only porque
  // desktop trainer não usa essa página)
  return (
    <main className="min-h-screen pb-24">
      <header className="px-5 md:px-8 pt-8 pb-2 max-w-3xl mx-auto flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground capitalize">{dateLabel}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
            Olá, <span className="text-primary">{firstName}</span>!
          </h1>
          <p className="mt-1 text-muted-foreground">Bora evoluir hoje?</p>
        </div>
        <LogoutButton variant="ghost" label="" />
      </header>

      {/* Treino do dia — card principal */}
      <section className="px-5 md:px-8 mt-6 max-w-3xl mx-auto">
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
                  {todaySession ? "Toca em começar pra registrar" : "Aproveita o descanso ou faz um WOD"}
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
      </section>

      {/* Dieta do dia */}
      <section className="px-5 md:px-8 mt-4 max-w-3xl mx-auto">
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

      {/* Tiles */}
      <section className="px-5 md:px-8 mt-6 max-w-3xl mx-auto">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          O que você quer ver
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {tiles.map((t) => (
            <Link
              key={t.label}
              href={t.href}
              className="group flex flex-col gap-3 rounded-2xl border border-white/5 bg-card p-4 hover:border-primary/40 transition-colors"
            >
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                <t.icon className="size-5" />
              </div>
              <span className="font-semibold leading-tight">{t.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Evolução */}
      <section className="px-5 md:px-8 mt-6 max-w-3xl mx-auto">
        <Card className="border-white/5 bg-card p-5">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-lg font-bold">Minha evolução</h3>
            {variacao !== null && (
              <Badge
                className={
                  variacao < 0
                    ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                    : "bg-primary/15 text-primary border-primary/30"
                }
              >
                {variacao > 0 ? "+" : ""}
                {variacao} kg em {Math.max(1, evolucaoPontos.length - 1)} meses
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Peso corporal</p>

          {evolucaoPontos.length >= 2 ? (
            <EvolucaoChart pontos={evolucaoPontos} />
          ) : (
            <p className="mt-4 text-sm text-foreground/65">
              Quando você registrar peso, sua linha de evolução aparece aqui.
            </p>
          )}
        </Card>
      </section>

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

/** Mini chart SVG inline — sem dependência de Recharts pra ficar leve. */
function EvolucaoChart({
  pontos,
}: {
  pontos: { mes: string; peso: number }[];
}) {
  const W = 600;
  const H = 180;
  const padding = 20;
  const xs = pontos.map((_, i) => padding + (i * (W - padding * 2)) / (pontos.length - 1));
  const pesos = pontos.map((p) => p.peso);
  const min = Math.min(...pesos) - 1;
  const max = Math.max(...pesos) + 1;
  const ys = pesos.map((v) => H - padding - ((v - min) / (max - min)) * (H - padding * 2));

  const path = pontos
    .map((_, i) => `${i === 0 ? "M" : "L"} ${xs[i].toFixed(1)} ${ys[i].toFixed(1)}`)
    .join(" ");
  const area = `${path} L ${xs.at(-1)} ${H - padding} L ${xs[0]} ${H - padding} Z`;

  return (
    <div className="mt-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-44"
        role="img"
        aria-label="Gráfico de peso corporal nos últimos meses"
      >
        <defs>
          <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.685 0.196 38.5)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="oklch(0.685 0.196 38.5)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#g)" />
        <path d={path} fill="none" stroke="oklch(0.685 0.196 38.5)" strokeWidth="2.5" />
        {xs.map((x, i) => (
          <circle key={i} cx={x} cy={ys[i]} r="4" fill="oklch(0.685 0.196 38.5)" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        {pontos.map((p) => (
          <span key={p.mes}>{p.mes}</span>
        ))}
      </div>
    </div>
  );
}
