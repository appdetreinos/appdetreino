import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { safeLog } from "@/lib/log/safe";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";

const bodySchema = z
  .object({
    title: z.string().min(1).max(120),
    goal: z.string().max(500).nullable().optional(),
    student_id: z.string().uuid().nullable().optional(),
    days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    exercises: z
      .array(
        z.object({
          name: z.string().min(1).max(120),
          sets: z.number().int().min(1).max(20),
          reps: z.string().min(1).max(40),
          load: z.string().max(40).nullable().optional(),
        }),
      )
      .min(1)
      .max(50),
  })
  .strict();

/**
 * POST /api/me/workouts
 *
 * Trainer cria um treino com N dias e M exercícios.
 * Estratégia: cria workout + workout_days (1 por dia) + workout_items (1 por exercício, no primeiro dia).
 * Pra MVP fica simples — todos os exercícios no primeiro dia. Trainer pode editar depois.
 * Guard: CSRF + auth.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  // 1. Cria o workout
  const { data: workout, error: workoutError } = await auth.supabase
    .from("workouts")
    .insert({
      trainer_id: auth.user.id,
      student_id: body.data.student_id ?? null,
      title: body.data.title,
      goal: body.data.goal ?? null,
    })
    .select("id")
    .single();

  if (workoutError || !workout) {
    safeLog.error("[workouts] insert failed", workoutError?.message);
    return NextResponse.json(
      { ok: false, error: workoutError?.message ?? "Erro ao criar treino" },
      { status: 500 },
    );
  }

  // 2. Cria os workout_days (1 por dia selecionado)
  const daysToInsert = body.data.days.map((d, idx) => ({
    workout_id: workout.id,
    day_of_week: d,
    title: `Dia ${idx + 1}`,
  }));
  const { data: createdDays, error: daysError } = await auth.supabase
    .from("workout_days")
    .insert(daysToInsert)
    .select("id, day_of_week");

  if (daysError || !createdDays || createdDays.length === 0) {
    safeLog.error("[workouts] workout_days insert failed", daysError?.message);
    return NextResponse.json(
      { ok: false, error: daysError?.message ?? "Erro ao criar dias" },
      { status: 500 },
    );
  }

  // 3. Insere os exercícios no PRIMEIRO dia (pra MVP — UX avisa que estão no dia 1)
  const firstDay = createdDays.sort((a, b) => a.day_of_week - b.day_of_week)[0];
  const items = body.data.exercises.map((ex, idx) => ({
    workout_day_id: firstDay.id,
    position: idx,
    exercise_id: null, // vamos inserir o exercise direto via tabela exercises; por ora deixa null e usa name
    sets: ex.sets,
    reps: ex.reps,
    load: ex.load ?? null,
  }));

  // Como workout_items.exercise_id é NOT NULL e FK → exercises.id, vamos
  // primeiro criar entries na tabela exercises (sem FK de trainer pra ficar
  // simples) e referenciar.
  const exerciseRows = body.data.exercises.map((ex) => ({
    trainer_id: auth.user.id,
    name: ex.name,
  }));
  const { data: createdExercises, error: exError } = await auth.supabase
    .from("exercises")
    .insert(exerciseRows)
    .select("id, name");

  if (exError || !createdExercises) {
    safeLog.error("[workouts] exercises insert failed", exError?.message);
    return NextResponse.json(
      { ok: false, error: exError?.message ?? "Erro ao criar exercícios" },
      { status: 500 },
    );
  }

  const itemsWithRefs = items.map((item, idx) => ({
    ...item,
    exercise_id: createdExercises[idx].id,
  }));

  const { error: itemsError } = await auth.supabase
    .from("workout_items")
    .insert(itemsWithRefs);

  if (itemsError) {
    safeLog.error("[workouts] workout_items insert failed", itemsError?.message);
    return NextResponse.json(
      { ok: false, error: itemsError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: workout.id });
}
