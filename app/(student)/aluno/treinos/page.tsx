import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckInButton } from "./check-in-button";
import { Dumbbell, Flame, Target } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/ui/stagger";

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DAY_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];

export default async function TreinosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: workouts, error } = await supabase
    .from("workouts")
    .select(
      `id, title, goal,
       workout_days:workout_days(
         id, day_of_week, title,
         workout_items:workout_items(
           id, sets, reps, load, rest_seconds, notes, position,
           exercises:exercise_id(id, name, muscle_group)
         )
       )`,
    )
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Meus treinos</h1>
        <p className="text-sm text-destructive">Erro: {error.message}</p>
      </div>
    );
  }

  const todayDay = new Date().getDay();
  const list = (workouts ?? []) as Array<{
    id: string;
    title: string;
    goal: string | null;
    workout_days: WorkoutDay[] | null;
  }>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 pb-12">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Meus treinos</h1>
        <p className="text-sm text-muted-foreground">
          {list.length} treino{list.length === 1 ? "" : "s"} atribuído{list.length === 1 ? "" : "s"}
        </p>
      </header>

      {list.length === 0 ? (
        <Card className="bg-card border-dashed border-white/10 p-8 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground mx-auto">
            <Dumbbell className="size-6" />
          </div>
          <h3 className="mt-4 font-semibold">Nenhum treino atribuído ainda</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Quando seu personal montar um treino pra você, aparece aqui.
          </p>
        </Card>
      ) : (
        <Stagger className="space-y-4" delay={0.05}>
          {list.map((w) => (
            <StaggerItem key={w.id}>
              <WorkoutBlock workout={w} todayDay={todayDay} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}

type WorkoutBlockProps = {
  workout: {
    id: string;
    title: string;
    goal: string | null;
    workout_days: WorkoutDay[] | null;
  };
  todayDay: number;
};

type WorkoutDay = {
  id: string;
  day_of_week: number;
  title: string | null;
  workout_items: WorkoutItem[] | null;
};

type WorkoutItem = {
  id: string;
  sets: number;
  reps: string;
  load: string | null;
  rest_seconds: number | null;
  notes: string | null;
  position: number;
  exercises:
    | { id: string; name: string; muscle_group: string | null }
    | { id: string; name: string; muscle_group: string | null }[]
    | null;
};

function WorkoutBlock({ workout, todayDay }: WorkoutBlockProps) {
  const days = (workout.workout_days ?? []).sort((a, b) => a.day_of_week - b.day_of_week);
  return (
    <Card className="bg-card border-white/5 p-5 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Dumbbell className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-lg truncate">{workout.title}</h2>
            {workout.goal && (
              <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                <Target className="size-3" />
                {workout.goal}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Faixa de dias da semana */}
      <div className="mt-5 flex items-center gap-1.5">
        {DAY_SHORT.map((letra, i) => {
          const temTreino = days.some((d) => d.day_of_week === i);
          const ehHoje = i === todayDay;
          return (
            <div
              key={i}
              className={`grid size-8 place-items-center rounded-lg text-xs font-bold transition-all ${
                temTreino
                  ? ehHoje
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/15 text-primary"
                  : "bg-secondary/30 text-muted-foreground/40"
              }`}
            >
              {letra}
            </div>
          );
        })}
      </div>

      <div className="mt-5 space-y-3">
        {days.map((day) => {
          const isToday = day.day_of_week === todayDay;
          return <DaySection key={day.id} day={day} isToday={isToday} workoutId={workout.id} />;
        })}
      </div>
    </Card>
  );
}

function DaySection({
  day,
  isToday,
  workoutId,
}: {
  day: WorkoutDay;
  isToday: boolean;
  workoutId: string;
}) {
  const items = (day.workout_items ?? []).sort((a, b) => a.position - b.position);
  return (
    <div
      className={`rounded-xl border ${
        isToday ? "border-primary/40 bg-primary/5" : "border-white/5 bg-background/30"
      } overflow-hidden`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{DAY_NAMES[day.day_of_week]}</span>
          {day.title && (
            <span className="text-xs text-muted-foreground">· {day.title}</span>
          )}
        </div>
        {isToday && (
          <Badge className="bg-primary/20 text-primary border-primary/40 gap-1">
            <Flame className="size-3" />
            Hoje
          </Badge>
        )}
      </div>
      <div className="divide-y divide-white/5">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4 italic">Sem exercícios nesse dia.</p>
        ) : (
          items.map((item) => {
            const ex = Array.isArray(item.exercises) ? item.exercises[0] : item.exercises;
            return (
              <div
                key={item.id}
                className="p-3.5 flex items-start justify-between gap-3 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  {ex?.id ? (
                    <Link
                      href={`/aluno/exercicio/${ex.id}`}
                      className="font-semibold text-sm hover:text-primary transition-colors"
                    >
                      {ex.name}
                    </Link>
                  ) : (
                    <div className="font-semibold text-sm">{ex?.name ?? "Exercício"}</div>
                  )}
                  {ex?.muscle_group && (
                    <div className="text-[11px] text-primary/80 uppercase tracking-wider font-semibold mt-0.5">
                      {ex.muscle_group}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    <span className="font-bold text-foreground">{item.sets}</span>
                    <span className="text-muted-foreground">×</span>{" "}
                    <span className="font-bold text-foreground">{item.reps}</span>
                    {item.load && ` · carga ${item.load}`}
                    {item.rest_seconds != null && ` · ${item.rest_seconds}s descanso`}
                  </div>
                  {item.notes && (
                    <div className="text-xs text-muted-foreground italic mt-1.5 border-l-2 border-primary/40 pl-2">
                      {item.notes}
                    </div>
                  )}
                </div>
                {isToday && <CheckInButton workoutId={workoutId} itemId={item.id} />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
