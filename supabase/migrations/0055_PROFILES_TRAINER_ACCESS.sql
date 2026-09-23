-- Migration 0055_PROFILES_TRAINER_ACCESS.sql
-- Trainer (+staff) lê e edita o perfil dos próprios alunos.
-- Sem isso, a página do aluno dá 404 (profiles só tinha self_read).
-- IDEMPOTENTE.

DROP POLICY IF EXISTS "profiles_trainer_read_students" ON public.profiles;
CREATE POLICY "profiles_trainer_read_students" ON public.profiles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.student_profiles sp
    WHERE sp.user_id = profiles.id
      AND public.trainer_scope_has_access(sp.trainer_id)
  ));

DROP POLICY IF EXISTS "profiles_trainer_update_students" ON public.profiles;
CREATE POLICY "profiles_trainer_update_students" ON public.profiles
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.student_profiles sp
    WHERE sp.user_id = profiles.id
      AND public.trainer_scope_has_access(sp.trainer_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.student_profiles sp
    WHERE sp.user_id = profiles.id
      AND public.trainer_scope_has_access(sp.trainer_id)
  ));
