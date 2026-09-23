import { createClient } from "@/lib/supabase/server";
import { getTrainerScopeIds } from "@/lib/supabase/scope";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stagger, StaggerItem, AnimatedNumber } from "@/components/ui/stagger";
import { ExerciseMedia } from "@/components/ui/exercise-media";
import { resolveExerciseMediaUrl } from "@/lib/exercise-images";
import { startWorkoutAndRedirect, listWorkoutHistory } from "../actions";
import {
  PRIMARY_MUSCLE_LABEL,
  EQUIPMENT_LABEL,
} from "@/lib/workout";
import {
  WorkoutExecutionPreview,
  type ExecutionItem,
  type ExecutionStep,
} from "@/components/workouts/workout-execution-preview";
import { PlayCircle, Dumbbell, Target, ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ err?: string }>;
};

const DAY_NAMES = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export default async function WorkoutDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: workout } = await supabase
    .from("workouts")
    .select(
      "id, title, goal, student_id, created_at, student_profiles(full_name), workout_days(id, title, day_of_week, workout_items(id, sets, reps, load, position, exercises(id, name, muscle_group, equipment, image_url, animation_url, media_type)))",
    )
    .eq("id", id)
    .in("trainer_id", await getTrainerScopeIds(supabase, user.id))
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

  type ExerciseEmbedded = {
    id: string;
    name: string;
    muscle_group: string | null;
    equipment: string | null;
    image_url: string | null;
    animation_url: string | null;
    media_type: string | null;
  };

  type Item = {
    id: string;
    sets: number;
    reps: string;
    load: string | null;
    position: number;
    exercises: ExerciseEmbedded | ExerciseEmbedded[] | null;
  };

  type Day = {
    id: string;
    title: string | null;
    day_of_week: number;
    workout_items: Item[];
  };

  const days = ((workout.workout_days ?? []) as unknown as Day[]).sort(
    (a, b) => a.day_of_week - b.day_of_week,
  );

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

  // Resolve URLs de mídia pros itens do plano (server-side).
  const itemMedia: Record<string, string | null> = {};
  for (const d of days) {
    for (const it of d.workout_items ?? []) {
      const ex = Array.isArray(it.exercises) ? it.exercises[0] : it.exercises;
      if (!ex || itemMedia[ex.id] !== undefined) continue;
      const mediaUrl = resolveExerciseMediaUrl(
        ex.image_url ?? null,
        ex.name,
      );
      itemMedia[ex.id] = mediaUrl;
    }
  }

  // Histórico recente (últimas 5 sessões).
  const history = await listWorkoutHistory({
    rangeDays: 365,
    limit: 5,
  });
  const ownHistory = history.ok
    ? history.data.filter((h) => h.workoutId === id)
    : [];

  return (
    <div className="min-h-screen pb-12">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center gap-3">
          <Link
            href="/app/workouts"
            className="text-foreground/70 hover:text-foreground"
          >
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

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {sp?.err && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            Não foi possível iniciar o treino ({sp.err}). Tente de novo.
          </div>
        )}

        <Stagger className="space-y-6" delay={0.05}>
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
                  <Mini
                    label="Treino"
                    valueText={studentName ? "Atribuído" : "Template"}
                  />
                </div>

                {studentName && (
                  <form action={startWorkoutAndRedirect} className="mt-5">
                    <input type="hidden" name="workout_id" value={workout.id} />
                    <input
                      type="hidden"
                      name="student_id"
                      value={workout.student_id ?? ""}
                    />
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full font-semibold"
                    >
                      <PlayCircle className="size-5" />
                      Iniciar treino agora
                    </Button>
                    <p className="mt-2 text-center text-[11px] text-muted-foreground">
                      Cria uma sessão e abre o runner.
                    </p>
                  </form>
                )}

                {!studentName && (
                  <p className="mt-5 rounded-lg border border-dashed border-white/10 bg-background/40 p-3 text-center text-[12px] text-muted-foreground">
                    <Dumbbell className="mr-1 inline size-3.5" />
                    Atribua este treino a um aluno pra conseguir iniciar.
                  </p>
                )}
              </div>
            </Card>
          </StaggerItem>

          {days.length === 0 ? (
            <StaggerItem>
              <Card className="bg-card border-dashed border-white/10 p-8 text-center">
                <Dumbbell className="size-6 mx-auto text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Esse treino ainda não tem dias configurados.
                </p>
              </Card>
            </StaggerItem>
          ) : (
            <>
              <StaggerItem>
                <WorkoutExecutionPreview
                  steps={days.map<ExecutionStep>((d) => ({
                    dayId: d.id,
                    dayTitle: d.title,
                    dayOfWeek: d.day_of_week,
                    items: (d.workout_items ?? [])
                      .slice()
                      .sort(
                        (a, b) => (a.position ?? 0) - (b.position ?? 0),
                      )
                      .map<ExecutionItem | null>((it) => {
                        const ex = Array.isArray(it.exercises)
                          ? it.exercises[0]
                          : it.exercises;
                        if (!ex) return null;
                        return {
                          id: it.id,
                          name: ex.name,
                          muscle_group: ex.muscle_group ?? null,
                          equipment: ex.equipment ?? null,
                          image_url: ex.image_url ?? null,
                          animation_url: ex.animation_url ?? null,
                          media_type:
                            (ex.media_type as
                              | "gif"
                              | "video"
                              | "svg"
                              | null) ?? null,
                          sets: it.sets,
                          reps: it.reps,
                          load: it.load,
                          position: it.position,
                        };
                      })
                      .filter((v): v is ExecutionItem => v !== null),
                  }))}
                  resolvedUrls={itemMedia}
                />
              </StaggerItem>
              {/* lista detalhada por dia, mantida como secundária */}
              {days.map((day) => (
              <StaggerItem key={day.id}>
                <Card className="bg-card/80 border-white/10 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs uppercase tracking-wider font-bold text-primary bg-primary/15 px-2 py-1 rounded">
                      {DAY_NAMES[day.day_of_week]}
                    </span>
                    {day.title && (
                      <span className="font-semibold">{day.title}</span>
                    )}
                  </div>

                  {day.workout_items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem exercícios.</p>
                  ) : (
                    <ol className="space-y-2">
                      {day.workout_items
                        .sort(
                          (a, b) => (a.position ?? 0) - (b.position ?? 0),
                        )
                        .map((item, idx) => {
                          const ex = Array.isArray(item.exercises)
                            ? item.exercises[0]
                            : item.exercises;
                          if (!ex) return null;
                          const mediaUrl = itemMedia[ex.id] ?? null;
                          return (
                            <li
                              key={item.id}
                              className="flex items-center gap-3 rounded-lg border border-white/5 bg-background/40 px-3.5 py-2.5 hover:border-primary/30 transition-colors"
                            >
                              <ExerciseMedia
                                exercise={{
                                  id: ex.id,
                                  name: ex.name,
                                  muscle_group: ex.muscle_group,
                                  image_url: ex.image_url,
                                  animation_url: ex.animation_url,
                                  media_type:
                                    (ex.media_type as
                                      | "gif"
                                      | "video"
                                      | "svg"
                                      | null) ?? null,
                                  category: null,
                                }}
                                resolvedUrl={mediaUrl}
                                size="md"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold truncate">
                                  {ex.name}
                                </div>
                                <div className="text-[11px] text-primary/80 uppercase tracking-wider font-semibold mt-0.5 truncate">
                                  {PRIMARY_MUSCLE_LABEL[
                                    (ex.muscle_group ?? "outro") as keyof typeof PRIMARY_MUSCLE_LABEL
                                  ] ?? ex.muscle_group}
                                  {ex.equipment
                                    ? ` · ${EQUIPMENT_LABEL[ex.equipment as keyof typeof EQUIPMENT_LABEL] ?? ex.equipment}`
                                    : ""}
                                </div>
                              </div>
                              <div className="text-sm shrink-0 text-right">
                                <span className="font-bold text-foreground">
                                  {item.sets}
                                </span>
                                <span className="text-muted-foreground mx-0.5">
                                  ×
                                </span>
                                <span className="font-bold text-foreground">
                                  {item.reps}
                                </span>
                                {item.load ? (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    · {item.load}
                                  </span>
                                ) : null}
                              </div>
                              <span
                                className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary text-xs font-bold shrink-0"
                                aria-hidden
                              >
                                {idx + 1}
                              </span>
                            </li>
                          );
                        })}
                    </ol>
                  )}
                </Card>
              </StaggerItem>
            ))}
          </>
          )}

          {ownHistory.length > 0 && (
            <StaggerItem>
              <Card className="bg-card/80 border-white/10 p-5">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Histórico recente
                </h3>
                <ul className="divide-y divide-white/5">
                  {ownHistory.map((h) => (
                    <li key={h.sessionId}>
                      <Link
                        href={`/app/workouts/historico/${h.sessionId}`}
                        className="flex items-center justify-between gap-3 py-2.5 hover:bg-white/[0.02] -mx-2 px-2 rounded-md"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">
                            {new Date(h.date).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "long",
                            })}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {h.setCount} séries
                            {h.durationMin
                              ? ` · ${h.durationMin} min`
                              : ""}
                            {h.userRpe
                              ? ` · RPE ${h.userRpe}`
                              : ""}
                          </p>
                        </div>
                        <ChevronRight
                          className="size-4 text-muted-foreground shrink-0"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
                {ownHistory.length >= 5 && (
                  <Link
                    href={`/app/workouts/historico?workout=${workout.id}`}
                    className="mt-3 inline-block text-xs text-primary hover:underline"
                  >
                    Ver tudo →
                  </Link>
                )}
              </Card>
            </StaggerItem>
          )}
        </Stagger>
      </div>
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
