-- Migration 0005 — RLS policies que faltavam
-- Idempotente: roda múltiplas vezes sem erro (usa DROP POLICY IF EXISTS + CREATE)
--
-- Estas tabelas estão com RLS ON (em 0001/0002) mas NÃO tinham policy nenhuma,
-- o que tornava-as invisíveis via REST API / supabase-js.
-- Cada policy segue o padrão multi-tenant:
--   - Trainer: tudo onde ele é dono
--   - Aluno: lê/escreve apenas dados próprios
--   - Catálogos públicos (foods, badges): leitura ampla

-- ============================================================
-- 1. Tabelas filhas de workouts (já herdavam via workouts_trainer_all,
--    mas sem policy direta a queries via !inner falham)
-- ============================================================

-- workout_days — sempre via workout_id
DROP POLICY IF EXISTS workout_days_via_workout ON public.workout_days;
CREATE POLICY workout_days_via_workout ON public.workout_days
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_days.workout_id
            AND (w.trainer_id = auth.uid() OR w.student_id = auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_days.workout_id
            AND w.trainer_id = auth.uid())
  );

-- workout_items — via workout_days → workouts
DROP POLICY IF EXISTS workout_items_via_workout ON public.workout_items;
CREATE POLICY workout_items_via_workout ON public.workout_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_days d
      JOIN public.workouts w ON w.id = d.workout_id
      WHERE d.id = workout_items.workout_day_id
        AND (w.trainer_id = auth.uid() OR w.student_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_days d
      JOIN public.workouts w ON w.id = d.workout_id
      WHERE d.id = workout_items.workout_day_id
        AND w.trainer_id = auth.uid()
    )
  );

-- workout_sessions — trainer lê sessões dos seus alunos; aluno lê/escreve as próprias
DROP POLICY IF EXISTS workout_sessions_trainer_all ON public.workout_sessions;
CREATE POLICY workout_sessions_trainer_all ON public.workout_sessions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.user_id = workout_sessions.student_id AND sp.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.user_id = workout_sessions.student_id AND sp.trainer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS workout_sessions_student_all ON public.workout_sessions;
CREATE POLICY workout_sessions_student_all ON public.workout_sessions
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- ============================================================
-- 2. Dietas — meals + meal_items filhas
-- ============================================================

DROP POLICY IF EXISTS meals_via_diet ON public.meals;
CREATE POLICY meals_via_diet ON public.meals
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.diets d WHERE d.id = meals.diet_id
            AND (d.trainer_id = auth.uid() OR d.student_id = auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.diets d WHERE d.id = meals.diet_id
            AND d.trainer_id = auth.uid())
  );

DROP POLICY IF EXISTS meal_items_via_meal ON public.meal_items;
CREATE POLICY meal_items_via_meal ON public.meal_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meals m
      JOIN public.diets d ON d.id = m.diet_id
      WHERE m.id = meal_items.meal_id
        AND (d.trainer_id = auth.uid() OR d.student_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meals m
      JOIN public.diets d ON d.id = m.diet_id
      WHERE m.id = meal_items.meal_id
        AND d.trainer_id = auth.uid()
    )
  );

-- ============================================================
-- 3. foods (catálogo global — leitura ampla)
-- ============================================================

DROP POLICY IF EXISTS foods_read_all ON public.foods;
CREATE POLICY foods_read_all ON public.foods
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 4. measurements — aluno escreve as próprias, trainer lê dos seus alunos
-- ============================================================

DROP POLICY IF EXISTS measurements_student_all ON public.measurements;
CREATE POLICY measurements_student_all ON public.measurements
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS measurements_trainer_select ON public.measurements;
CREATE POLICY measurements_trainer_select ON public.measurements
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.user_id = measurements.student_id AND sp.trainer_id = auth.uid()
    )
  );

-- ============================================================
-- 5. Community: likes, comments (já tem community_posts)
-- ============================================================

