-- Migration 0030 — Correção de Emergência: Tabela student_profiles e RLS
-- Garante que a tabela exista e que as permissões de leitura para o trainer estejam corretas.

-- 1. Garante a existência da tabela (idempotente)
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

-- 3. Policy: Trainer pode ler e atualizar seus próprios alunos
DROP POLICY IF EXISTS "student_trainer_read" ON public.student_profiles;
CREATE POLICY "student_trainer_read" ON public.student_profiles
  FOR SELECT USING (trainer_id = auth.uid());

DROP POLICY IF EXISTS "student_trainer_update" ON public.student_profiles;
CREATE POLICY "student_trainer_update" ON public.student_profiles
  FOR UPDATE USING (trainer_id = auth.uid());

-- 4. Policy: Aluno pode ler o próprio perfil
DROP POLICY IF EXISTS "student_self_read" ON public.student_profiles;
CREATE POLICY "student_self_read" ON public.student_profiles
  FOR SELECT USING (user_id = auth.uid());

-- 5. Garante índices para performance
CREATE INDEX IF NOT EXISTS idx_student_trainer_new ON public.student_profiles(trainer_id);
