-- Migration 0057_CONSOLIDATED_PARITY_FIX.sql
-- Auditoria minuciosa: colunas que o código usa mas o banco não tinha
-- + policies que faltavam pros fluxos reais (aluno agenda, Pix, anamnese,
-- push do trainer, gerenciar posts, toggle compras).
-- IDEMPOTENTE. Rodar DEPOIS das anteriores.

-- ============================================================
-- (1) Colunas faltantes
-- ============================================================
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS user_rpe NUMERIC;
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.diets ADD COLUMN IF NOT EXISTS goal TEXT;
ALTER TABLE public.payment_templates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Elevação de pernas é abdômen, não abdutores
UPDATE public.exercises
SET category = 'abdomen', muscle_group = 'abdomen'
WHERE lower(name) = 'elevação de pernas';

-- ============================================================
-- (2) Trainer gerencia os próprios posts (fixar/apagar da UI)
-- ============================================================
DROP POLICY IF EXISTS "community_posts_trainer_manage" ON public.community_posts;
CREATE POLICY "community_posts_trainer_manage" ON public.community_posts
  FOR UPDATE TO authenticated
  USING (public.trainer_scope_has_access(trainer_id))
  WITH CHECK (public.trainer_scope_has_access(trainer_id));

DROP POLICY IF EXISTS "community_posts_trainer_delete" ON public.community_posts;
CREATE POLICY "community_posts_trainer_delete" ON public.community_posts
  FOR DELETE TO authenticated
  USING (public.trainer_scope_has_access(trainer_id));

-- ============================================================
-- (3) Aluno marca item da lista como comprado
-- ============================================================
DROP POLICY IF EXISTS "shopping_list_items_student_update" ON public.shopping_list_items;
CREATE POLICY "shopping_list_items_student_update" ON public.shopping_list_items
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.shopping_lists sl
    WHERE sl.id = shopping_list_items.shopping_list_id
      AND sl.student_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.shopping_lists sl
    WHERE sl.id = shopping_list_items.shopping_list_id
      AND sl.student_id = auth.uid()
  ));

-- ============================================================
-- (4) Aluno agenda: lê tipos + disponibilidade, cria agendamento
-- ============================================================
DROP POLICY IF EXISTS "appointment_types_student_select" ON public.appointment_types;
CREATE POLICY "appointment_types_student_select" ON public.appointment_types
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.student_profiles sp
    WHERE sp.user_id = auth.uid() AND sp.trainer_id = appointment_types.trainer_id
  ));

DROP POLICY IF EXISTS "trainer_availability_student_select" ON public.trainer_availability;
CREATE POLICY "trainer_availability_student_select" ON public.trainer_availability
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.student_profiles sp
    WHERE sp.user_id = auth.uid() AND sp.trainer_id = trainer_availability.trainer_id
  ));

DROP POLICY IF EXISTS "appointments_student_insert" ON public.appointments;
CREATE POLICY "appointments_student_insert" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.user_id = auth.uid() AND sp.trainer_id = appointments.trainer_id
    )
  );

-- ============================================================
-- (5) Aluno vê chave Pix do próprio trainer (aba Pagamentos)
-- ============================================================
DROP POLICY IF EXISTS "trainer_settings_student_select" ON public.trainer_settings;
CREATE POLICY "trainer_settings_student_select" ON public.trainer_settings
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.student_profiles sp
    WHERE sp.user_id = auth.uid() AND sp.trainer_id = trainer_settings.user_id
  ));

-- ============================================================
-- (6) Aluno lê questionário do próprio trainer (aba Anamnese)
-- ============================================================
DROP POLICY IF EXISTS "anamnesis_templates_student_select" ON public.anamnesis_templates;
CREATE POLICY "anamnesis_templates_student_select" ON public.anamnesis_templates
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.student_profiles sp
    WHERE sp.user_id = auth.uid() AND sp.trainer_id = anamnesis_templates.trainer_id
  ));

-- ============================================================
-- (7) Trainer dispara push pros alunos (lê subscriptions do escopo)
-- ============================================================
DROP POLICY IF EXISTS "push_subscriptions_trainer_select" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_trainer_select" ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.student_profiles sp
    WHERE sp.user_id = push_subscriptions.user_id
      AND public.trainer_scope_has_access(sp.trainer_id)
  ));

-- ============================================================
-- (8) Aluno vê exercícios custom do próprio trainer (nomes no treino)
-- ============================================================
DROP POLICY IF EXISTS "exercises_student_select" ON public.exercises;
CREATE POLICY "exercises_student_select" ON public.exercises
  FOR SELECT TO authenticated
  USING (
    trainer_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.user_id = auth.uid() AND sp.trainer_id = exercises.trainer_id
    )
  );
