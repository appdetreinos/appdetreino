-- Migration 0045_FIX_RLS_READ_ACCESS.sql
-- RESOLUÇÃO FINAL DE PERMISSÃO: Força a leitura de alunos para o treinador

-- 1. Removemos qualquer policy anterior que possa estar bloqueando a leitura
DROP POLICY IF EXISTS "student_profiles_trainer_all" ON public.student_profiles;
DROP POLICY IF EXISTS "student_profiles_self_read" ON public.student_profiles;
DROP POLICY IF EXISTS "trainer_full_access_students" ON public.student_profiles;
DROP POLICY IF EXISTS "student_trainer_read" ON public.student_profiles;

-- 2. Criamos uma policy simples e abrangente
-- O treinador pode ver (SELECT) qualquer aluno onde ele seja o trainer_id
CREATE POLICY "trainer_read_own_students" ON public.student_profiles
  FOR SELECT
  USING (trainer_id = auth.uid());

-- 3. Permitimos que o treinador também possa atualizar/deletar seus alunos
CREATE POLICY "trainer_modify_own_students" ON public.student_profiles
  FOR ALL
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- 4. Garantimos que a tabela continua com RLS ativo
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
