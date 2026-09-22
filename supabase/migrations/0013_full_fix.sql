-- Migration 0013 — REDE DE SEGURANÇA
-- Resolve problemas remanescentes em cascata.
-- Idempotente em tudo.
--
-- Problemas que esta migration resolve:
-- A. trainer_profiles pode estar faltando (FK quebrada em student_invites)
-- B. student_profiles precisa existir antes de FKs filhas
-- C. RLS policies podem estar barrando backfill legítimo
-- D. Trigger handle_new_user pode ter falhado silenciosamente

-- ============================================================
-- A. BACKFILL COMPLETO
-- ============================================================

-- Cria trainer_profiles pra todo profile com role='trainer'
INSERT INTO public.trainer_profiles (user_id)
SELECT p.id
FROM public.profiles p
LEFT JOIN public.trainer_profiles tp ON tp.user_id = p.id
WHERE p.role = 'trainer'
  AND tp.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Cria student_profiles pra todo profile com role='student'
-- (sem trainer_id ainda — vai ser setado quando o aluno aceita invite)
INSERT INTO public.student_profiles (user_id, full_name, status)
SELECT p.id, p.full_name, 'active'
FROM public.profiles p
LEFT JOIN public.student_profiles sp ON sp.user_id = p.id
WHERE p.role = 'student'
  AND sp.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- B. TRIGGER handle_new_profile — cria trainer_profiles OU student_profiles
--    baseado no role do profile. SECURITY DEFINER + service_role bypass.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'trainer' THEN
    INSERT INTO public.trainer_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF NEW.role = 'student' THEN
    INSERT INTO public.student_profiles (user_id, full_name, status)
    VALUES (NEW.id, NEW.full_name, 'active')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_role_setup ON public.profiles;
CREATE TRIGGER profiles_role_setup
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();

-- ============================================================
-- C. RLS — policies mais permissivas para trainer_profiles / student_profiles
-- ============================================================

-- trainer_profiles: SELF + service_role
DROP POLICY IF EXISTS "trainer_self_read" ON public.trainer_profiles;
DROP POLICY IF EXISTS "trainer_self_or_service_read" ON public.trainer_profiles;
CREATE POLICY "trainer_self_or_service_read" ON public.trainer_profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.jwt() ->> 'role' = 'service_role'
  );

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

DROP POLICY IF EXISTS "trainer_self_insert" ON public.trainer_profiles;
DROP POLICY IF EXISTS "trainer_self_or_service_insert" ON public.trainer_profiles;
CREATE POLICY "trainer_self_or_service_insert" ON public.trainer_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR auth.jwt() ->> 'role' = 'service_role'
  );

DROP POLICY IF EXISTS "trainer_service_delete" ON public.trainer_profiles;
CREATE POLICY "trainer_service_delete" ON public.trainer_profiles
  FOR DELETE TO authenticated
  USING (auth.jwt() ->> 'role' = 'service_role');

-- student_profiles: SELF read/update + trainer (via trainer_id) + service_role
DROP POLICY IF EXISTS "student_self_read" ON public.student_profiles;
CREATE POLICY "student_self_read" ON public.student_profiles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR trainer_id = auth.uid()
    OR auth.jwt() ->> 'role' = 'service_role'
  );

DROP POLICY IF EXISTS "student_self_update" ON public.student_profiles;
CREATE POLICY "student_self_update" ON public.student_profiles
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR trainer_id = auth.uid()
    OR auth.jwt() ->> 'role' = 'service_role'
  );

DROP POLICY IF EXISTS "student_self_insert" ON public.student_profiles;
CREATE POLICY "student_self_insert" ON public.student_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR auth.jwt() ->> 'role' = 'service_role'
  );

-- ============================================================
-- D. Aceita o invite — função que cria o student_profile corretamente
-- ============================================================

DROP FUNCTION IF EXISTS public.accept_invite(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.accept_invite(invite_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_invite
  FROM public.student_invites
  WHERE code = invite_code
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_or_expired_invite');
  END IF;

  -- Atualiza profile do usuário que aceitou pra role='student' (se ainda for trainer)
  UPDATE public.profiles
  SET role = 'student'
  WHERE id = v_user_id AND role <> 'student';

  -- Cria/atualiza student_profiles
  INSERT INTO public.student_profiles (user_id, trainer_id, full_name, phone, goal, status, joined_at)
  VALUES (v_user_id, v_invite.trainer_id, v_invite.full_name, v_invite.phone, v_invite.goal, 'active', now())
  ON CONFLICT (user_id) DO UPDATE
    SET trainer_id = EXCLUDED.trainer_id,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        goal = EXCLUDED.goal,
        status = 'active';

  -- Marca invite como aceito
  UPDATE public.student_invites
  SET status = 'accepted', accepted_by = v_user_id, accepted_at = now()
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'ok', true,
    'trainer_id', v_invite.trainer_id,
    'invite_id', v_invite.id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invite(TEXT) TO authenticated;

-- ============================================================
-- E. Backfill trainer_profiles UMA ÚLTIMA VEZ (caso 0011/0012 tenham
--    falhado por RLS)
-- ============================================================

INSERT INTO public.trainer_profiles (user_id)
SELECT p.id
FROM public.profiles p
LEFT JOIN public.trainer_profiles tp ON tp.user_id = p.id
WHERE p.role = 'trainer'
  AND tp.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;
