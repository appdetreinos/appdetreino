-- 0031_exercise_media_and_sets.sql
--
-- Adiciona colunas de mídia em `exercises` (image_url, animation_url, category,
-- aliases, media_type) e cria a tabela `exercise_sets` (que faltava pra rodar
-- o WorkoutRunner completo: registrar séries em tempo real).
--
-- Idempotente: usa IF NOT EXISTS e DROP POLICY IF EXISTS pra poder rodar
-- quantas vezes precisar sem erro.

-- ============================================================================
-- 1) Colunas de mídia em exercises
-- ============================================================================

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS animation_url TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS aliases TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS media_type TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exercises_media_type_check'
  ) THEN
    ALTER TABLE public.exercises
      ADD CONSTRAINT exercises_media_type_check
        CHECK (media_type IS NULL OR media_type IN ('gif', 'video', 'svg'));
  END IF;
END $$;

-- ============================================================================
-- 2) Tabela exercise_sets (séries registradas dentro de uma sessão de treino)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.exercise_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  set_number SMALLINT NOT NULL CHECK (set_number BETWEEN 1 AND 50),
  reps SMALLINT CHECK (reps IS NULL OR reps BETWEEN 0 AND 100),
  load_kg NUMERIC(6,2) CHECK (load_kg IS NULL OR load_kg BETWEEN 0 AND 1000),
  rpe SMALLINT CHECK (rpe IS NULL OR rpe BETWEEN 1 AND 10),
  discomfort SMALLINT CHECK (discomfort IS NULL OR discomfort BETWEEN 0 AND 10),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workout_session_id, exercise_name, set_number)
);

CREATE INDEX IF NOT EXISTS exercise_sets_session_idx
  ON public.exercise_sets (workout_session_id);

CREATE INDEX IF NOT EXISTS exercise_sets_exercise_idx
  ON public.exercise_sets (exercise_id);

-- ============================================================================
-- 3) RLS em exercise_sets
-- ============================================================================

ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exercise_sets_select_own" ON public.exercise_sets;
CREATE POLICY "exercise_sets_select_own" ON public.exercise_sets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      JOIN public.workouts w ON w.id = ws.workout_id
      WHERE ws.id = exercise_sets.workout_session_id
        AND (
          ws.student_id = auth.uid()
          OR w.trainer_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.student_profiles sp
            WHERE sp.user_id = ws.student_id
              AND sp.trainer_id = auth.uid()
          )
        )
    )
  );

-- INSERT: aluno da sessão OU trainer do workout OU trainer do aluno.
DROP POLICY IF EXISTS "exercise_sets_insert_own" ON public.exercise_sets;
CREATE POLICY "exercise_sets_insert_own" ON public.exercise_sets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      JOIN public.workouts w ON w.id = ws.workout_id
      WHERE ws.id = workout_session_id
        AND (
          ws.student_id = auth.uid()
          OR w.trainer_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.student_profiles sp
            WHERE sp.user_id = ws.student_id
              AND sp.trainer_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "exercise_sets_update_own" ON public.exercise_sets;
CREATE POLICY "exercise_sets_update_own" ON public.exercise_sets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      JOIN public.workouts w ON w.id = ws.workout_id
      WHERE ws.id = exercise_sets.workout_session_id
        AND (
          ws.student_id = auth.uid()
          OR w.trainer_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.student_profiles sp
            WHERE sp.user_id = ws.student_id
              AND sp.trainer_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "exercise_sets_delete_own" ON public.exercise_sets;
CREATE POLICY "exercise_sets_delete_own" ON public.exercise_sets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      JOIN public.workouts w ON w.id = ws.workout_id
      WHERE ws.id = exercise_sets.workout_session_id
        AND (
          ws.student_id = auth.uid()
          OR w.trainer_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.student_profiles sp
            WHERE sp.user_id = ws.student_id
              AND sp.trainer_id = auth.uid()
          )
        )
    )
  );

-- ============================================================================
-- 4) Trainer pode criar/atualizar workout_sessions dos seus alunos
--    (hoje a policy já deve cobrir trainer_id=auth.uid(), mas garantindo
--    explicitamente a regra de trainer abre a porta pro trainer abrir
--    sessões em nome do aluno no WorkoutRunner.)
-- ============================================================================

DROP POLICY IF EXISTS "workout_sessions_insert_trainer" ON public.workout_sessions;
CREATE POLICY "workout_sessions_insert_trainer" ON public.workout_sessions FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_sessions.workout_id
        AND (
          w.trainer_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.student_profiles sp
            WHERE sp.user_id = workout_sessions.student_id
              AND sp.trainer_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "workout_sessions_update_trainer" ON public.workout_sessions;
CREATE POLICY "workout_sessions_update_trainer" ON public.workout_sessions FOR UPDATE
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_sessions.workout_id
        AND (
          w.trainer_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.student_profiles sp
            WHERE sp.user_id = workout_sessions.student_id
              AND sp.trainer_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "workout_sessions_delete_trainer" ON public.workout_sessions;
CREATE POLICY "workout_sessions_delete_trainer" ON public.workout_sessions FOR DELETE
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_sessions.workout_id
        AND (
          w.trainer_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.student_profiles sp
            WHERE sp.user_id = workout_sessions.student_id
              AND sp.trainer_id = auth.uid()
          )
        )
    )
  );
