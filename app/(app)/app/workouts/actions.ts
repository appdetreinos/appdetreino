"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { unstable_rethrow } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeLog } from "@/lib/log/safe";
import type { ExerciseSet, WorkoutSession } from "@/lib/types/workout";

/**
 * Server actions do módulo de treinos.
 *
 * Cobrem o runner (iniciar/finalizar/cancelar sessão + log de séries)
 * e a base do histórico (listar sessões, detalhes, progressão por
 * exercício).
 *
 * Segurança:
 *   - CSRF: protegido automaticamente pelo Next.js para Server Actions
 *     (Origin/Referer checks nativo do framework).
 *   - Auth: cada action valida o cookie Supabase.
 *   - Autorização: políticas RLS do Postgres (trainer vê/edita só
 *     alunos próprios; aluno só as próprias sessões).
 *   - Inputs validados com Zod.
 */

/* =========================================================================
   Erros tipados (a action captura e devolve string user-friendly).
   ========================================================================= */

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function fail<T>(error: string): ActionResult<T> {
  return { ok: false, error };
}

/* =========================================================================
   Helpers internos
   ========================================================================= */

async function getAuthContext(): Promise<
  ActionResult<{
    user: { id: string };
    supabase: Awaited<ReturnType<typeof createClient>>;
  }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("unauthenticated");
  return { ok: true, data: { user: { id: user.id }, supabase } };
}

/**
 * +50 XP por treino concluído + streak diário.
 * Streak: última ação ontem → +1; hoje → mantém; senão → recomeça em 1.
 */
async function awardWorkoutXp(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
): Promise<void> {
  const { data: sess } = await supabase
    .from("workout_sessions")
    .select("student_id")
    .eq("id", sessionId)
    .maybeSingle();
  const studentId = (sess as { student_id?: string } | null)?.student_id;
  if (!studentId) return;

  const { data: sp } = await supabase
    .from("student_profiles")
    .select("xp_total, streak_current, streak_last_action_at")
    .eq("user_id", studentId)
    .maybeSingle();
  if (!sp) return;
  const row = sp as { xp_total: number | null; streak_current: number | null; streak_last_action_at: string | null };

  const today = new Date().toISOString().slice(0, 10);
  const last = (row.streak_last_action_at ?? "").slice(0, 10);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  let streak = 1;
  if (last === today) streak = row.streak_current ?? 1;
  else if (last === yesterday) streak = (row.streak_current ?? 0) + 1;

  const bonus = Math.min((streak - 1) * 5, 50); // sequência paga até +50
  await supabase
    .from("student_profiles")
    .update({
      xp_total: (row.xp_total ?? 0) + 50 + bonus,
      streak_current: streak,
      streak_last_action_at: new Date().toISOString(),
    })
    .eq("user_id", studentId);
}

/**
 * Badges automáticas: 1/10/50 treinos + streak 7.
 * Roda como o próprio aluno (policy student_badges_student_insert).
 */
