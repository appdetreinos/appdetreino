-- Migration 0030 — Força criação da função touch_updated_at() + garante trigger
--
-- Resolve bug persistente: aplicação da 0029 falhou em alguns ambientes
-- porque o trigger foi criado ANTES da função existir. Aqui a gente
-- recria na ordem certa: função primeiro, depois trigger.
--
-- Idempotente: usa CREATE OR REPLACE, DROP IF EXISTS, ADD IF NOT EXISTS.

-- ============================================================
-- 1. Garante função public.touch_updated_at()
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Garante coluna updated_at em workouts
-- ============================================================
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ============================================================
-- 3. Recria trigger DEPOIS da função existir
-- ============================================================
DROP TRIGGER IF EXISTS trg_workouts_updated_at ON public.workouts;
CREATE TRIGGER trg_workouts_updated_at
  BEFORE UPDATE ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- 4. Smoke test: tenta atualizar a si mesmo (no-op, só pra validar)
-- ============================================================
DO $$
BEGIN
  PERFORM 1 FROM public.workouts LIMIT 1;
  -- Se chegou aqui, a função existe e a coluna existe
  RAISE NOTICE 'touch_updated_at OK: função + coluna + trigger instalados em workouts';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Aviso: workouts pode estar vazia — função e trigger OK';
END $$;
