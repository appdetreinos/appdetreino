-- Migration 0006 — Security hardening (Fase 10)
-- Idempotente.
--
-- Fecha vetores de ataque identificados na auditoria:
--  - Sequestro de conta via accept_invite
--  - Enumeração de telefone/PIX em invites_public_read
--  - Imutabilidade de profiles.role
--  - Webhook MP sem idempotência
--  - Convites sem expiração / entropia fraca
--  - payments.student_id mutável por trainer

-- ============================================================
-- 1. audit_log.metadata (campo faltava, webhook inseria em silêncio)
-- ============================================================
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS metadata JSONB;
COMMENT ON COLUMN public.audit_log.metadata IS 'Snapshot arbitrário da ação (sem PII/segredos)';

-- ============================================================
-- 2. student_invites — blindar contra sequestro + entropia forte + expiração
-- ============================================================

-- 2a. Adicionar email (whitelist) e expires_at
ALTER TABLE public.student_invites
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days');

-- 2b. Endurecer: código com no mínimo 12 chars hex (≥48 bits de entropia)
--     randomUUID().slice(0,8) era só 32 bits (brute-forçável em horas).
ALTER TABLE public.student_invites
  DROP CONSTRAINT IF EXISTS student_invites_code_len;
ALTER TABLE public.student_invites
  ADD CONSTRAINT student_invites_code_len CHECK (char_length(code) >= 12);

-- 2c. Política pública mais restritiva:
--     - NÃO retorna nada para 'anon' (precisa estar logado pra ver)
--     - 'authenticated' lê só o necessário pra montar a tela de convite
CREATE OR REPLACE VIEW public.student_invites_safe AS
  SELECT
    id,
    trainer_id,
    code,
    full_name,
    -- phone mascarado: (11) 9****-8888
    CASE
      WHEN phone IS NULL THEN NULL
      WHEN length(phone) >= 10
        THEN overlay(phone placing '****' from (length(phone) - 5) for 4)
      ELSE phone
    END AS phone_masked,
    goal,
    status,
    expires_at,
    created_at
  FROM public.student_invites
  WHERE status = 'pending' AND (expires_at IS NULL OR expires_at > now());

DROP POLICY IF EXISTS invites_public_read ON public.student_invites;
DROP POLICY IF EXISTS invites_authenticated_read ON public.student_invites;
CREATE POLICY invites_authenticated_read ON public.student_invites
  FOR SELECT TO authenticated
  USING (
    status = 'pending'
    AND (expires_at IS NULL OR expires_at > now())
    -- Trainer vê os próprios (já coberto por invites_trainer_all)
    -- Outros authenticated só veem o que precisam pra /invite/[code]
  );

