-- Migration 0021 — Fixes de schema + RLS para área do trainer
--
-- Resolve 4 bugs REAIS identificados na auditoria (2026-09-22):
--   (1) `payments.description` referenciada em finance/new mas coluna não existe
--   (2) Trainer não consegue INSERT em `measurements` (apenas aluno)
--   (3) Trainer não tem INSERT/UPDATE/DELETE em `habits` / `habit_logs`
--   (4) Comentário: `student_profiles.phone` não existe — phone fica em `profiles.phone`

-- ============================================================
-- (1) Adiciona coluna `description` em `payments`
-- ============================================================

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS description TEXT;

-- ============================================================
-- (2) RLS — Trainer pode inserir measurements dos próprios alunos
-- ============================================================

DROP POLICY IF EXISTS "measurements_insert_own_or_trainer" ON public.measurements;

CREATE POLICY "measurements_insert_own_or_trainer"
  ON public.measurements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Aluno inserindo a própria medida
    student_id = auth.uid()
    OR
    -- Trainer inserindo medida do aluno dele
    EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.user_id = measurements.student_id
        AND sp.trainer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "measurements_update_own_or_trainer" ON public.measurements;

CREATE POLICY "measurements_update_own_or_trainer"
  ON public.measurements
  FOR UPDATE
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.user_id = measurements.student_id
        AND sp.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.user_id = measurements.student_id
        AND sp.trainer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "measurements_delete_own_or_trainer" ON public.measurements;

CREATE POLICY "measurements_delete_own_or_trainer"
  ON public.measurements
  FOR DELETE
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.user_id = measurements.student_id
        AND sp.trainer_id = auth.uid()
    )
  );

-- ============================================================
-- (3) RLS — Trainer pode gerenciar habits + habit_logs dos próprios alunos
-- ============================================================

DROP POLICY IF EXISTS "habits_owner_or_trainer_all" ON public.habits;

CREATE POLICY "habits_owner_or_trainer_all"
  ON public.habits
  FOR ALL
  TO authenticated
  USING (
    trainer_id = auth.uid()
    OR student_id = auth.uid()
  )
  WITH CHECK (
    trainer_id = auth.uid()
    OR student_id = auth.uid()
  );

DROP POLICY IF EXISTS "habit_logs_owner_or_trainer_all" ON public.habit_logs;

CREATE POLICY "habit_logs_owner_or_trainer_all"
  ON public.habit_logs
  FOR ALL
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.habits h
      WHERE h.id = habit_logs.habit_id
        AND h.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.habits h
      WHERE h.id = habit_logs.habit_id
        AND h.trainer_id = auth.uid()
    )
  );

-- ============================================================
-- Verificação
-- ============================================================
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'payments' AND column_name = 'description';
