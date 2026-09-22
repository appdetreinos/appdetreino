import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { safeLog } from "@/lib/log/safe";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";

/**
 * Estratégia de distribuição de exercícios pelos dias:
 * - Se trainer marcou 1 dia → todos os exercícios nesse dia
 * - Se trainer marcou N dias → divide em rodízio round-robin (ex[0] dia[0], ex[1] dia[1], ...)
 *   assim um treino Seg/Qua/Sex com 9 exercícios vira 3+3+3.
 * - Trainer pode editar/refinar depois no detalhe do treino.
 */

const exerciseSchema = z.object({
  name: z.string().min(1).max(120),
  sets: z.number().int().min(1).max(20),
  reps: z.string().min(1).max(40),
  load: z.string().max(40).nullable().optional(),
});

const bodySchema = z
  .object({
    title: z.string().min(1).max(120),
    goal: z.string().max(500).nullable().optional(),
    student_id: z.string().uuid().nullable().optional(),
    days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    exercises: z.array(exerciseSchema).min(1).max(50),
    // (opcional) distribuição explícita por dia — ex: [3, 0, 2, 0, 4, 0, 0] = Seg:3, Qua:2, Sex:4
    per_day: z.array(z.number().int().min(0).max(20)).optional(),
  })
  .strict();

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  const { title, goal, student_id, days, exercises } = body.data;

  // 1. Cria o workout
  const { data: workout, error: workoutError } = await auth.supabase
    .from("workouts")
    .insert({
      trainer_id: auth.user.id,
      student_id: student_id ?? null,
      title,
      goal: goal ?? null,
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

  // 2. Cria os workout_days (1 por dia selecionado, na ordem do form)
  const daysToInsert = days.map((d, idx) => ({
    workout_id: workout.id,
    day_of_week: d,
    title: `Dia ${idx + 1}`,
  }));
  const { data: createdDays, error: daysError } = await auth.supabase
    .from("workout_days")
    .insert(daysToInsert)
    .select("id, day_of_week")
    .order("day_of_week", { ascending: true });

  if (daysError || !createdDays || createdDays.length === 0) {
    safeLog.error("[workouts] workout_days insert failed", daysError?.message);
    return NextResponse.json(
      { ok: false, error: daysError?.message ?? "Erro ao criar dias" },
      { status: 500 },
    );
  }

  // 3. Cria os exercises (1 por nome) — trainer-scoped
  const exerciseRows = exercises.map((ex) => ({
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

  // 4. Distribui exercícios pelos dias
  // - Se per_day explícito foi enviado, usa ele (deve bater com days.length)
  // - Senão: round-robin (ex[0]→day[0], ex[1]→day[1], ..., ex[N]→day[N % len])
  const perDay = body.data.per_day;
  const dayBuckets: number[] = perDay && perDay.length === createdDays.length
    ? distributeByPerDay(exercises.length, perDay)
    : distributeRoundRobin(exercises.length, createdDays.length);

  const items: Array<{
    workout_day_id: string;
    position: number;
    exercise_id: string;
    sets: number;
    reps: string;
    load: string | null;
  }> = [];

  let exerciseIdx = 0;
  for (let dayIdx = 0; dayIdx < createdDays.length; dayIdx++) {
    const dayId = createdDays[dayIdx].id;
    const count = dayBuckets[dayIdx];
    for (let pos = 0; pos < count && exerciseIdx < exercises.length; pos++) {
      items.push({
        workout_day_id: dayId,
        position: pos,
        exercise_id: createdExercises[exerciseIdx].id,
        sets: exercises[exerciseIdx].sets,
        reps: exercises[exerciseIdx].reps,
        load: exercises[exerciseIdx].load ?? null,
      });
      exerciseIdx++;
    }
  }

  // Se sobraram exercícios (per_day curto), joga tudo no último dia
  if (exerciseIdx < exercises.length) {
    const lastDay = createdDays[createdDays.length - 1].id;
    let pos = items.filter((i) => i.workout_day_id === lastDay).length;
    while (exerciseIdx < exercises.length) {
      items.push({
        workout_day_id: lastDay,
        position: pos++,
        exercise_id: createdExercises[exerciseIdx].id,
        sets: exercises[exerciseIdx].sets,
        reps: exercises[exerciseIdx].reps,
        load: exercises[exerciseIdx].load ?? null,
      });
      exerciseIdx++;
    }
  }

  const { error: itemsError } = await auth.supabase
    .from("workout_items")
    .insert(items);

  if (itemsError) {
    safeLog.error("[workouts] workout_items insert failed", itemsError?.message);
    return NextResponse.json(
      { ok: false, error: itemsError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: workout.id });
}

/**
 * Distribui N exercícios em D dias, retornando bucket sizes [d0_count, d1_count, ...].
 * Ex: 9 ex / 3 dias → [3,3,3]; 7 ex / 3 dias → [3,2,2]
 */
function distributeRoundRobin(totalExercises: number, numDays: number): number[] {
  const buckets = new Array(numDays).fill(0);
  for (let i = 0; i < totalExercises; i++) {
    buckets[i % numDays]++;
  }
  return buckets;
}

/**
 * Usa a distribuição explícita por dia do form. Se algum bucket for 0 ou soma < total,
 * completa o resto nos primeiros dias que ainda têm espaço.
 */
function distributeByPerDay(totalExercises: number, perDay: number[]): number[] {
  const buckets = perDay.slice();
  const sum = buckets.reduce((a, b) => a + b, 0);
  if (sum === totalExercises) return buckets;
  if (sum > totalExercises) {
    // trunca
    let remaining = totalExercises;
    return buckets.map((n) => {
      const take = Math.min(n, remaining);
      remaining -= take;
      return take;
    });
  }
  // sum < total → completa no último dia
  buckets[buckets.length - 1] += totalExercises - sum;
  return buckets;
}