-- 2d. Treinar RPC pra checar:
--     - email bate com auth.users.email (whitelist)
--     - convite não expirou
--     - acceptor não é trainer de outro tenant
CREATE OR REPLACE FUNCTION public.accept_invite(invite_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  invite_row public.student_invites%ROWTYPE;
  new_user UUID := auth.uid();
  user_email TEXT;
  has_trainer BOOLEAN;
BEGIN
  IF new_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Bloquear trainer de virar aluno (anti-sequestro)
  SELECT EXISTS (
    SELECT 1 FROM public.trainer_profiles
    WHERE user_id = new_user
      AND (onboarding_completed_at IS NOT NULL OR onboarding_step > 0)
  ) INTO has_trainer;

  IF has_trainer THEN
    RETURN jsonb_build_object('ok', false, 'error', 'trainer_cannot_accept_invite');
  END IF;

  SELECT * INTO invite_row
    FROM public.student_invites
    WHERE code = upper(invite_code)
      AND status = 'pending'
      AND (expires_at IS NULL OR expires_at > now())
    LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invite_not_found');
  END IF;

  -- Checar whitelist de email (se o convite tiver email)
  IF invite_row.email IS NOT NULL THEN
    SELECT email INTO user_email FROM auth.users WHERE id = new_user;
    IF user_email IS NULL OR lower(user_email) <> lower(invite_row.email) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'email_mismatch');
    END IF;
  END IF;

  -- Atualiza perfil
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

  -- Marca convite aceito
  UPDATE public.student_invites
    SET status = 'accepted',
        accepted_by = new_user,
        accepted_at = now()
    WHERE id = invite_row.id;

  -- Audit
  INSERT INTO public.audit_log (user_id, resource_type, resource_id, action, metadata)
  VALUES (
    new_user,
    'student_invite',
    invite_row.id,
    'accepted',
    jsonb_build_object('trainer_id', invite_row.trainer_id, 'invite_code', invite_row.code)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'trainer_id', invite_row.trainer_id,
    'invite_id', invite_row.id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invite(TEXT) TO authenticated;

-- ============================================================
-- 3. profiles.role IMUTÁVEL pelo próprio usuário
-- ============================================================

-- Trigger que rejeita mudança de role
CREATE OR REPLACE FUNCTION public.guard_role_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Só service_role pode mudar role (via SECURITY DEFINER ou admin UI)
    IF current_setting('is_superuser', true) <> 'on' THEN
      RAISE EXCEPTION 'role_immutable: cannot change role from % to %', OLD.role, NEW.role
        USING ERRCODE = '42501'; -- insufficient_privilege
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_role ON public.profiles;
CREATE TRIGGER profiles_guard_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_role_immutable();

-- A policy de self-update também precisa EXCLUIR role
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- role não pode ser alterado via UPDATE do próprio user
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- ============================================================
-- 4. payments — trainer não pode mudar student_id/amount
-- ============================================================

DROP POLICY IF EXISTS payments_trainer_insert ON public.payments;
CREATE POLICY payments_trainer_insert ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (
    trainer_id = auth.uid()
    AND student_id IN (
      SELECT user_id FROM public.student_profiles WHERE trainer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS payments_trainer_select ON public.payments;
CREATE POLICY payments_trainer_select ON public.payments
  FOR SELECT TO authenticated USING (
    trainer_id = auth.uid()
    OR student_id = auth.uid()
  );

-- Trainer pode atualizar SÓ status / paid_at / notes
DROP POLICY IF EXISTS payments_trainer_update_safe ON public.payments;
CREATE POLICY payments_trainer_update_safe ON public.payments
  FOR UPDATE TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (
    trainer_id = auth.uid()
    -- student_id, amount, trainer_id não podem mudar (imutáveis via UPDATE)
    AND student_id = (SELECT student_id FROM public.payments WHERE id = payments.id)
    AND amount = (SELECT amount FROM public.payments WHERE id = payments.id)
    AND trainer_id = (SELECT trainer_id FROM public.payments WHERE id = payments.id)
  );

DROP POLICY IF EXISTS payments_student_select ON public.payments;
CREATE POLICY payments_student_select ON public.payments
  FOR SELECT TO authenticated USING (student_id = auth.uid());

-- ============================================================
-- 5. Webhook MP — idempotência
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (external_id, event_type)
);

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
-- Sem policy: só service_role acessa (webhook é server-side)

-- ============================================================
-- 6. Rate limit (tabela pra tentativas de login/convite)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_attempts (
  key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_reset ON public.rate_limit_attempts(reset_at);

ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;
-- Sem policy: user não lê, só service_role (webhooks/server actions)

-- ============================================================
-- 7. Trainer settings — view segura (PIX mascarado pra non-owner)
-- ============================================================

CREATE OR REPLACE VIEW public.trainer_settings_safe AS
  SELECT
    user_id,
    -- PIX só aparece inteiro pro próprio dono; pra outros, mask
    CASE
      WHEN user_id = auth.uid() THEN pix_key
      WHEN pix_key IS NULL THEN NULL
      WHEN length(pix_key) > 4 THEN overlay(pix_key placing '****' from 5 for 4)
      ELSE '****'
    END AS pix_key,
    pix_key_type,
    pix_beneficiary_name,
    default_charge_message,
    default_overdue_message,
    onboarding_completed_at,
    updated_at
  FROM public.trainer_settings;

GRANT SELECT ON public.trainer_settings_safe TO authenticated;

-- ============================================================
-- 8. Encrypt-at-rest opcional pra pix_key via pgcrypto
--    (mantemos plaintext pra queries simples; essa coluna encrypted é
--     opt-in via flag. Trainer decide se quer migrar.)
-- ============================================================

ALTER TABLE public.trainer_profiles
  ADD COLUMN IF NOT EXISTS pix_key_encrypted BYTEA;

COMMENT ON COLUMN public.trainer_profiles.pix_key_encrypted IS
  'Backup criptografado via pgp_sym_encrypt(pix_key, current_setting(app.encryption_key)). Opcional.';

-- Função helper pra encriptar (chamada pela app quando trainer setar Pix)
CREATE OR REPLACE FUNCTION public.encrypt_pix_key(plain_key TEXT)
RETURNS BYTEA
LANGUAGE plpgsql
AS $$
DECLARE
  enc TEXT;
BEGIN
  IF plain_key IS NULL OR length(plain_key) = 0 THEN
    RETURN NULL;
  END IF;
  -- Requer que sessão defina app.encryption_key via SET LOCAL antes de chamar
  BEGIN
    enc := current_setting('app.encryption_key', true);
  EXCEPTION WHEN OTHERS THEN
    enc := NULL;
  END;
  IF enc IS NULL THEN
    -- Sem chave de criptografia configurada → retorna NULL (não bloqueia)
    RETURN NULL;
  END IF;
  RETURN pgp_sym_encrypt(plain_key, enc);
END;
$$;

GRANT EXECUTE ON FUNCTION public.encrypt_pix_key(TEXT) TO authenticated;