async function awardBadges(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
): Promise<void> {
  const { data: sess } = await supabase
    .from("workout_sessions")
    .select("student_id")
    .eq("id", sessionId)
    .maybeSingle();
  const studentId = (sess as { student_id?: string } | null)?.student_id;
  if (!studentId) return;

  const [{ count: doneCount }, { data: sp }, { data: owned }] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("status", "done"),
    supabase
      .from("student_profiles")
      .select("streak_current")
      .eq("user_id", studentId)
      .maybeSingle(),
    supabase.from("student_badges").select("badge_id").eq("student_id", studentId),
  ]);

  const done = doneCount ?? 0;
  const streak = (sp as { streak_current?: number } | null)?.streak_current ?? 0;
  const wanted: string[] = [];
  if (done >= 1) wanted.push("primeiro-treino");
  if (done >= 10) wanted.push("ritmo-10");
  if (done >= 50) wanted.push("meio-centena");
  if (streak >= 7) wanted.push("chama-acesa");
  if (wanted.length === 0) return;

  const { data: badges } = await supabase
    .from("badges")
    .select("id, slug")
    .in("slug", wanted);
  const ownedIds = new Set(((owned ?? []) as Array<{ badge_id: string }>).map((o) => o.badge_id));
  const fresh = ((badges ?? []) as Array<{ id: string; slug: string }>).filter((b) => !ownedIds.has(b.id));
  if (fresh.length === 0) return;

  await supabase.from("student_badges").upsert(
    fresh.map((b) => ({ student_id: studentId, badge_id: b.id })),
    { onConflict: "student_id,badge_id" },
  );
}
async function bumpChallengeProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
): Promise<void> {
  const { data: sess } = await supabase
    .from("workout_sessions")
    .select("student_id")
    .eq("id", sessionId)
    .maybeSingle();
  const studentId = (sess as { student_id?: string } | null)?.student_id;
  if (!studentId) return;

  const { data: parts } = await supabase
    .from("challenge_participants")
    .select("challenge_id, progress")
    .eq("student_id", studentId);
  if (!parts || (parts as unknown[]).length === 0) return;

  const now = new Date().toISOString();
  for (const p of parts as Array<{ challenge_id: string; progress: number }>) {
    const { data: ch } = await supabase
      .from("challenges")
      .select("id")
      .eq("id", p.challenge_id)
      .lte("starts_at", now)
      .gte("ends_at", now)
      .maybeSingle();
    if (!ch) continue;
    await supabase
      .from("challenge_participants")
      .update({ progress: (p.progress ?? 0) + 1 })
      .eq("challenge_id", p.challenge_id)
      .eq("student_id", studentId);
  }
}

/* =========================================================================
   startWorkoutSession
   ========================================================================= */

const startSessionSchema = z.object({
  workout_id: z.string().uuid(),
  student_id: z.string().uuid().optional().nullable(),
});

export async function startWorkoutSession(
  raw: z.infer<typeof startSessionSchema>,
): Promise<ActionResult<{ sessionId: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx.ok) return ctx;

    const parsed = startSessionSchema.safeParse(raw);
    if (!parsed.success) return fail("validation_failed");

    const { workout_id, student_id } = parsed.data;

    // Confirma que o treino pertence ao trainer (RLS já faria isso,
    // mas queremos devolver um erro legível).
    const { data: workout, error: workoutErr } = await ctx.data.supabase
      .from("workouts")
      .select("id, student_id, trainer_id")
      .eq("id", workout_id)
      .single();

    if (workoutErr || !workout) return fail("workout_not_found");

    const targetStudentId =
      student_id ??
      ((workout as { student_id?: string | null }).student_id ?? null);

    if (!targetStudentId) {
      // É um template. Trainer precisa dizer pra qual aluno.
      return fail("student_required_for_template");
    }

    // Cria sessão pendente (não UPSERT — uma nova execução por iniciar).
    const today = new Date();
    const yyyy = today.getUTCFullYear();
    const mm = String(today.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(today.getUTCDate()).padStart(2, "0");
    const todayIso = `${yyyy}-${mm}-${dd}`;

    const { data: session, error: insertErr } = await ctx.data.supabase
      .from("workout_sessions")
      .insert({
        workout_id,
        student_id: targetStudentId,
        date: todayIso,
        status: "pending",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertErr || !session) {
      safeLog.warn("startWorkoutSession insert error", {
        error: insertErr?.message,
      });
      return fail("could_not_start");
    }

    return { ok: true, data: { sessionId: (session as { id: string }).id } };
  } catch (err) {
    unstable_rethrow(err);
    safeLog.error("startWorkoutSession unexpected", { err: String(err) });
    return fail("unexpected");
  }
}

/* =========================================================================
   finishWorkoutSession
   ========================================================================= */

