-- Migration 0028 — Fix DEFINITIVO do fluxo de convite de aluno
--
-- Resolve 3 bugs críticos:
--
--   (A) accept_invite quebra quando chamado via admin (service_role), porque
--       auth.uid() é NULL nesse contexto. Resultado: o fallback do
--       /api/auth/student-signup roda (que pode falhar silenciosamente em
--       alguns edge cases), e o convite fica preso em status='pending'
--       → trainer vê "1 convite pendente" mesmo após aluno aceitar.
--
--   (B) Aluno criado via signup INDEPENDENTE (sem convite) e cujo trainer
--       enviou convite depois — os dois ficam desconectados. O aluno nunca
--       recebe o vínculo automaticamente.
--
--   (C) Aluno sem full_name em profiles nem em student_profiles (porque
--       o signup aconteceu via fluxo que pulou accept_invite). Dashboard
--       mostra "Olá, email@..." ao invés do nome.
--
-- Soluções:
--
--   (1) accept_invite agora aceita p_user_id opcional. Quando chamado pelo
--       próprio aluno (user context), auth.uid() é usado. Quando chamado
--       por admin (service_role) ou trigger, p_user_id é obrigatório.
--
--   (2) student_self_link() — RPC idempotente que:
--        - Se o aluno já tem student_profile, retorna
--        - Senão, procura invite pending cujo email bate com o do aluno
--          e cria o vínculo
--        - Se não tem invite por email, retorna erro amigável
--       Chamada automaticamente pelo /aluno/page.tsx quando detecta
--       profile sem student_profile (e na primeira visita após login).
--
--   (3) Backfill imediato: pra todo aluno que tem student_profiles
--       ausente mas tem invite matching por email, cria o vínculo.
--
--   (4) Backfill de full_name: se profiles.full_name está vazio e o
--       aluno tem invite aceito, preenche com invite.full_name.

-- ============================================================
-- (1) accept_invite ROBUSTO — aceita p_user_id opcional
-- ============================================================

