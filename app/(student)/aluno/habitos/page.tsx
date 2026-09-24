import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { HabitCounter } from "./habit-counter";
import { Sparkles, Flame } from "lucide-react";
import { todayBR } from "@/lib/utils/date";
import { Stagger, StaggerItem, AnimatedNumber } from "@/components/ui/stagger";
import { ProgressRing } from "@/components/ui/progress-ring";

const DAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"]; // dom-sáb (compacto)

/**
 * Página de hábitos do aluno.
 * Mostra:
 *   1. Progresso geral HOJE.
 *   2. Cards de cada hábito (contador HOJE).
 *   3. Visão SEMANAL — grid 7 dias pra cada hábito (qual dia bateu a meta).
 *   4. Streak atual (dias consecutivos batendo a meta).
 */
export default async function HabitosAlunoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = todayBR(); // YYYY-MM-DD em São Paulo

  // Hábitos + todos os logs (limitando aos últimos 14 dias pra UI)
  const { data: habits, error } = await supabase
    .from("habits")
    .select(
      `id, name, icon, target_count, unit, frequency,
       logs:habit_logs(count, logged_at)`,
    )
    .eq("student_id", user.id)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Meus hábitos</h1>
        <p className="text-sm text-destructive">Erro: {error.message}</p>
      </div>
    );
  }

  // Calcula últimos 7 dias (hoje inclusivo)
  const last7: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7.push(d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }));
  }

  type HabitRow = {
    id: string;
    name: string;
    icon: string | null;
    target_count: number;
    unit: string | null;
    frequency: string;
    logs: { count: number; logged_at: string }[] | null;
  };

  const list = ((habits ?? []) as HabitRow[]).map((h) => {
    // Mapa: data → count (NUMERIC volta como string — coage)
    const byDate = new Map<string, number>();
    for (const l of h.logs ?? []) byDate.set(l.logged_at, Number(l.count));

    const todayCount = byDate.get(today) ?? 0;

    // Array de booleanos pros últimos 7 dias: bateu a meta naquele dia?
    const week = last7.map((d) => (byDate.get(d) ?? 0) >= h.target_count);

    // Streak = dias consecutivos (de trás pra frente) batendo a meta
    let streak = 0;
    for (let i = week.length - 1; i >= 0; i--) {
      if (week[i]) streak++;
      else break;
    }

    return {
      id: h.id,
      name: h.name,
      icon: h.icon,
      target: h.target_count,
      unit: h.unit ?? "",
      frequency: h.frequency,
      current: todayCount,
      week,
      streak,
    };
  });

  const overallProgress =
    list.length === 0
      ? 0
      : list.reduce((acc, h) => acc + Math.min(100, (h.current / h.target) * 100), 0) /
        list.length;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Meus hábitos</h1>
        <p className="text-sm text-muted-foreground">
          Marque o que você fez hoje e veja sua sequência da semana.
        </p>
      </header>

      {/* Progresso geral HOJE */}
      {list.length > 0 && (
        <Card className="bg-card border-white/5 p-5 relative overflow-hidden">
          <div className="flex items-center gap-5">
            <ProgressRing
              value={overallProgress}
              size={84}
              strokeWidth={7}
              progressColor="oklch(0.685 0.196 38.5)"
              label={
                <span className="text-lg font-extrabold">
                  <AnimatedNumber value={Math.round(overallProgress)} />%
                </span>
              }
              sublabel="hoje"
            />
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">Progresso geral</div>
              <div className="text-base font-bold">
                {list.filter((h) => h.current >= h.target).length} de {list.length}{" "}
                hábitos batidos hoje
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-orange-400 transition-all duration-700"
                  style={{ width: `${Math.min(100, overallProgress)}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {list.length === 0 ? (
        <Card className="bg-card border-dashed border-white/10 p-8 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground mx-auto">
            <Sparkles className="size-6" />
          </div>
          <h3 className="mt-4 font-semibold">Nenhum hábito configurado</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Quando seu personal criar hábitos pra você, eles aparecem aqui.
          </p>
        </Card>
      ) : (
        <Stagger className="space-y-3" delay={0.05}>
          {list.map((h) => (
            <StaggerItem key={h.id}>
              <Card className="bg-card border-white/5 p-5 space-y-4 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{h.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Meta: {h.target} {h.unit || "x"} por dia
                    </div>
                  </div>
                  {h.streak >= 2 && (
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-orange-500/15 text-orange-500 px-2.5 py-1 text-xs font-semibold">
                      <Flame className="size-3" />
                      {h.streak} {h.streak === 1 ? "dia" : "dias"}
                    </span>
                  )}
                </div>

                <HabitCounter
                  habitId={h.id}
                  name={h.name}
                  icon={h.icon}
                  target={h.target}
                  unit={h.unit}
                  current={h.current}
                />

                <div>
                  <div className="text-xs uppercase tracking-wider text-foreground/55 mb-2">
                    Semana
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {h.week.map((done, idx) => {
                      const dayDate = last7[idx];
                      const isToday = dayDate === today;
                      const dow = new Date(dayDate + "T12:00:00").getDay();
                      return (
                        <div
                          key={idx}
                          className="flex flex-col items-center gap-1"
                          title={`${done ? "Bateu a meta" : "Não bateu"} em ${dayDate}`}
                        >
                          <span
                            className={`text-[10px] uppercase ${
                              isToday ? "text-primary font-bold" : "text-foreground/45"
                            }`}
                          >
                            {DAY_LABELS[dow]}
                          </span>
                          <div
                            className={`size-10 rounded-md border-2 transition-all ${
                              done
                                ? "bg-primary border-primary"
                                : isToday
                                  ? "border-primary/40 bg-primary/5"
                                  : "border-white/10 bg-background/40"
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
