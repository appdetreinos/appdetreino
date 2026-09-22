-- Migration 0023 — Adiciona `position` em meal_items
--
-- Resolve bug onde meal_items eram ordenados por UUID lexicográfico no /aluno/dieta.
-- Agora respeitam `position` (igual workout_items).

ALTER TABLE public.meal_items
  ADD COLUMN IF NOT EXISTS position INT NOT NULL DEFAULT 0;

-- Backfill: ordena por id (criação) pra ter ordem razoável pros rows existentes
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY meal_id ORDER BY id) - 1 AS pos
  FROM public.meal_items
)
UPDATE public.meal_items mi
SET position = ranked.pos
FROM ranked
WHERE mi.id = ranked.id;

CREATE INDEX IF NOT EXISTS idx_meal_items_meal_position
  ON public.meal_items(meal_id, position);