CREATE OR REPLACE FUNCTION public.accept_invite(
  invite_code TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_user_id UUID;
  v_existing_student RECORD;
BEGIN
  -- Decide qual user_id usar: o passado (admin/trigger) ou o da sessão
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- SELECT FOR UPDATE pra evitar race condition
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
    INSERT INTO public.profiles (id, role, full_name, phone)
    VALUES (
      v_user_id,
      'student'::user_role,
      COALESCE(v_invite.full_name, 'Aluno'),
      v_invite.phone
    )
    ON CONFLICT (id) DO UPDATE
      SET role = 'student'::user_role,
          full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
          phone = COALESCE(NULLIF(public.profiles.phone, ''), EXCLUDED.phone);
  ELSE
    -- Atualiza profile do usuário pra role='student' + herda nome/phone do invite
    -- se ainda não tiver (pra cobrir o caso do aluno cadastrado com nome
    -- vazio via fluxo quebrado)
    UPDATE public.profiles
    SET role = 'student'::user_role,
        full_name = COALESCE(NULLIF(public.profiles.full_name, ''), v_invite.full_name),
        phone = COALESCE(NULLIF(public.profiles.phone, ''), v_invite.phone)
    WHERE id = v_user_id;
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

  -- 3. Marca invite como aceito (FOR UPDATE já protege contra race)
  UPDATE public.student_invites
  SET status = 'accepted',
      accepted_by = v_user_id,
      accepted_at = COALESCE(accepted_at, now())
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'ok', true,
    'trainer_id', v_invite.trainer_id,
    'invite_id', v_invite.id,
    'student_id', v_user_id,
    'student_full_name', v_invite.full_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invite(TEXT, UUID) TO authenticated, service_role;

COMMENT ON FUNCTION public.accept_invite(TEXT, UUID) IS
'Aceita convite de aluno. Cria profile (se faltar), atualiza role pra student, herda nome/phone do invite, cria student_profile vinculado ao trainer, marca invite como aceito. Aceita p_user_id opcional (admin/trigger contexts onde auth.uid() é NULL).';

-- ============================================================
-- (2) student_self_link — auto-vincula aluno com invite pending matching email
-- ============================================================

CREATE OR REPLACE FUNCTION public.student_self_link(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_existing_student_id UUID;
  v_invite RECORD;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- 1. Se já tem student_profile, só atualiza nome/phone se estiverem vazios
  SELECT user_id INTO v_existing_student_id
  FROM public.student_profiles
  WHERE user_id = v_user_id;

  IF v_existing_student_id IS NOT NULL THEN
    -- Backfill: preenche nome/phone vazios usando o invite aceito
    UPDATE public.student_profiles sp
    SET full_name = COALESCE(NULLIF(sp.full_name, ''), si.full_name),
        phone = COALESCE(NULLIF(sp.phone, ''), si.phone),
        goal = COALESCE(NULLIF(sp.goal, ''), si.goal)
    FROM public.student_invites si
    WHERE sp.user_id = v_user_id
      AND si.accepted_by = v_user_id
      AND si.status = 'accepted';

    -- Backfill: profiles.full_name vazio
    UPDATE public.profiles p
    SET full_name = COALESCE(NULLIF(p.full_name, ''), si.full_name),
        phone = COALESCE(NULLIF(p.phone, ''), si.phone)
    FROM public.student_invites si
    WHERE p.id = v_user_id
      AND si.accepted_by = v_user_id
      AND si.status = 'accepted'
      AND (p.full_name = '' OR p.full_name IS NULL);

    RETURN jsonb_build_object('ok', true, 'already_linked', true);
  END IF;

  -- 2. Pega email do user
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  -- 3. Procura invite pending cujo email bate (case-insensitive)
  SELECT * INTO v_invite
  FROM public.student_invites
  WHERE LOWER(email) = LOWER(v_user_email)
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    -- Sem invite por email. Tenta casar pelo trainer_id se houver algum trainer
    -- que enviou convite sem email mas o user logado tem nome compatível.
    -- Por enquanto, retorna erro amigável.
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'no_matching_invite',
      'message', 'Não achamos convite pendente com teu e-mail. Pede pro teu personal reenviar.'
    );
  END IF;

  -- 4. Acha invite → chama accept_invite pra fazer o vínculo completo
  RETURN public.accept_invite(v_invite.code, v_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.student_self_link(UUID) TO authenticated, service_role;

COMMENT ON FUNCTION public.student_self_link(UUID) IS
'Se aluno já tem student_profile: backfill de nome/phone vazios via invite aceito. Se não tem: procura invite pending matching email e chama accept_invite. Idempotente. Usado pra auto-cura no login do aluno.';

-- ============================================================
-- (3) BACKFILL IMEDIATO — pra todo aluno existente sem vínculo,
--     tenta achar invite por email e criar student_profile.
-- ============================================================

DO $$
DECLARE
  v_user RECORD;
  v_result JSONB;
BEGIN
  FOR v_user IN
    SELECT au.id, au.email
    FROM auth.users au
    WHERE NOT EXISTS (
      SELECT 1 FROM public.student_profiles sp WHERE sp.user_id = au.id
    )
  LOOP
    v_result := public.student_self_link(v_user.id);
    RAISE NOTICE '[student_self_link] user=% email=% result=%', v_user.id, v_user.email, v_result;
  END LOOP;
END $$;

-- ============================================================
-- (3b) BACKFILL especial — se um invite tem status='accepted' mas
--      accepted_by IS NULL, e existe um user cujo email bate com
--      invite.email OU cujo signup aconteceu nas últimas 24h
--      após a criação do invite, vincula esse user ao invite.
-- ============================================================

UPDATE public.student_invites si
SET accepted_by = (
  SELECT au.id FROM auth.users au
  WHERE LOWER(au.email) = LOWER(si.email)
  ORDER BY au.created_at DESC
  LIMIT 1
)
WHERE si.status = 'accepted'
  AND si.accepted_by IS NULL
  AND si.email IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM auth.users au WHERE LOWER(au.email) = LOWER(si.email)
  );

-- Cria student_profile pra invites com accepted_by agora preenchido
INSERT INTO public.student_profiles (
  user_id, trainer_id, full_name, phone, goal, status, joined_at
)
SELECT
  si.accepted_by, si.trainer_id, si.full_name, si.phone, si.goal,
  'active', COALESCE(si.accepted_at, now())
FROM public.student_invites si
LEFT JOIN public.student_profiles sp ON sp.user_id = si.accepted_by
WHERE si.status = 'accepted'
  AND si.accepted_by IS NOT NULL
  AND sp.user_id IS NULL
ON CONFLICT (user_id) DO UPDATE
  SET trainer_id = EXCLUDED.trainer_id,
      full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.student_profiles.full_name),
      phone = COALESCE(NULLIF(EXCLUDED.phone, ''), public.student_profiles.phone),
      goal = COALESCE(NULLIF(EXCLUDED.goal, ''), public.student_profiles.goal),
      status = 'active';

-- Atualiza profile.role pra 'student'
UPDATE public.profiles p
SET role = 'student'::user_role
FROM public.student_invites si
WHERE si.accepted_by = p.id
  AND si.status = 'accepted'
  AND p.role <> 'student'::user_role;

-- ============================================================
-- (4) BACKFILL full_name vazio — pra alunos que existem mas têm nome vazio
-- ============================================================