const finishSessionSchema = z.object({
  session_id: z.string().uuid(),
  user_rpe: z.number().int().min(1).max(10).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export async function finishWorkoutSession(
  raw: z.infer<typeof finishSessionSchema>,
): Promise<ActionResult<true>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx.ok) return ctx;

    const parsed = finishSessionSchema.safeParse(raw);
    if (!parsed.success) return fail("validation_failed");

    const { session_id, user_rpe, notes } = parsed.data;
    const update: Record<string, unknown> = {
      status: "done",
      completed_at: new Date().toISOString(),
    };
    if (user_rpe !== undefined && user_rpe !== null)
      update["user_rpe"] = user_rpe;
    if (notes !== undefined) update["notes"] = notes;

    // Tenta atualizar com colunas novas; se ainda não existirem (migration
    // 0031 não aplicada), cai pro update mínimo.
    const { error } = await ctx.data.supabase
      .from("workout_sessions")
      .update(update)
      .eq("id", session_id);

    if (error && /column .* does not exist/i.test(error.message)) {
      delete update["user_rpe"];
      delete update["notes"];
      const retry = await ctx.data.supabase
        .from("workout_sessions")
        .update(update)
        .eq("id", session_id);
      if (retry.error) return fail("finish_failed");
    } else if (error) {
      return fail("finish_failed");
    }

    // Gamificação: +50 XP + streak (best-effort, nunca falha o finish)
    try {
      await awardWorkoutXp(ctx.data.supabase, session_id);
    } catch (e) {
      safeLog.error("awardWorkoutXp failed", e instanceof Error ? e.message : "unknown");
    }

    // Progresso nos desafios ativos do trainer
    try {
      await bumpChallengeProgress(ctx.data.supabase, session_id);
    } catch (e) {
      safeLog.error("bumpChallengeProgress failed", e instanceof Error ? e.message : "unknown");
    }

    // Badges (best-effort)
    try {
      await awardBadges(ctx.data.supabase, session_id);
    } catch (e) {
      safeLog.error("awardBadges failed", e instanceof Error ? e.message : "unknown");
    }

    revalidatePath("/app/workouts");
    revalidatePath("/aluno");
    return { ok: true, data: true };
  } catch (err) {
    unstable_rethrow(err);
    safeLog.error("finishWorkoutSession unexpected", { err: String(err) });
    return fail("unexpected");
  }
}

/* =========================================================================
   cancelWorkoutSession
   ========================================================================= */

const cancelSessionSchema = z.object({ session_id: z.string().uuid() });

export async function cancelWorkoutSession(
  raw: z.infer<typeof cancelSessionSchema>,
): Promise<ActionResult<true>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx.ok) return ctx;

    const parsed = cancelSessionSchema.safeParse(raw);
    if (!parsed.success) return fail("validation_failed");

    // DELETE cascateia exercise_sets automaticamente.
    const { error } = await ctx.data.supabase
      .from("workout_sessions")
      .delete()
      .eq("id", parsed.data.session_id);

    if (error) return fail("cancel_failed");

    revalidatePath("/app/workouts");
    return { ok: true, data: true };
  } catch (err) {
    unstable_rethrow(err);
    safeLog.error("cancelWorkoutSession unexpected", { err: String(err) });
    return fail("unexpected");
  }
}

/* =========================================================================
   logSet
   ========================================================================= */

const logSetSchema = z.object({
  session_id: z.string().uuid(),
  exercise_id: z.string().uuid().optional().nullable(),
  exercise_name: z.string().trim().min(1).max(120),
  set_number: z.number().int().min(1).max(50),
  reps: z.number().int().min(0).max(200).optional().nullable(),
  load_kg: z.number().nonnegative().max(1000).optional().nullable(),
  rpe: z.number().int().min(1).max(10).optional().nullable(),
  discomfort: z.number().int().min(0).max(10).optional().nullable(),
  notes: z.string().trim().max(300).optional().nullable(),
});

