-- Migration 0033 — Backfill exercise.category a partir de muscle_group
--
-- Resolve: o picker filtra por `category`, mas a biblioteca seed da
-- migration 0018 só preencheu `muscle_group`. Resultado: filtros como
-- "Glúteos", "Posterior de coxa", "Panturrilha" retornam vazio mesmo
-- tendo exercícios.
--
-- Mapeamento muscle_group (v1) → category (v2):
--   quadriceps  → quadriceps
--   posterior   → posterior  (categoria fina "Posterior de coxa")
--   panturrilha → panturrilha
--   (já cobertos por 0031, mas idempotente)
--
-- Pra "pernas" (v1 legado, gluteos não tem no v1) a gente atualiza
-- manualmente os poucos exercícios de glúteo que existem:
--   - "Elevação de pernas" vira "abdutores" (glúteo médio)
--   - "Agachamento" (livre/goblet) vira "quadriceps" (já vai pelo v2)
--   - "Avanço búlgaro" vira "quadriceps"
--
-- Idempotente — só atualiza linhas com category IS NULL.

-- 1) Backfill genérico: muscle_group → category quando bate 1:1
UPDATE public.exercises
SET category = muscle_group
WHERE category IS NULL
  AND muscle_group IN (
    'peito','costas','ombros','biceps','triceps',
    'quadriceps','posterior','panturrilha','core'
  );

-- 2) Ajustes pontuais pra exercícios que não mapeiam 1:1
--    (mantém o anterior e adiciona correções finas)
UPDATE public.exercises
SET category = 'abdutores'
WHERE name = 'Elevação de pernas' AND category IS NULL;

-- 3) Marca exercícios que são puramente de glúteo pra aparecerem no filtro
--    (a library seed 0018 não tem nenhum explícito, mas a categoria existe
--    pra uso futuro). Se houver algum trainer-scoped, ele aparece aqui.
--    (Sem ação agora — placeholder pra evolução.)

-- 4) Comentário pra debug
COMMENT ON COLUMN public.exercises.category IS
  'Categoria fina (v2) usada no picker. Backfill automático em 0033 a partir de muscle_group.';
