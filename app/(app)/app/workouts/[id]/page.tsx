import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { ArrowLeft, Dumbbell, Target } from "lucide-react";
import Link from "next/link";
import { Stagger, StaggerItem, AnimatedNumber } from "@/components/ui/stagger";

type PageProps = {
  params: Promise<{ id: string }>;
};

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default async function WorkoutDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: workout } = await supabase
    .from("workouts")
    .select(
      "id, title, goal, student_id, created_at, student_profiles(full_name), workout_days(id, title, day_of_week, workout_items(id, sets, reps, load, position, exercises(name, muscle_group)))"
    )
    .eq("id", id)
    .eq("trainer_id", user.id)
    .maybeSingle();

  if (!workout) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold">Treino não encontrado</h1>
        <Link
          href="/app/workouts"
          className="text-sm text-muted-foreground hover:text-foreground mt-2 inline-block"
        >
          ← Voltar pra lista
        </Link>
      </div>
    );
  }

  const days = ((workout.workout_days ?? []) as unknown as Array<{
    id: string;
    title: string | null;
    day_of_week: number;
    workout_items: Array<{
      id: string;
      sets: number;
      reps: string;
      load: string | null;
      position: number;
      exercises:
        | { name: string; muscle_group: string | null }
        | { name: string; muscle_group: string | null }[]
        | null;
    }>;
  }>).sort((a, b) => a.day_of_week - b.day_of_week);

  const totalExercicios = days.reduce(
    (acc, d) => acc + (d.workout_items?.length ?? 0),
    0,
  );
  const studentName = (() => {
    if (!workout.student_profiles) return null;
    const s = Array.isArray(workout.student_profiles)
      ? workout.student_profiles[0]
      : workout.student_profiles;
    return s?.full_name ?? null;
  })();

  return (
    <div className="min-h-screen pb-12">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center gap-3">
          <Link href="/app/workouts" className="text-foreground/70 hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-xl font-bold truncate">{workout.title}</h1>
          {studentName && (
            <Badge variant="outline" className="border-primary/30 text-primary shrink-0">
              {studentName}
            </Badge>
          )}
        </div>
      </header>

      <Stagger className="p-6 max-w-3xl mx-auto space-y-6" delay={0.05}>
        <StaggerItem>
          <Card className="bg-card border-white/5 p-5 relative overflow-hidden">
            <div
              className="absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent pointer-events-none"
              aria-hidden
            />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-xl">{workout.title}</h2>
                  {workout.goal && (
                    <div className="flex items-center gap-1 mt-1.5 text-sm text-muted-foreground">
                      <Target className="size-3.5" />
                      {workout.goal}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-white/5">
                <Mini label="Dias" value={days.length} />
                <Mini label="Exercícios" value={totalExercicios} />
                <Mini label="Treino" valueText={studentName ? "Atribuído" : "Template"} />
              </div>
            </div>
          </Card>
        </StaggerItem>

        {days.length === 0 && (
          <StaggerItem>
            <Card className="bg-card border-dashed border-white/10 p-8 text-center">
              <Dumbbell className="size-6 mx-auto text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Esse treino ainda não tem dias configurados.
              </p>
            </Card>
          </StaggerItem>
        )}

        {days.map((day) => (
          <StaggerItem key={day.id}>
            <Card className="bg-card/80 border-white/10 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs uppercase tracking-wider font-bold text-primary bg-primary/15 px-2 py-1 rounded">
                  {DAY_NAMES[day.day_of_week]}
                </span>
                {day.title && <span className="font-semibold">{day.title}</span>}
              </div>

              {day.workout_items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem exercícios.</p>
              ) : (
                <ol className="space-y-2">
                  {day.workout_items
                    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                    .map((item, idx) => {
                      const ex = Array.isArray(item.exercises)
                        ? item.exercises[0]
                        : item.exercises;
                      return (
                        <li
                          key={item.id}
                          className="flex items-center justify-between rounded-lg border border-white/5 bg-background/40 px-3.5 py-2.5 hover:border-primary/30 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary text-xs font-bold shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="font-semibold truncate">
                                {ex?.name ?? "—"}
                              </div>
                              {ex?.muscle_group && (
                                <div className="text-[11px] text-primary/80 uppercase tracking-wider font-semibold mt-0.5">
                                  {ex.muscle_group}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-sm shrink-0 text-right">
                            <span className="font-bold text-foreground">
                              {item.sets}
                            </span>
                            <span className="text-muted-foreground mx-0.5">×</span>
                            <span className="font-bold text-foreground">{item.reps}</span>
                            {item.load ? (
                              <span className="text-xs text-muted-foreground ml-2">
                                · {item.load}
                              </span>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                </ol>
              )}
            </Card>
          </StaggerItem>
        ))}

        <StaggerItem>
          <div className="flex justify-end">
            <ButtonLink href="/app/workouts" variant="outline">
              Voltar pra lista
            </ButtonLink>
          </div>
        </StaggerItem>
      </Stagger>
    </div>
  );
}

function Mini({
  label,
  value,
  valueText,
}: {
  label: string;
  value?: number;
  valueText?: string;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-extrabold">
        {valueText ?? <AnimatedNumber value={value ?? 0} />}
      </div>
    </div>
  );
}