DROP POLICY IF EXISTS community_likes_all ON public.community_likes;
CREATE POLICY community_likes_all ON public.community_likes
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS community_likes_visible ON public.community_likes;
CREATE POLICY community_likes_visible ON public.community_likes
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.community_posts p
      WHERE p.id = community_likes.post_id
        AND (
          p.trainer_id = auth.uid()
          OR p.author_id = auth.uid()
          OR (p.audience = 'students' AND p.trainer_id IN (
            SELECT trainer_id FROM public.student_profiles WHERE user_id = auth.uid()
          ))
        )
    )
  );

DROP POLICY IF EXISTS community_comments_all ON public.community_comments;
CREATE POLICY community_comments_all ON public.community_comments
  FOR ALL TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_posts p
      WHERE p.id = community_comments.post_id
        AND (
          p.trainer_id = auth.uid()
          OR (p.audience = 'students' AND p.trainer_id IN (
            SELECT trainer_id FROM public.student_profiles WHERE user_id = auth.uid()
          ))
        )
    )
  )
  WITH CHECK (author_id = auth.uid());

-- ============================================================
-- 6. Badges + student_badges + challenges
-- ============================================================

DROP POLICY IF EXISTS badges_read_all ON public.badges;
CREATE POLICY badges_read_all ON public.badges
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS student_badges_student_select ON public.student_badges;
CREATE POLICY student_badges_student_select ON public.student_badges
  FOR SELECT TO authenticated USING (student_id = auth.uid());

DROP POLICY IF EXISTS student_badges_trainer_select ON public.student_badges;
CREATE POLICY student_badges_trainer_select ON public.student_badges
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.user_id = student_badges.student_id AND sp.trainer_id = auth.uid()
    )
  );

-- Trainer gerencia seus desafios; aluno lê os desafios ativos
DROP POLICY IF EXISTS challenges_trainer_all ON public.challenges;
CREATE POLICY challenges_trainer_all ON public.challenges
  FOR ALL TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

DROP POLICY IF EXISTS challenges_student_select ON public.challenges;
CREATE POLICY challenges_student_select ON public.challenges
  FOR SELECT TO authenticated USING (
    trainer_id IN (
      SELECT trainer_id FROM public.student_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS challenge_participants_student_all ON public.challenge_participants;
CREATE POLICY challenge_participants_student_all ON public.challenge_participants
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS challenge_participants_trainer_select ON public.challenge_participants;
CREATE POLICY challenge_participants_trainer_select ON public.challenge_participants
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_participants.challenge_id AND c.trainer_id = auth.uid()
    )
  );

-- ============================================================
-- 7. payment_templates (trainer cria modelos recorrentes)
-- ============================================================

DROP POLICY IF EXISTS payment_templates_trainer_all ON public.payment_templates;
CREATE POLICY payment_templates_trainer_all ON public.payment_templates
  FOR ALL TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- ============================================================
-- 8. workout_recurrences — aluno lê o próprio
-- ============================================================

DROP POLICY IF EXISTS workout_recurrences_student_select ON public.workout_recurrences;
CREATE POLICY workout_recurrences_student_select ON public.workout_recurrences
  FOR SELECT TO authenticated USING (student_id = auth.uid());

-- ============================================================
-- 9. push_subscriptions — usuário gerencia as próprias
-- ============================================================

DROP POLICY IF EXISTS push_subscriptions_self_all ON public.push_subscriptions;
CREATE POLICY push_subscriptions_self_all ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 10. evolution_webhook_events — só service role lê (logs internos)
-- ============================================================

-- Mantém sem policy: só service_role_key consegue ler/escrever via API server-side.
-- RLS ON continua valendo, mas só acessamos de dentro do backend.

-- ============================================================
-- 11. exercises — biblioteca global + exercícios do trainer
-- ============================================================

DROP POLICY IF EXISTS exercises_read_all ON public.exercises;
CREATE POLICY exercises_read_all ON public.exercises
  FOR SELECT TO authenticated USING (trainer_id IS NULL OR trainer_id = auth.uid());

DROP POLICY IF EXISTS exercises_trainer_all ON public.exercises;
CREATE POLICY exercises_trainer_all ON public.exercises
  FOR ALL TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());
