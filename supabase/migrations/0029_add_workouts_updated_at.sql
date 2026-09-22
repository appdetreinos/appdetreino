-- Migration 0029 — Adiciona coluna updated_at em workouts
--
-- Resolve bug: página /app/workouts tentava selecionar e ordenar por
-- updated_at mas a coluna não existia (workouts só tem created_at).
--
-- Idempotente: usa IF NOT EXISTS no ADD COLUMN (Postgres 9.6+).

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Trigger pra manter updated_at automático em UPDATE
DROP TRIGGER IF EXISTS trg_workouts_updated_at ON public.workouts;
CREATE TRIGGER trg_workouts_updated_at
  BEFORE UPDATE ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Cria a função touch_updated_at se não existir (helper genérico)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
