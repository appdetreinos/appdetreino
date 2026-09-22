-- Migration 0031 — SOLUÇÃO DEFINITIVA: Permissões de student_profiles
-- Este script resolve o crash do dashboard removendo qualquer conflito de RLS

-- 1. Garante que a tabela existe com a estrutura correta
CREATE TABLE IF NOT EXISTS public.student_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES public.trainer_profiles(user_id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  full_name TEXT NOT NULL,
  phone TEXT,
  birthdate DATE,
  gender TEXT,
  height_cm NUMERIC(5,1),
  goal TEXT,
  xp_total INT NOT NULL DEFAULT 0,
  streak_current INT NOT NULL DEFAULT 0,
  streak_last_action_at TIMESTAMPTZ,
  asaas_customer_id TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Habilita RLS
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- 3. POLICY TOTAL: O trainer PODE TUDO nos seus próprios alunos
-- Removemos qualquer policy antiga para não ter conflito
DROP POLICY IF EXISTS "student_trainer_read" ON public.student_profiles;
DROP POLICY IF EXISTS "student_self_read" ON public.student_profiles;
DROP POLICY IF EXISTS "student_trainer_update" ON public.student_profiles;

-- Nova Policy: Se o trainer_id for o usuário logado, ele tem acesso total
CREATE POLICY "trainer_full_access_students" ON public.student_profiles
  FOR ALL 
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- 4. Policy para o aluno ler o próprio perfil
CREATE POLICY "student_self_read_fixed" ON public.student_profiles
  FOR SELECT USING (user_id = auth.uid());

-- 5. Índices para evitar timeout de query (que também causa crash)
CREATE INDEX IF NOT EXISTS idx_student_profiles_trainer_id ON public.student_profiles(trainer_id);