-- 4a. profiles.full_name vazio + invite aceito
UPDATE public.profiles p
SET full_name = COALESCE(NULLIF(p.full_name, ''), si.full_name),
    phone = COALESCE(NULLIF(p.phone, ''), si.phone)
FROM public.student_invites si
WHERE si.accepted_by = p.id
  AND si.status = 'accepted'
  AND (p.full_name = '' OR p.full_name IS NULL);

-- 4b. student_profiles.full_name vazio + invite aceito
UPDATE public.student_profiles sp
SET full_name = COALESCE(NULLIF(sp.full_name, ''), si.full_name),
    phone = COALESCE(NULLIF(sp.phone, ''), si.phone),
    goal = COALESCE(NULLIF(sp.goal, ''), si.goal)
FROM public.student_invites si
WHERE si.accepted_by = sp.user_id
  AND si.status = 'accepted';

-- ============================================================
-- (5) DIAGNÓSTICO — view com o estado atual de invites/profiles
--     Útil pra debugar via Supabase SQL editor:
--     SELECT * FROM public.diagnostic_invites;
-- ============================================================

DROP VIEW IF EXISTS public.diagnostic_invites_v2;
CREATE VIEW public.diagnostic_invites_v2 AS
SELECT
  au.id AS user_id,
  au.email AS user_email,
  p.full_name AS profile_name,
  p.role AS profile_role,
  sp.user_id AS has_student_profile,
  sp.trainer_id AS student_trainer_id,
  sp.full_name AS student_name,
  sp.status AS student_status,
  si.id AS invite_id,
  si.code AS invite_code,
  si.email AS invite_email,
  si.full_name AS invite_name,
  si.status AS invite_status,
  si.accepted_by AS invite_accepted_by,
  si.trainer_id AS invite_trainer_id,
  au_trainer.email AS trainer_email
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
LEFT JOIN public.student_profiles sp ON sp.user_id = au.id
LEFT JOIN public.student_invites si ON si.accepted_by = au.id
LEFT JOIN auth.users au_trainer ON au_trainer.id = COALESCE(sp.trainer_id, si.trainer_id)
WHERE p.role = 'student' OR si.accepted_by = au.id
ORDER BY au.created_at DESC;

GRANT SELECT ON public.diagnostic_invites_v2 TO authenticated, service_role;

-- ============================================================
-- (6) COMANDO MANUAL pra trainer usar quando um aluno ficou solto
--     (caso extremo — preferir usar /app/students → "Vincular manualmente")
--
-- Substitua 'ALUNO_EMAIL' pelo email real do aluno:
--   SELECT public.manual_claim_student('ALUNO_EMAIL', 'auth.uid()');
-- ============================================================

CREATE OR REPLACE FUNCTION public.manual_claim_student(
  p_email TEXT,
  p_trainer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_full_name TEXT;
BEGIN
  -- 1. Acha user pelo email
  SELECT id, raw_user_meta_data->>'full_name'
  INTO v_user_id, v_user_full_name
  FROM auth.users
  WHERE LOWER(email) = LOWER(p_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  -- 2. Garante trainer_profile existe
  INSERT INTO public.trainer_profiles (user_id, plan_tier, trial_ends_at)
  VALUES (p_trainer_id, 'start', now() + interval '30 days')
  ON CONFLICT (user_id) DO NOTHING;

  -- 3. Garante profile do aluno existe
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (v_user_id, COALESCE(v_user_full_name, p_email), 'student')
  ON CONFLICT (id) DO UPDATE
    SET role = 'student';

  -- 4. Cria/atualiza student_profile
  INSERT INTO public.student_profiles (
    user_id, trainer_id, full_name, status, joined_at
  )
  VALUES (v_user_id, p_trainer_id, COALESCE(v_user_full_name, p_email), 'active', now())
  ON CONFLICT (user_id) DO UPDATE
    SET trainer_id = EXCLUDED.trainer_id,
        status = 'active';

  -- 5. Marca invites pending do trainer pra esse email como aceitos
  UPDATE public.student_invites
  SET status = 'accepted',
      accepted_by = v_user_id,
      accepted_at = now()
  WHERE trainer_id = p_trainer_id
    AND status = 'pending'
    AND (LOWER(email) = LOWER(p_email) OR email IS NULL);

  RETURN jsonb_build_object(
    'ok', true,
    'student_id', v_user_id,
    'trainer_id', p_trainer_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.manual_claim_student(TEXT, UUID) TO authenticated, service_role;

COMMENT ON FUNCTION public.manual_claim_student(TEXT, UUID) IS
'Comando manual pra trainer vincular aluno solto via email. Usar só se a UI de Vincular Manualmente falhar.';
