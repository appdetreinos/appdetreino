import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkoutRunner } from "@/components/workouts/workout-runner";
import { resolveExerciseMediaUrl } from "@/lib/exercise-images";
import type { ExerciseSet } from "@/lib/types/workout";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string; sessionId: string }>;
};

type ExerciseEmbedded = {
  id: string;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  image_url: string | null;
  animation_url: string | null;
  media_type: string | null;
};

export default async function RunnerPage({ params }: PageProps) {
  const { id, sessionId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 1) Puxa session + workout + treino mestre
  const { data: sessionRow } = await supabase
    .from("workout_sessions")
    .select(
      "id, workout_id, student_id, date, status, started_at, completed_at, workouts(id, title, goal, trainer_id, workout_days(id, day_of_week, title, workout_items(id, sets, reps, load, position, exercises(id, name, muscle_group, equipment, image_url, animation_url, media_type)))), student_profiles(full_name)",
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (!sessionRow) {
    redirect(`/app/workouts/${id}?err=session_not_found`);
  }

  type Day = {
    id: string;
    day_of_week: number;
    title: string | null;
    workout_items: Array<{
      id: string;
      sets: number;
      reps: string;
      load: string | null;
      position: number;
      exercises: ExerciseEmbedded | ExerciseEmbedded[] | null;
    }>;
  };

  type WorkoutMaster = {
    id: string;
    title: string;
    goal: string | null;
    trainer_id: string;
    workout_days: Day[];
  };

  type SessionPayload = {
    workouts: WorkoutMaster | WorkoutMaster[] | null;
    student_profiles:
      | { full_name?: string }
      | Array<{ full_name?: string }>
      | null;
    status: string;
    started_at: string | null;
  };

  const session = sessionRow as unknown as SessionPayload;

  // 2) Validação "pending" — se já foi finalizada/cancelada, leva pro histórico.
  if (session.status !== "pending") {
    redirect(`/app/workouts/historico/${sessionId}`);
  }

  const workoutObj = Array.isArray(session.workouts)
    ? session.workouts[0]
    : session.workouts;
  if (!workoutObj) redirect(`/app/workouts/${id}?err=workout_missing`);
  const workoutDays: Day[] = Array.isArray(workoutObj.workout_days)
    ? workoutObj.workout_days
    : [];

  const s = session.student_profiles ?? null;
  const studentName: string | null = !s
    ? null
    : Array.isArray(s)
      ? s[0]?.full_name ?? null
      : s.full_name ?? null;

  // 4) Plan exercises: escolhe o dia de hoje (se bater); senão, o 1º dia.
  const today = new Date();
  // JS getDay: 0=domingo... igual ao modelo.
  const targetDay = today.getDay();
  const dayMatch: Day | undefined =
    workoutDays.find((d: Day) => d.day_of_week === targetDay) ?? workoutDays[0];

  type PlanExercise = {
    exerciseId: string;
    name: string;
    muscle_group: string | null;
    equipment: string | null;
    image_url: string | null;
    animation_url: string | null;
    media_type: "gif" | "video" | "svg" | null;
    setsPlanned: number;
    reps: string;
    load: string | null;
  };

  const planExercises: PlanExercise[] = (dayMatch?.workout_items ?? [])
    .slice()
    .sort(
      (a: { position?: number }, b: { position?: number }) =>
        (a.position ?? 0) - (b.position ?? 0),
    )
    .map((item: {
      sets: number;
      reps: string;
      load: string | null;
      exercises: ExerciseEmbedded | ExerciseEmbedded[] | null;
    }) => {
      const ex = Array.isArray(item.exercises)
        ? item.exercises[0]
        : item.exercises;
      if (!ex) return null;
      return {
        exerciseId: ex.id,
        name: ex.name,
        muscle_group: ex.muscle_group ?? null,
        equipment: ex.equipment ?? null,
        image_url: ex.image_url ?? null,
        animation_url: ex.animation_url ?? null,
        media_type: (ex.media_type as "gif" | "video" | "svg" | null) ?? null,
        setsPlanned: item.sets ?? 3,
        reps: item.reps ?? "10-12",
        load: item.load ?? null,
      } satisfies PlanExercise;
    })
    .filter((v: PlanExercise | null): v is PlanExercise => v !== null);

  // 5) Library de exercícios (pra picker avulso)
  const { data: libRows } = await supabase
    .from("exercises")
    .select(
      "id, name, muscle_group, equipment, image_url, animation_url, media_type",
    )
    .or(`trainer_id.is.null,trainer_id.eq.${user.id}`)
    .limit(500);

  const library = (libRows ?? []).map((e) => ({
    exerciseId: e.id,
    name: e.name,
    muscle_group: (e.muscle_group as string | null) ?? null,
    equipment: (e.equipment as string | null) ?? null,
    image_url: (e.image_url as string | null) ?? null,
    animation_url: (e.animation_url as string | null) ?? null,
    media_type: (e.media_type as "gif" | "video" | "svg" | null) ?? null,
  }));

  // 6) Resolve URLs
  const resolvedUrls: Record<string, string | null> = {};
  for (const p of planExercises) {
    if (resolvedUrls[p.exerciseId] === undefined) {
      resolvedUrls[p.exerciseId] = resolveExerciseMediaUrl(
        p.image_url,
        p.name,
        p.animation_url ?? null,
      );
    }
  }
  for (const l of library) {
    if (resolvedUrls[l.exerciseId] === undefined) {
      resolvedUrls[l.exerciseId] = resolveExerciseMediaUrl(
        l.image_url,
        l.name,
        l.animation_url ?? null,
      );
    }
  }

  // 7) Séries já registradas na session
  const { data: setRows } = await supabase
    .from("exercise_sets")
    .select(
      "id, workout_session_id, exercise_id, exercise_name, set_number, reps, load_kg, rpe, discomfort, notes, created_at",
    )
    .eq("workout_session_id", sessionId)
    .order("created_at", { ascending: true });

  const initialSets: ExerciseSet[] = (setRows ?? []) as ExerciseSet[];

  return (
    <WorkoutRunner
      sessionId={sessionId}
      workoutId={id}
      workoutTitle={workoutObj.title}
      studentName={studentName}
      startedAt={
        session.started_at ?? new Date().toISOString()
      }
      initialSets={initialSets}
      planExercises={planExercises}
      library={library}
      resolvedUrls={resolvedUrls}
    />
  );
}
