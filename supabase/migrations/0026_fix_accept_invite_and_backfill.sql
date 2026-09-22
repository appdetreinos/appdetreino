-- Migration 0026 — accept_invite robusto + backfill de student_profiles
--
-- Problemas que resolve:
--   (A) Convite aceito mas student_profile nunca foi criado (RLS bloqueia
--       INSERT quando trainer_id IS NULL ou user já logado tem role errado)
--   (B) accept_invite precisa atualizar o profile.role pra 'student' ANTES
--       de inserir em student_profiles (senão a RLS de 0013 pode rejeitar)
--   (C) Backfill: pra todo invite.status='accepted' sem student_profile
--       correspondente, cria on-demand
--
-- Idempotente.

-- ============================================================
-- A. accept_invite refeito pra ser mais robusto
-- ============================================================

CREATE OR REPLACE FUNCTION public.accept_invite(invite_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- SELECT FOR UPDATE pra evitar race condition (2 cliques simultâneos)
  SELECT * INTO v_invite
  FROM public.student_invites
  WHERE code = invite_code
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_or_expired_or_used_invite');
  END IF;

  -- 1. Garante profile existe pro user (caso handle_new_user tenha falhado)
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    INSERT INTO public.profiles (id, role, full_name)
    VALUES (v_user_id, 'student'::user_role, COALESCE(v_invite.full_name, 'Aluno'))
    ON CONFLICT (id) DO UPDATE SET role = 'student'::user_role;
  ELSE
    -- Atualiza profile do usuário pra role='student'
    UPDATE public.profiles
    SET role = 'student'
    WHERE id = v_user_id AND role <> 'student';
  END IF;

  -- 2. Cria/atualiza student_profiles
  INSERT INTO public.student_profiles (
    user_id, trainer_id, full_name, phone, goal, status, joined_at
  )
  VALUES (
    v_user_id, v_invite.trainer_id, v_invite.full_name,
    v_invite.phone, v_invite.goal, 'active', now()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET trainer_id = EXCLUDED.trainer_id,
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.student_profiles.full_name),
        phone = COALESCE(EXCLUDED.phone, public.student_profiles.phone),
        goal = COALESCE(EXCLUDED.goal, public.student_profiles.goal),
        status = 'active';

  -- 3. Marca invite como aceito
  UPDATE public.student_invites
  SET status = 'accepted', accepted_by = v_user_id, accepted_at = now()
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'ok', true,
    'trainer_id', v_invite.trainer_id,
    'invite_id', v_invite.id,
    'student_id', v_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invite(TEXT) TO authenticated, service_role;

COMMENT ON FUNCTION public.accept_invite(TEXT) IS
  'Aceita convite de aluno. Cria profile (se faltar), atualiza role pra student, cria student_profile vinculado ao trainer, marca invite como aceito. Tudo em transação.';

-- ============================================================
-- B. BACKFILL — corrige convites já aceitos sem student_profile
-- ============================================================

INSERT INTO public.student_profiles (
  user_id, trainer_id, full_name, phone, goal, status, joined_at
)
SELECT
  si.accepted_by,
  si.trainer_id,
  si.full_name,
  si.phone,
  si.goal,
  'active',
  COALESCE(si.accepted_at, now())
FROM public.student_invites si
LEFT JOIN public.student_profiles sp ON sp.user_id = si.accepted_by
WHERE si.status = 'accepted'
  AND si.accepted_by IS NOT NULL
  AND sp.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Também garante que o profile.role='student' pra quem aceitou invite
UPDATE public.profiles p
SET role = 'student'::user_role
FROM public.student_invites si
WHERE si.accepted_by = p.id
  AND si.status = 'accepted'
  AND p.role <> 'student'::user_role;