export async function logSet(
  raw: z.infer<typeof logSetSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx.ok) return ctx;

    const parsed = logSetSchema.safeParse(raw);
    if (!parsed.success) return fail("validation_failed");

    const { data, error } = await ctx.data.supabase
      .from("exercise_sets")
      .insert({
        workout_session_id: parsed.data.session_id,
        exercise_id: parsed.data.exercise_id ?? null,
        exercise_name: parsed.data.exercise_name,
        set_number: parsed.data.set_number,
        reps: parsed.data.reps ?? null,
        load_kg: parsed.data.load_kg ?? null,
        rpe: parsed.data.rpe ?? null,
        discomfort: parsed.data.discomfort ?? null,
        notes: parsed.data.notes ?? null,
      })
      .select("id")
      .single();

    if (error || !data) {
      if (error && /does not exist/i.test(error.message)) {
        safeLog.warn("logSet: exercise_sets table missing", {});
        return fail("exercise_sets_table_missing");
      }
      safeLog.warn("logSet insert error", { error: error?.message });
      return fail("log_failed");
    }

    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (err) {
    unstable_rethrow(err);
    safeLog.error("logSet unexpected", { err: String(err) });
    return fail("unexpected");
  }
}

/* =========================================================================
   updateSet
   ========================================================================= */

const updateSetSchema = z.object({
  id: z.string().uuid(),
  reps: z.number().int().min(0).max(200).optional().nullable(),
  load_kg: z.number().nonnegative().max(1000).optional().nullable(),
  rpe: z.number().int().min(1).max(10).optional().nullable(),
  discomfort: z.number().int().min(0).max(10).optional().nullable(),
  notes: z.string().trim().max(300).optional().nullable(),
});

export async function updateSet(
  raw: z.infer<typeof updateSetSchema>,
): Promise<ActionResult<true>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx.ok) return ctx;

    const parsed = updateSetSchema.safeParse(raw);
    if (!parsed.success) return fail("validation_failed");

    const { id, ...patch } = parsed.data;
    const { error } = await ctx.data.supabase
      .from("exercise_sets")
      .update(patch)
      .eq("id", id);

    if (error) return fail("update_failed");
    return { ok: true, data: true };
  } catch (err) {
    unstable_rethrow(err);
    safeLog.error("updateSet unexpected", { err: String(err) });
    return fail("unexpected");
  }
}

/* =========================================================================
   deleteSet
   ========================================================================= */

const deleteSetSchema = z.object({ id: z.string().uuid() });

export async function deleteSet(
  raw: z.infer<typeof deleteSetSchema>,
): Promise<ActionResult<true>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx.ok) return ctx;

    const parsed = deleteSetSchema.safeParse(raw);
    if (!parsed.success) return fail("validation_failed");

    const { error } = await ctx.data.supabase
      .from("exercise_sets")
      .delete()
      .eq("id", parsed.data.id);

    if (error) return fail("delete_failed");
    return { ok: true, data: true };
  } catch (err) {
    unstable_rethrow(err);
    safeLog.error("deleteSet unexpected", { err: String(err) });
    return fail("unexpected");
  }
}

/* =========================================================================
   listWorkoutHistory / getSessionDetail / getExerciseProgression
   ========================================================================= */

export type HistoryRow = {
  sessionId: string;
  workoutId: string;
  workoutTitle: string;
  studentId: string;
  studentName: string | null;
  date: string;
  status: WorkoutSession["status"];
  durationMin: number | null;
  userRpe: number | null;
  setCount: number;
  volumeKg: number;
};

