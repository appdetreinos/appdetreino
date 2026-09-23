-- Migration 0054_BADGES.sql
-- Conquistas automáticas (Prime: gamificação que retém).
-- IDEMPOTENTE.

INSERT INTO public.badges (slug, name, description, criteria_jsonb)
VALUES
  ('primeiro-treino', 'Primeiro treino', 'Concluiu o primeiro treino no app.', '{"type":"workouts","value":1}'),
  ('ritmo-10', 'Ritmo 10', 'Concluiu 10 treinos.', '{"type":"workouts","value":10}'),
  ('meio-centena', 'Meio-centena', 'Concluiu 50 treinos. Consistência de atleta.', '{"type":"workouts","value":50}'),
  ('chama-acesa', 'Chama acesa', '7 dias seguidos batendo hábito.', '{"type":"streak","value":7}')
ON CONFLICT (slug) DO NOTHING;

-- Aluno conquista as próprias badges (award roda como o próprio aluno)
DROP POLICY IF EXISTS "student_badges_student_insert" ON public.student_badges;
CREATE POLICY "student_badges_student_insert" ON public.student_badges
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Trainer pode premiar manualmente os próprios alunos
DROP POLICY IF EXISTS "student_badges_trainer_insert" ON public.student_badges;
CREATE POLICY "student_badges_trainer_insert" ON public.student_badges
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.student_profiles sp
    WHERE sp.user_id = student_badges.student_id
      AND public.trainer_scope_has_access(sp.trainer_id)
  ));
