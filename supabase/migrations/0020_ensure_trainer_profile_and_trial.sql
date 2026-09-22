-- Migration 0020 — Garantia de trainer_profile + trial pra todos os trainers
--
-- Idempotente. Resolve 3 bugs REAIS reportados em 2026-09-22:
--   (1) Trainer sem trainer_profiles → FK violation em student_invites
--   (2) Trainer sem trial_ends_at → cai direto em "Start R$ 59,90"
--   (3) Onboarding wizard não fecha (FK do trainer_profile quebrada)
--
-- Estratégia: 2-pass pra cobrir TODOS os casos, mesmo trainers órfãos.

-- ============================================================
-- PASSO 1 — Garante trainer_profiles pra CADA profile com role='trainer'
-- ============================================================

INSERT INTO public.trainer_profiles (user_id, plan_tier, trial_ends_at)
SELECT p.id, 'start', now() + interval '3 days'
FROM public.profiles p
LEFT JOIN public.trainer_profiles tp ON tp.user_id = p.id
WHERE p.role = 'trainer'
  AND tp.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- PASSO 2 — Garante trial_ends_at em TODO trainer_profiles que tá NULL
-- ============================================================
-- Cobre 2 cenários:
--   a) trainer_profile criado mas sem trial (significa que 0019 não rodou
--      antes do signup, OU o user foi criado antes da 0019)
--   b) trainer_profile criado pela trigger 0019 mas trial_ends_at foi
--      apagado por algum update

UPDATE public.trainer_profiles
  SET trial_ends_at = now() + interval '3 days'
  WHERE trial_ends_at IS NULL;

-- ============================================================
-- PASSO 3 — Trigger à prova de bala: cria trainer_profiles se faltar
-- quando o profile virar trainer
-- ============================================================
-- (Reforça o trigger da 0019 que por algum motivo não disparou em
--  alguns cadastros)

CREATE OR REPLACE FUNCTION public.ensure_trainer_profile()
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

-- Dropa a antiga (da 0019) se existir com nome diferente, recria
DROP TRIGGER IF EXISTS profiles_trial_grant ON public.profiles;
DROP TRIGGER IF EXISTS profiles_ensure_trainer ON public.profiles;
CREATE TRIGGER profiles_ensure_trainer
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role = 'trainer')
  EXECUTE FUNCTION public.ensure_trainer_profile();

-- ============================================================
-- PASSO 4 — Marca o wizard como "completo" pra trainers órfãos
-- ============================================================
-- Se já tem actuation ou trial_ends_at preenchido, o user JÁ PASSOU
-- pelo wizard em algum momento. Marca onboarding_completed_at pra
-- não ficar re-apresentando o modal.

UPDATE public.trainer_profiles tp
  SET onboarding_completed_at = COALESCE(tp.onboarding_completed_at, now())
  WHERE tp.actuation IS NOT NULL
    AND tp.onboarding_completed_at IS NULL;

-- Também: pra trainers SEM actuation que tenham ao menos criado algo
-- (aluno, treino, dieta, pagamento) — também marca como completo
UPDATE public.trainer_profiles tp
  SET onboarding_completed_at = COALESCE(tp.onboarding_completed_at, now())
  WHERE tp.onboarding_completed_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.student_invites WHERE trainer_id = tp.user_id
    );

-- ============================================================
-- VERIFICAÇÃO (retorna resumo)
-- ============================================================
-- Pra rodar separado como diagnóstico:
-- SELECT
--   (SELECT count(*) FROM public.profiles WHERE role = 'trainer') AS total_trainers,
--   (SELECT count(*) FROM public.trainer_profiles) AS total_trainer_profiles,
--   (SELECT count(*) FROM public.trainer_profiles WHERE trial_ends_at IS NULL) AS sem_trial,
--   (SELECT count(*) FROM public.trainer_profiles WHERE onboarding_completed_at IS NULL) AS wizard_aberto;