export async function listWorkoutHistory(
  filters: {
    student_id?: string;
    rangeDays?: number;
    limit?: number;
  } = {},
): Promise<ActionResult<HistoryRow[]>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx.ok) return ctx;

    const sinceDays = filters.rangeDays ?? 90;
    const limit = filters.limit ?? 50;
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - sinceDays);
    const sinceIso = since.toISOString().slice(0, 10);

    let query = ctx.data.supabase
      .from("workout_sessions")
      .select(
        "id, workout_id, student_id, date, status, started_at, completed_at, user_rpe, workouts(title), student_profiles(full_name)",
      )
      .order("date", { ascending: false })
      .order("started_at", { ascending: false })
      .limit(limit);

    query = query.gte("date", sinceIso);
    if (filters.student_id) query = query.eq("student_id", filters.student_id);

    const { data: sessions, error } = await query;
    if (error) return fail("history_query_failed");

    const rows = (sessions ?? []) as Array<{
      id: string;
      workout_id: string;
      student_id: string;
      date: string;
      status: WorkoutSession["status"];
      started_at: string | null;
      completed_at: string | null;
      user_rpe: number | null;
      workouts: { title?: string } | null;
      student_profiles: { full_name?: string } | null;
    }>;

    if (rows.length === 0) return { ok: true, data: [] };

    // Pra cada sessão, puxa o resumo (set_count, volume) numa query só.
    const sessionIds = rows.map((r) => r.id);
    const { data: sets, error: setsErr } = await ctx.data.supabase
      .from("exercise_sets")
      .select("workout_session_id, reps, load_kg")
      .in("workout_session_id", sessionIds);

    if (setsErr) {
      // Tabela pode não existir (migration 0031 não aplicada). Devolve
      // linhas sem stats.
      const data: HistoryRow[] = rows.map((r) => ({
        sessionId: r.id,
        workoutId: r.workout_id,
        workoutTitle: r.workouts?.title ?? "Treino",
        studentId: r.student_id,
        studentName: r.student_profiles?.full_name ?? null,
        date: r.date,
        status: r.status,
        durationMin:
          r.started_at && r.completed_at
            ? Math.max(
                0,
                Math.round(
                  (new Date(r.completed_at).getTime() -
                    new Date(r.started_at).getTime()) /
                    60000,
                ),
              )
            : null,
        userRpe: r.user_rpe ?? null,
        setCount: 0,
        volumeKg: 0,
      }));
      return { ok: true, data };
    }

    const summary = new Map<
      string,
      { setCount: number; volumeKg: number }
    >();
    for (const s of (sets ?? []) as Array<{
      workout_session_id: string;
      reps: number | null;
      load_kg: number | null;
    }>) {
      const cur = summary.get(s.workout_session_id) ?? {
        setCount: 0,
        volumeKg: 0,
      };
      cur.setCount += 1;
      cur.volumeKg += (s.reps ?? 0) * Number(s.load_kg ?? 0);
      summary.set(s.workout_session_id, cur);
    }

    const data: HistoryRow[] = rows.map((r) => {
      const s = summary.get(r.id);
      return {
        sessionId: r.id,
        workoutId: r.workout_id,
        workoutTitle: r.workouts?.title ?? "Treino",
        studentId: r.student_id,
        studentName: r.student_profiles?.full_name ?? null,
        date: r.date,
        status: r.status,
        durationMin:
          r.started_at && r.completed_at
            ? Math.max(
                0,
                Math.round(
                  (new Date(r.completed_at).getTime() -
                    new Date(r.started_at).getTime()) /
                    60000,
                ),
              )
            : null,
        userRpe: r.user_rpe ?? null,
        setCount: s?.setCount ?? 0,
        volumeKg: Math.round(s?.volumeKg ?? 0),
      };
    });

    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    safeLog.error("listWorkoutHistory unexpected", { err: String(err) });
    return fail("unexpected");
  }
}

export async function getSessionDetail(
  sessionId: string,
): Promise<
  ActionResult<{
    session: WorkoutSession | null;
    sets: ExerciseSet[];
  }>
