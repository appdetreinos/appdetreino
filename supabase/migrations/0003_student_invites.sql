-- ============================================================
-- Migration 0003: Convites de aluno pré-cadastro
-- ============================================================
-- O trainer cadastra um aluno gerando um invite_code. O aluno
-- recebe o link, se cadastra no /register com role='student',
-- e o trigger handle_new_user dispara a criação do profiles.
-- Em seguida, um RPC accept_invite vincula o user ao trainer
-- usando o invite_code e o trainer_id gravados aqui.

CREATE TABLE IF NOT EXISTS public.student_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.trainer_profiles(user_id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  goal TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invites_trainer ON public.student_invites(trainer_id);
CREATE INDEX IF NOT EXISTS idx_invites_code ON public.student_invites(code);
CREATE INDEX IF NOT EXISTS idx_invites_status ON public.student_invites(status);

ALTER TABLE public.student_invites ENABLE ROW LEVEL SECURITY;

-- Trainer lê/escreve os próprios convites
DROP POLICY IF EXISTS invites_trainer_all ON public.student_invites;
CREATE POLICY invites_trainer_all ON public.student_invites
  FOR ALL
  USING (
    trainer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (trainer_id = auth.uid());

-- Convidado (não-autenticado ou autenticado como aluno) pode LER o convite
-- se tiver o código — usado na página /invite/[code]
DROP POLICY IF EXISTS invites_public_read ON public.student_invites;
CREATE POLICY invites_public_read ON public.student_invites
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- RPC: accept_invite — aluno aceita convite e vira aluno do trainer
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_invite(invite_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  invite_row public.student_invites%ROWTYPE;
  new_user UUID := auth.uid();
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

  -- Atualiza perfil do aluno para role='student' (sobrescreve se veio de signup como trainer)
  UPDATE public.profiles
    SET role = 'student',
        full_name = COALESCE(NULLIF(profiles.full_name, ''), invite_row.full_name),
        phone = COALESCE(NULLIF(profiles.phone, ''), invite_row.phone)
    WHERE id = new_user;

  -- Cria student_profiles se ainda não existe (PK = auth.uid())
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

GRANT EXECUTE ON FUNCTION public.accept_invite(TEXT) TO authenticated;
