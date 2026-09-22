-- Migration 0012 — Liberar INSERT em trainer_profiles para triggers + service_role
-- Idempotente.
--
-- Problema: policy antiga exigia `auth.uid() = user_id` em INSERT, o que quebra
-- (a) backfill sem usuário logado
-- (b) trigger AFTER INSERT em profiles (auth.uid() não é o novo user)
--
-- Fix: policy mais permissiva — qualquer authenticated pode inserir o PRÓPRIO
-- trainer_profile OU service_role pode inserir qualquer um.

DROP POLICY IF EXISTS "trainer_self_insert" ON public.trainer_profiles;
DROP POLICY IF EXISTS "trainer_self_or_service_insert" ON public.trainer_profiles;
CREATE POLICY "trainer_self_or_service_insert" ON public.trainer_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR auth.jwt() ->> 'role' = 'service_role'
  );

-- SELECT mais permissivo também: service_role lê tudo (audit/admin scripts)
DROP POLICY IF EXISTS "trainer_self_read" ON public.trainer_profiles;
DROP POLICY IF EXISTS "trainer_self_or_service_read" ON public.trainer_profiles;
CREATE POLICY "trainer_self_or_service_read" ON public.trainer_profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.jwt() ->> 'role' = 'service_role'
  );

-- UPDATE idem
DROP POLICY IF EXISTS "trainer_self_update" ON public.trainer_profiles;
DROP POLICY IF EXISTS "trainer_self_or_service_update" ON public.trainer_profiles;
CREATE POLICY "trainer_self_or_service_update" ON public.trainer_profiles
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.jwt() ->> 'role' = 'service_role'
  )
  WITH CHECK (
    auth.uid() = user_id
    OR auth.jwt() ->> 'role' = 'service_role'
  );

-- Backfill (defesa em profundidade — caso 0011 tenha falhado por RLS)
INSERT INTO public.trainer_profiles (user_id)
SELECT p.id
FROM public.profiles p
LEFT JOIN public.trainer_profiles tp ON tp.user_id = p.id
WHERE p.role = 'trainer'
  AND tp.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;