> {
  try {
    const ctx = await getAuthContext();
    if (!ctx.ok) return ctx;

    const { data: sessionRow, error: sessErr } = await ctx.data.supabase
      .from("workout_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessErr || !sessionRow) return fail("session_not_found");

    const { data: sets, error: setsErr } = await ctx.data.supabase
      .from("exercise_sets")
      .select(
        "id, workout_session_id, exercise_id, exercise_name, set_number, reps, load_kg, rpe, discomfort, notes, created_at",
      )
      .eq("workout_session_id", sessionId)
      .order("created_at", { ascending: true });

    if (setsErr && /does not exist/i.test(setsErr.message)) {
      return {
        ok: true,
        data: { session: sessionRow as WorkoutSession, sets: [] },
      };
    }
    if (setsErr) return fail("sets_query_failed");

    return {
      ok: true,
      data: {
        session: sessionRow as WorkoutSession,
        sets: (sets ?? []) as ExerciseSet[],
      },
    };
  } catch (err) {
    unstable_rethrow(err);
    safeLog.error("getSessionDetail unexpected", { err: String(err) });
    return fail("unexpected");
  }
}

export type ProgressionPoint = {
  date: string;
  topLoadKg: number;
  totalVolumeKg: number;
  totalReps: number;
  userRpe: number | null;
  setCount: number;
};

/**
 * Progressão por exercício: agrega sessões finalizadas nos últimos
 * `rangeDays` dias com pelo menos 1 série desse exercício. Retorna
 * pontos ordenados por data pra alimentar sparkline.
 */
export async function getExerciseProgression(
  exerciseId: string,
  rangeDays = 180,
): Promise<ActionResult<ProgressionPoint[]>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx.ok) return ctx;

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - rangeDays);
    const sinceIso = since.toISOString().slice(0, 10);

    const { data, error } = await ctx.data.supabase
      .from("exercise_sets")
      .select(
        "exercise_id, reps, load_kg, rpe, workout_sessions!inner(date, status)",
      )
      .eq("exercise_id", exerciseId)
      .gte("workout_sessions.date", sinceIso)
      .order("created_at", { ascending: true });

    if (error) {
      if (/does not exist/i.test(error.message)) return { ok: true, data: [] };
      return fail("progression_query_failed");
    }

    type Row = {
      exercise_id: string;
      reps: number | null;
      load_kg: number | null;
      rpe: number | null;
      workout_sessions: Array<{ date: string; status: string }> | null;
    };

    const byDate = new Map<
      string,
      {
        topLoadKg: number;
        totalVolumeKg: number;
        totalReps: number;
        rpeSum: number;
        rpeCount: number;
        setCount: number;
      }
    >();

    for (const r of (data ?? []) as unknown as Row[]) {
      const ws = r.workout_sessions?.[0];
      if (!ws) continue;
      const date = ws.date;
      const cur = byDate.get(date) ?? {
        topLoadKg: 0,
        totalVolumeKg: 0,
        totalReps: 0,
        rpeSum: 0,
        rpeCount: 0,
        setCount: 0,
      };
      const load = Number(r.load_kg ?? 0);
      const reps = r.reps ?? 0;
      cur.topLoadKg = Math.max(cur.topLoadKg, load);
      cur.totalVolumeKg += load * reps;
      cur.totalReps += reps;
      cur.setCount += 1;
      if (r.rpe != null) {
        cur.rpeSum += r.rpe;
        cur.rpeCount += 1;
      }
      byDate.set(date, cur);
    }

    const points: ProgressionPoint[] = Array.from(byDate.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([date, v]) => ({
        date,
        topLoadKg: v.topLoadKg,
        totalVolumeKg: Math.round(v.totalVolumeKg),
        totalReps: v.totalReps,
        userRpe:
          v.rpeCount > 0 ? Math.round((v.rpeSum / v.rpeCount) * 10) / 10 : null,
        setCount: v.setCount,
      }));

    return { ok: true, data: points };
  } catch (err) {
    unstable_rethrow(err);
    safeLog.error("getExerciseProgression unexpected", { err: String(err) });
    return fail("unexpected");
  }
}

/* =========================================================================
   Action "form" wrapper — usada por <form action={...}> quando a página
   não precisa tratar erro programático (só redireciona).
   ========================================================================= */

export async function startWorkoutAndRedirect(formData: FormData): Promise<void> {
  const workoutId = formData.get("workout_id");
  const studentId = formData.get("student_id");
  if (typeof workoutId !== "string") {
    redirect("/app/workouts");
  }
  const result = await startWorkoutSession({
    workout_id: workoutId,
    student_id: typeof studentId === "string" ? studentId : null,
  });
  if (!result.ok) {
    redirect(
      `/app/workouts/${workoutId}?err=${encodeURIComponent(result.error)}`,
    );
  }
  redirect(`/app/workouts/${workoutId}/runner/${result.data.sessionId}`);
}
