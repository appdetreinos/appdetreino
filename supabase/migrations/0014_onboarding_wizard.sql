-- Migration 0014 — Onboarding wizard do profissional (4 etapas)
--
-- Idempotente: pode rodar múltiplas vezes.
--
-- Adiciona 3 campos TEXT livres (não-ENUM pra deixar flexível a
-- mudanças de copy sem migration nova):
--   - actuation        : "personal" | "nutri" | "ambos" | "coach"
--   - client_volume    : faixa de alunos ativos
--   - monthly_revenue  : faixa de faturamento mensal
--
-- Esses dados alimentam personalização do dashboard (copy, plano
-- sugerido na etapa 4) e ajudam o time de produto a entender o
-- perfil do trainer no signup.
--
-- RLS: trainer_profiles já tem "trainer_self_update" (0001_init),
-- então trainer pode atualizar só a própria linha.

ALTER TABLE public.trainer_profiles
  ADD COLUMN IF NOT EXISTS actuation TEXT,
  ADD COLUMN IF NOT EXISTS client_volume TEXT,
  ADD COLUMN IF NOT EXISTS monthly_revenue TEXT;

-- Constraint leve: garante que, se preenchido, o valor é um dos
-- conhecidos. NULL é aceito (preenchimento é progressivo nas 4 etapas).
DO $$ BEGIN
  ALTER TABLE public.trainer_profiles
    ADD CONSTRAINT trainer_profiles_actuation_chk
    CHECK (actuation IS NULL OR actuation IN ('personal','nutri','ambos','coach'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.trainer_profiles
    ADD CONSTRAINT trainer_profiles_client_volume_chk
    CHECK (client_volume IS NULL OR client_volume IN ('ate_25','26_50','51_100','mais_100'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.trainer_profiles
    ADD CONSTRAINT trainer_profiles_revenue_chk
    CHECK (monthly_revenue IS NULL OR monthly_revenue IN ('ate_5k','5k_10k','10k_30k','acima_30k'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Comentários pra DX
COMMENT ON COLUMN public.trainer_profiles.actuation IS
  'Como o profissional atua: personal | nutri | ambos | coach. Coletado no onboarding.';
COMMENT ON COLUMN public.trainer_profiles.client_volume IS
  'Faixa de clientes ativos: ate_25 | 26_50 | 51_100 | mais_100. Coletado no onboarding.';
COMMENT ON COLUMN public.trainer_profiles.monthly_revenue IS
  'Faixa de faturamento mensal: ate_5k | 5k_10k | 10k_30k | acima_30k. Coletado no onboarding.';
COMMENT ON COLUMN public.trainer_profiles.onboarding_step IS
  'Etapa atual do wizard de onboarding (0=não começou, 1-4=etapas, 4=concluído).';
