import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { CheckInButton } from "./check-in-button";
import { Dumbbell } from "lucide-react";

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default async function TreinosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Lista workouts atribuídos ao aluno + dias + itens + exercícios
  const { data: workouts, error } = await supabase
    .from("workouts")
    .select(
      `id, title, goal,
       workout_days:workout_days(
         id, day_of_week, title,
         workout_items:workout_items(
           id, sets, reps, load, rest_seconds, notes, position,
           exercises:exercise_id(name, muscle_group)
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

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Meus treinos</h1>
        <p className="text-sm text-muted-foreground">
          {workouts?.length ?? 0} treino{workouts?.length === 1 ? "" : "s"} atribuído
          {workouts?.length === 1 ? "" : "s"}
        </p>
      </header>

      {(workouts ?? []).length === 0 ? (
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
        (workouts ?? []).map((w) => (
          <WorkoutBlock key={w.id} workout={w} todayDay={todayDay} />
        ))
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
  exercises: { name: string; muscle_group: string | null } | { name: string; muscle_group: string | null }[] | null;
};

function WorkoutBlock({ workout, todayDay }: WorkoutBlockProps) {
  const days = (workout.workout_days ?? []).sort((a, b) => a.day_of_week - b.day_of_week);
  return (
    <Card className="bg-card border-white/5 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-bold text-lg">{workout.title}</h2>
        </div>
        {workout.goal && (
          <span className="text-xs uppercase tracking-wider font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
            {workout.goal}
          </span>
        )}
      </div>

      <div className="mt-5 space-y-4">
        {days.map((day) => {
          const isToday = day.day_of_week === todayDay;
          return (
            <DaySection key={day.id} day={day} isToday={isToday} workoutId={workout.id} />
          );
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
    <div className={`rounded-lg border ${isToday ? "border-primary/40 bg-primary/5" : "border-white/5"}`}>
      <div className="flex items-center justify-between p-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{DAY_NAMES[day.day_of_week]}</span>
          {day.title && (
            <span className="text-xs text-muted-foreground">· {day.title}</span>
          )}
        </div>
        {isToday && (
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Hoje</span>
        )}
      </div>
      <div className="divide-y divide-white/5">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground p-3 italic">Sem exercícios nesse dia.</p>
        ) : (
          items.map((item) => {
            const ex = Array.isArray(item.exercises) ? item.exercises[0] : item.exercises;
            return (
              <div key={item.id} className="p-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">
                    {ex?.name ?? "Exercício"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {item.sets}x {item.reps}
                    {item.load && ` · ${item.load}`}
                    {item.rest_seconds != null && ` · ${item.rest_seconds}s descanso`}
                  </div>
                  {item.notes && (
                    <div className="text-xs text-muted-foreground italic mt-1">{item.notes}</div>
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
