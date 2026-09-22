-- Migration 0035_hard_reset_rls.sql
-- Reset total de permissões para eliminar o crash do Dashboard

-- 1. Limpeza de Policies da tabela student_profiles
DROP POLICY IF EXISTS "trainer_full_access_students" ON public.student_profiles;
DROP POLICY IF EXISTS "student_self_read_fixed" ON public.student_profiles;
DROP POLICY IF EXISTS "student_trainer_read" ON public.student_profiles;
DROP POLICY IF EXISTS "student_self_read" ON public.student_profiles;

-- 2. Recriação de Policies Simples e Robustas para student_profiles
CREATE POLICY "student_profiles_trainer_all" ON public.student_profiles
  FOR ALL 
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "student_profiles_self_read" ON public.student_profiles
  FOR SELECT USING (user_id = auth.uid());

-- 3. Limpeza de Policies da tabela payment_links
DROP POLICY IF EXISTS "payment_links_trainer_all" ON public.payment_links;
DROP POLICY IF EXISTS "payment_links_trainer_read" ON public.payment_links;

-- 4. Recriação de Policies Simples para payment_links
CREATE POLICY "payment_links_trainer_all" ON public.payment_links
  FOR ALL 
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- 5. Garante que as tabelas estão com RLS habilitado
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

-- 6. Força a atualização de estatísticas para evitar timeouts de query (que causam crash)
ANALYZE public.student_profiles;
ANALYZE public.payment_links;
