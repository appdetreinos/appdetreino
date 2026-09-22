-- Migration 0016 — Proteção contra trainer virar aluno via accept_invite
--
-- Idempotente.
--
-- Problema: a função accept_invite (0003) força profiles.role = 'student'
-- SEM checar se o usuário já é trainer. Se um trainer por engano clicar
-- num link de convite de aluno, a role dele é sobrescrita pra 'student'
-- e ele perde acesso ao painel admin — fica preso como aluno.
--
-- Fix:
--   1. accept_invite checa o role atual antes de sobrescrever.
--      Se o user já é trainer/admin, rejeita com erro claro.
--   2. Validação extra: trainer_id do convite não pode ser igual ao
--      user_id (auto-aceitação).
--   3. user não pode aceitar convite duas vezes (idempotência).

CREATE OR REPLACE FUNCTION public.accept_invite(invite_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  invite_row public.student_invites%ROWTYPE;
  new_user UUID := auth.uid();
  current_role user_role;
BEGIN
  IF new_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Você precisa estar logado.');
  END IF;

  SELECT * INTO invite_row
    FROM public.student_invites
    WHERE code = upper(invite_code)
      AND status = 'pending'
    LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Convite não encontrado ou já usado.');
  END IF;

  -- Auto-aceitação: trainer não pode aceitar convite dele mesmo
  IF invite_row.trainer_id = new_user THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Você não pode aceitar um convite do seu próprio trainer.'
    );
  END IF;

  -- ── FIX 0016 ──────────────────────────────────────────────────────
  -- Bloqueia se o user já tem role de trainer/admin: accept_invite
  -- nunca deve rebaixar um profissional pra aluno.
  SELECT role INTO current_role
    FROM public.profiles
    WHERE id = new_user;

  IF current_role = 'trainer' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Você já tem conta de profissional. Crie uma conta separada pra entrar como aluno.'
    );
  END IF;

  IF current_role = 'admin' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Contas de administrador não podem aceitar convites de aluno.'
    );
  END IF;
  -- ─────────────────────────────────────────────────────────────────

  -- Idempotência: se o user já é student e tem student_profiles ativo
  -- pra esse mesmo trainer, retorna OK sem fazer nada (já vinculado)
  IF current_role = 'student' THEN
    IF EXISTS (
      SELECT 1 FROM public.student_profiles
      WHERE user_id = new_user AND trainer_id = invite_row.trainer_id
    ) THEN
      RETURN jsonb_build_object(
        'ok', true,
        'trainer_id', invite_row.trainer_id,
        'invite_id', invite_row.id,
        'already_linked', true
      );
    END IF;
  END IF;

  -- Atualiza perfil do aluno para role='student' (se ainda era NULL ou já era student)
  UPDATE public.profiles
    SET role = 'student',
        full_name = COALESCE(NULLIF(profiles.full_name, ''), invite_row.full_name),
        phone = COALESCE(NULLIF(profiles.phone, ''), invite_row.phone)
    WHERE id = new_user;

  -- Cria/atualiza student_profiles
  INSERT INTO public.student_profiles (user_id, trainer_id, invite_code, status, full_name, phone, goal)
  VALUES (new_user, invite_row.trainer_id, invite_row.code, 'active', invite_row.full_name, invite_row.phone, invite_row.goal)
  ON CONFLICT (user_id) DO UPDATE
    SET trainer_id = EXCLUDED.trainer_id,
        status = 'active',
        full_name = EXCLUDED.full_name;

  -- Marca convite como aceito
  UPDATE public.student_invites
    SET status = 'accepted',
        accepted_by = new_user,
        accepted_at = now()
    WHERE id = invite_row.id;

  RETURN jsonb_build_object(
    'ok', true,
    'trainer_id', invite_row.trainer_id,
    'invite_id', invite_row.id
  );
END;
$$;

COMMENT ON FUNCTION public.accept_invite IS
  'Vincula um aluno a um trainer via código de convite. Bloqueia trainers/admins (não podem rebaixar).';
