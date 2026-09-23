-- Migration 0052_DIRECT_MESSAGES.sql
-- Feedback 1:1 trainer <-> aluno dentro do app (padrão Prime).
-- IDEMPOTENTE.

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 2000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_direct_messages_thread
  ON public.direct_messages(trainer_id, student_id, created_at);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Trainer (próprio + staff): tudo, mas só enviando como si mesmo
DROP POLICY IF EXISTS "dm_trainer_all" ON public.direct_messages;
CREATE POLICY "dm_trainer_all" ON public.direct_messages
  FOR ALL TO authenticated
  USING (public.trainer_scope_has_access(trainer_id))
  WITH CHECK (public.trainer_scope_has_access(trainer_id) AND sender_id = auth.uid());

-- Aluno: só o próprio thread, só enviando como si mesmo
DROP POLICY IF EXISTS "dm_student_all" ON public.direct_messages;
CREATE POLICY "dm_student_all" ON public.direct_messages
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid() AND sender_id = auth.uid());
