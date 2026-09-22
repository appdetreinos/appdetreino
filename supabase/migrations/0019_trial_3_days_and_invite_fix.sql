-- Migration 0019 — Trial de 3 dias + blindagem do lookup de convite
--
-- Idempotente.
--
-- Resolve 2 bugs reportados:
--   (A) Trainer novo cai direto em "Start R$ 59,90/Mês" sem aparecer os
--       3 dias de trial grátis. Falta trigger que seta trial_ends_at no
--       signup + backfill dos existentes.
--   (B) Página /invite/[code] mostra "Convite não encontrado" mesmo com
--       code válido. Causa provável: view student_invites_safe referencia
--       coluna expires_at, e se algum convite foi criado SEM essa coluna
--       o filtro `expires_at > now()` quebra. Defesa: blindar a view.
-- ============================================================

-- ============================================================
-- PARTE A — TRIAL DE 3 DIAS
-- ============================================================

-- 1. Backfill: todo trainer que ainda não tem trial_ends_at
--    ganha 3 dias a partir de agora. (Trainers que já pagaram
--    têm trial_ends_at NOT NULL vindo do MP webhook — preservado.)
UPDATE public.trainer_profiles
  SET trial_ends_at = now() + interval '3 days'
  WHERE trial_ends_at IS NULL;

-- 2. Trigger: quando um profile vira trainer (signup), cria
--    trainer_profiles com trial de 3 dias. Backstop caso o
--    handle_new_user não tenha setado.

CREATE OR REPLACE FUNCTION public.handle_trainer_trial()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role = 'trainer' THEN
    INSERT INTO public.trainer_profiles (user_id, plan_tier, trial_ends_at)
    VALUES (NEW.id, 'start', now() + interval '3 days')
    ON CONFLICT (user_id) DO UPDATE
      SET trial_ends_at = COALESCE(
        public.trainer_profiles.trial_ends_at,
        EXCLUDED.trial_ends_at
      );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_trial_grant ON public.profiles;
CREATE TRIGGER profiles_trial_grant
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role = 'trainer')
  EXECUTE FUNCTION public.handle_trainer_trial();

-- 3. Função helper: trainer está em trial ativo?
--    Usado pelo front pra mostrar "3 dias grátis restantes" em vez de "Start R$ 59,90".

CREATE OR REPLACE FUNCTION public.is_trainer_in_trial(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trainer_profiles
    WHERE user_id = p_user_id
      AND trial_ends_at IS NOT NULL
      AND trial_ends_at > now()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_trainer_in_trial(UUID) TO authenticated;

COMMENT ON FUNCTION public.is_trainer_in_trial IS
  'TRUE se o trainer está no período de trial (trial_ends_at > now()). NULL trial_ends_at = nunca teve trial.';

-- ============================================================
-- PARTE B — BLINDAGEM DO LOOKUP DE CONVITE
-- ============================================================

-- 1. Garante coluna expires_at (pode estar faltando em algum
--    banco onde 0006 rodou parcialmente)
ALTER TABLE public.student_invites
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days');

-- 2. Backfill: convites antigos sem expires_at ganham 7 dias
UPDATE public.student_invites
  SET expires_at = created_at + interval '7 days'
  WHERE expires_at IS NULL;

-- 3. Drop e recria view SEM o filtro estrito de expires_at.
--    Se um convite estiver expirado, a página mostra msg clara,
--    em vez de "não encontrado" silencioso.
DROP VIEW IF EXISTS public.student_invites_safe CASCADE;

CREATE VIEW public.student_invites_safe AS
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
  FROM public.student_invites;

-- 4. Reaplica GRANT (foi perdido no CASCADE)
GRANT SELECT ON public.student_invites_safe TO anon, authenticated;

COMMENT ON VIEW public.student_invites_safe IS
  'View pública de convites. NÃO filtra por status/expires_at — a página /invite/[code] trata cada caso (pending/accepted/expired) com msg própria.';

-- ============================================================
-- PARTE C — VIEW AUXILIAR: status do convite legível
-- ============================================================
-- Permite ao front saber se o convite está pendente, aceito ou
-- expirado SEM precisar fazer várias queries.

CREATE OR REPLACE FUNCTION public.invite_status_label(p_code TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM public.student_invites WHERE code = upper(p_code)
    ) THEN 'not_found'
    WHEN EXISTS (
      SELECT 1 FROM public.student_invites
      WHERE code = upper(p_code) AND status = 'accepted'
    ) THEN 'accepted'
    WHEN EXISTS (
      SELECT 1 FROM public.student_invites
      WHERE code = upper(p_code)
        AND status = 'pending'
        AND expires_at IS NOT NULL
        AND expires_at < now()
    ) THEN 'expired'
    WHEN EXISTS (
      SELECT 1 FROM public.student_invites
      WHERE code = upper(p_code) AND status = 'revoked'
    ) THEN 'revoked'
    ELSE 'pending'
  END;
$$;

GRANT EXECUTE ON FUNCTION public.invite_status_label(TEXT) TO anon, authenticated;

COMMENT ON FUNCTION public.invite_status_label IS
  'Retorna status legível do convite: not_found | pending | accepted | expired | revoked.';
