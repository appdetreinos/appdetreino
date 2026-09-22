-- Migration 0032 — Templates hierárquicos (Tipo > Grupo > Exercícios)
--
-- Resolve: "catalogo ja pronto quando o trainer for montar, organizado
-- por tipo de treino (push/pull/legs/upper/lower/full_body)".
--
-- Mudanças:
--   1. workout_templates ganha coluna template_type (hierarquia 1)
--   2. Nova tabela workout_template_groups (hierarquia 2: grupos musculares)
--   3. RLS em workout_template_groups (segue regra do template pai)
--   4. Seed de 9 templates novos (Push A/B, Pull A/B, Legs A/B, Upper C, Lower A, Full Body C)
--   5. Seed de grupos (~28 rows) e itens (~46 rows) pros 9 templates
--
-- Idempotente — pode rodar mais de uma vez. Coexiste com migration 0018 (4 globais).
-- Sem PL/pgSQL (DO $$): usa só INSERT ... SELECT puro pra portabilidade total.

-- ============================================================
-- 1. Coluna template_type em workout_templates
-- ============================================================

ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS template_type TEXT
  CHECK (template_type IS NULL OR template_type IN
    ('push','pull','legs','upper','lower','full_body','cardio'));

CREATE INDEX IF NOT EXISTS idx_workout_templates_type
  ON public.workout_templates (template_type, slug);

COMMENT ON COLUMN public.workout_templates.template_type IS
  'Hierarquia 1: tipo de treino (push/pull/legs/upper/lower/full_body/cardio). NULL = template legado.';

-- ============================================================
-- 2. Tabela workout_template_groups (grupos musculares)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.workout_template_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  group_slug TEXT NOT NULL,
  position SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (template_id, group_slug)
);

CREATE INDEX IF NOT EXISTS idx_wt_groups_template
  ON public.workout_template_groups (template_id);

COMMENT ON TABLE public.workout_template_groups IS
  'Hierarquia 2: grupos musculares cobertos por cada template (peito, costas, etc).';

ALTER TABLE public.workout_template_groups ENABLE ROW LEVEL SECURITY;

-- Leitura: segue regra do template pai (global OU do próprio trainer).
DROP POLICY IF EXISTS wt_groups_read ON public.workout_template_groups;
CREATE POLICY wt_groups_read ON public.workout_template_groups
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workout_templates t
    WHERE t.id = workout_template_groups.template_id
      AND (t.is_global = true OR t.created_by = auth.uid())
  ));

-- Write (INSERT/UPDATE/DELETE) só em templates do próprio trainer, não globais.
DROP POLICY IF EXISTS wt_groups_write_own ON public.workout_template_groups;
CREATE POLICY wt_groups_write_own ON public.workout_template_groups
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workout_templates t
    WHERE t.id = workout_template_groups.template_id
      AND t.created_by = auth.uid() AND t.is_global = false
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workout_templates t
    WHERE t.id = workout_template_groups.template_id
      AND t.created_by = auth.uid() AND t.is_global = false
  ));

-- ============================================================
-- 3. Seed de 9 templates novos (com template_type)
-- ============================================================
-- Os 4 templates legados (full-body-a/b, upper-a, lower-b) ficam intactos.
-- Eles ainda usam category mas sem template_type — UI mostra os 2 grupos.

INSERT INTO public.workout_templates
  (slug, title, description, template_type, category, difficulty, estimated_minutes, is_global)
VALUES
  ('push-a', 'Push A — Peito/Ombro/Tríceps', 'Empurrar: peito composto, ombros, tríceps.', 'push', 'push', 'intermediate', 55, true),
  ('push-b', 'Push B — Inclinação + Lateral', 'Empurrar inclinado, mais lateral e tríceps.', 'push', 'push', 'intermediate', 55, true),
  ('pull-a', 'Pull A — Costas/Bíceps (barra)', 'Puxar com barra e remada unilateral.', 'pull', 'pull', 'intermediate', 55, true),
  ('pull-b', 'Pull B — Polia + Face Pull', 'Puxar na polia + face pull pra postura.', 'pull', 'pull', 'intermediate', 50, true),
  ('legs-a', 'Legs A — Quadríceps/Panturrilha', 'Agachamento + leg press + extensora + panturrilha.', 'legs', 'legs', 'intermediate', 60, true),
  ('legs-b', 'Legs B — Posterior/Glúteos', 'Stiff + mesa flexora + búlgaro.', 'legs', 'legs', 'intermediate', 60, true),
  ('upper-c', 'Upper C — Peito/Costas/Braço', 'Upper completo: supino + remada + braço.', 'upper', 'upper', 'intermediate', 65, true),
  ('lower-a', 'Lower A — Quadríceps + Posterior', 'Pernas: quadríceps dominante + posterior.', 'lower', 'lower', 'intermediate', 65, true),
  ('full-body-c', 'Full Body C — Resistência', 'Full body metabólico: 1 composto/grupo + core.', 'full_body', 'full_body', 'intermediate', 50, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 4. Seed de GRUPOS (hierarquia 2)
-- ============================================================
-- Idempotente via ON CONFLICT (template_id, group_slug).
-- Cada INSERT usa subquery (SELECT id FROM workout_templates WHERE slug = ...).

-- PUSH A: peito, ombro, tríceps
INSERT INTO public.workout_template_groups (template_id, group_slug, position)
SELECT id, g.group_slug, g.position
FROM public.workout_templates t
CROSS JOIN (VALUES
  ('peito', 1),
  ('ombro', 2),
  ('triceps', 3)
) AS g(group_slug, position)
WHERE t.slug = 'push-a'
ON CONFLICT (template_id, group_slug) DO NOTHING;

-- PUSH B: peito, ombro, tríceps
INSERT INTO public.workout_template_groups (template_id, group_slug, position)
SELECT id, g.group_slug, g.position
FROM public.workout_templates t
CROSS JOIN (VALUES
  ('peito', 1),
  ('ombro', 2),
  ('triceps', 3)
) AS g(group_slug, position)
WHERE t.slug = 'push-b'
ON CONFLICT (template_id, group_slug) DO NOTHING;

-- PULL A: costas, bíceps
INSERT INTO public.workout_template_groups (template_id, group_slug, position)
SELECT id, g.group_slug, g.position
FROM public.workout_templates t
CROSS JOIN (VALUES
  ('costas', 1),
  ('biceps', 2)
) AS g(group_slug, position)
WHERE t.slug = 'pull-a'
ON CONFLICT (template_id, group_slug) DO NOTHING;

-- PULL B: costas, bíceps, ombro
INSERT INTO public.workout_template_groups (template_id, group_slug, position)
SELECT id, g.group_slug, g.position
FROM public.workout_templates t
CROSS JOIN (VALUES
  ('costas', 1),
  ('biceps', 2),
  ('ombro', 3)
) AS g(group_slug, position)
WHERE t.slug = 'pull-b'
ON CONFLICT (template_id, group_slug) DO NOTHING;

-- LEGS A: quadríceps, panturrilha
INSERT INTO public.workout_template_groups (template_id, group_slug, position)
SELECT id, g.group_slug, g.position
FROM public.workout_templates t
CROSS JOIN (VALUES
  ('quadriceps', 1),
  ('panturrilha', 2)
) AS g(group_slug, position)
WHERE t.slug = 'legs-a'
ON CONFLICT (template_id, group_slug) DO NOTHING;

-- LEGS B: posterior, quadríceps, core
INSERT INTO public.workout_template_groups (template_id, group_slug, position)
SELECT id, g.group_slug, g.position
FROM public.workout_templates t
CROSS JOIN (VALUES
  ('posterior', 1),
  ('quadriceps', 2),
  ('core', 3)
) AS g(group_slug, position)
WHERE t.slug = 'legs-b'
ON CONFLICT (template_id, group_slug) DO NOTHING;

-- UPPER C: peito, costas, ombro, bíceps, tríceps
INSERT INTO public.workout_template_groups (template_id, group_slug, position)
SELECT id, g.group_slug, g.position
FROM public.workout_templates t
CROSS JOIN (VALUES
  ('peito', 1),
  ('costas', 2),
  ('ombro', 3),
  ('biceps', 4),
  ('triceps', 5)
) AS g(group_slug, position)
WHERE t.slug = 'upper-c'
ON CONFLICT (template_id, group_slug) DO NOTHING;

-- LOWER A: quadríceps, posterior, panturrilha
INSERT INTO public.workout_template_groups (template_id, group_slug, position)
SELECT id, g.group_slug, g.position
FROM public.workout_templates t
CROSS JOIN (VALUES
  ('quadriceps', 1),
  ('posterior', 2),
  ('panturrilha', 3)
) AS g(group_slug, position)
WHERE t.slug = 'lower-a'
ON CONFLICT (template_id, group_slug) DO NOTHING;

-- FULL BODY C: quadríceps, peito, costas, core
INSERT INTO public.workout_template_groups (template_id, group_slug, position)
SELECT id, g.group_slug, g.position
FROM public.workout_templates t
CROSS JOIN (VALUES
  ('quadriceps', 1),
  ('peito', 2),
  ('costas', 3),
  ('core', 4)
) AS g(group_slug, position)
WHERE t.slug = 'full-body-c'
ON CONFLICT (template_id, group_slug) DO NOTHING;

-- ============================================================
-- 5. Seed de ITENS (exercícios)
-- ============================================================
-- Idempotente via ON CONFLICT (template_id, position).
-- Cada INSERT faz JOIN em exercises (trainer_id IS NULL = library global).

-- PUSH A (7 exercícios): Supino, Inclinado, Crucifixo, Desenvolvimento, Lateral, Tríceps Pulley, Tríceps Testa
INSERT INTO public.workout_template_items
  (template_id, exercise_id, position, sets, reps, load, rest_seconds)
SELECT t.id, e.id, pos, sets, reps, load, rest
FROM public.workout_templates t
CROSS JOIN (VALUES
  ('Supino reto barra',         1, 4, '8-10',   'moderado', 90),
  ('Supino inclinado halteres', 2, 3, '10-12',  'moderado', 75),
  ('Crucifixo reto',            3, 3, '12-15',  'leve',     60),
  ('Desenvolvimento militar',   4, 3, '10-12',  'moderado', 75),
  ('Elevação lateral',          5, 4, '12-15',  'leve',     45),
  ('Tríceps pulley',            6, 3, '12',     'leve',     60),
  ('Tríceps testa',             7, 3, '10-12',  'moderado', 60)
) AS v(name, pos, sets, reps, load, rest)
JOIN public.exercises e ON e.name = v.name AND e.trainer_id IS NULL
WHERE t.slug = 'push-a'
ON CONFLICT (template_id, position) DO NOTHING;

-- PUSH B (6): Flexão, Crucifixo, Desenvolvimento, Lateral, Face pull, Tríceps pulley
INSERT INTO public.workout_template_items
  (template_id, exercise_id, position, sets, reps, load, rest_seconds)
SELECT t.id, e.id, pos, sets, reps, load, rest
FROM public.workout_templates t
CROSS JOIN (VALUES
  ('Flexão de braços',          1, 4, 'até a falha', NULL,    60),
  ('Crucifixo reto',            2, 3, '12-15',      'leve',   60),
  ('Desenvolvimento militar',   3, 4, '8-10',       'moderado', 90),
  ('Elevação lateral',          4, 4, '12-15',      'leve',   45),
  ('Face pull',                 5, 3, '15',         'leve',   45),
  ('Tríceps pulley',            6, 3, '12',         'leve',   60)
) AS v(name, pos, sets, reps, load, rest)
JOIN public.exercises e ON e.name = v.name AND e.trainer_id IS NULL
WHERE t.slug = 'push-b'
ON CONFLICT (template_id, position) DO NOTHING;

-- PULL A (6): Puxada frontal, Remada curvada, Remada unilateral, Barra fixa, Rosca direta, Rosca alternada
INSERT INTO public.workout_template_items
  (template_id, exercise_id, position, sets, reps, load, rest_seconds)
SELECT t.id, e.id, pos, sets, reps, load, rest
FROM public.workout_templates t
CROSS JOIN (VALUES
  ('Puxada frontal',            1, 4, '8-10',  'moderado', 90),
  ('Remada curvada',            2, 4, '8-10',  'moderado', 90),
  ('Remada unilateral halter',  3, 3, '10-12', 'moderado', 60),
  ('Barra fixa',                4, 3, 'até a falha', NULL,  90),
  ('Rosca direta',              5, 3, '12',    'moderado', 60),
  ('Rosca alternada',           6, 3, '12',    'moderado', 60)
) AS v(name, pos, sets, reps, load, rest)
JOIN public.exercises e ON e.name = v.name AND e.trainer_id IS NULL
WHERE t.slug = 'pull-a'
ON CONFLICT (template_id, position) DO NOTHING;

-- PULL B (5): Puxada, Remada unilateral, Face pull, Rosca alternada, Elevação lateral
INSERT INTO public.workout_template_items
  (template_id, exercise_id, position, sets, reps, load, rest_seconds)
SELECT t.id, e.id, pos, sets, reps, load, rest
FROM public.workout_templates t
CROSS JOIN (VALUES
  ('Puxada frontal',            1, 4, '10-12', 'moderado', 75),
  ('Remada unilateral halter',  2, 3, '10-12', 'moderado', 60),
  ('Face pull',                 3, 3, '15',    'leve',     45),
  ('Rosca alternada',           4, 3, '12',    'moderado', 60),
  ('Elevação lateral',          5, 3, '12-15', 'leve',     45)
) AS v(name, pos, sets, reps, load, rest)
JOIN public.exercises e ON e.name = v.name AND e.trainer_id IS NULL
WHERE t.slug = 'pull-b'
ON CONFLICT (template_id, position) DO NOTHING;

-- LEGS A (5): Agachamento livre, Leg press, Extensora, Búlgaro, Panturrilha
INSERT INTO public.workout_template_items
  (template_id, exercise_id, position, sets, reps, load, rest_seconds)
SELECT t.id, e.id, pos, sets, reps, load, rest
FROM public.workout_templates t
CROSS JOIN (VALUES
  ('Agachamento livre',         1, 4, '8-10',  'moderado', 120),
  ('Leg press 45°',             2, 4, '10-12', 'moderado', 90),
  ('Cadeira extensora',         3, 3, '12-15', 'moderado', 60),
  ('Avanço búlgaro',            4, 3, '10 cada perna', 'moderado', 90),
  ('Panturrilha em pé',         5, 4, '15',    'moderado', 45)
) AS v(name, pos, sets, reps, load, rest)
JOIN public.exercises e ON e.name = v.name AND e.trainer_id IS NULL
WHERE t.slug = 'legs-a'
ON CONFLICT (template_id, position) DO NOTHING;

-- LEGS B (5): Stiff, Mesa flexora, Búlgaro, Agachamento goblet, Elevação de pernas
INSERT INTO public.workout_template_items
  (template_id, exercise_id, position, sets, reps, load, rest_seconds)
SELECT t.id, e.id, pos, sets, reps, load, rest
FROM public.workout_templates t
CROSS JOIN (VALUES
  ('Stiff',                     1, 4, '8-10',  'moderado', 90),
  ('Mesa flexora',              2, 4, '12',    'moderado', 60),
  ('Avanço búlgaro',            3, 3, '10 cada perna', 'moderado', 90),
  ('Agachamento goblet',        4, 3, '12',    'moderado', 60),
  ('Elevação de pernas',        5, 3, '12',    NULL,       60)
) AS v(name, pos, sets, reps, load, rest)
JOIN public.exercises e ON e.name = v.name AND e.trainer_id IS NULL
WHERE t.slug = 'legs-b'
ON CONFLICT (template_id, position) DO NOTHING;

-- UPPER C (6): Supino, Remada, Desenvolvimento, Puxada, Rosca direta, Tríceps pulley
INSERT INTO public.workout_template_items
  (template_id, exercise_id, position, sets, reps, load, rest_seconds)
SELECT t.id, e.id, pos, sets, reps, load, rest
FROM public.workout_templates t
CROSS JOIN (VALUES
  ('Supino reto barra',         1, 4, '8-10',  'moderado', 90),
  ('Remada curvada',            2, 4, '8-10',  'moderado', 90),
  ('Desenvolvimento militar',   3, 3, '10-12', 'moderado', 75),
  ('Puxada frontal',            4, 3, '10-12', 'moderado', 75),
  ('Rosca direta',              5, 3, '12',    'moderado', 60),
  ('Tríceps pulley',            6, 3, '12',    'leve',     60)
) AS v(name, pos, sets, reps, load, rest)
JOIN public.exercises e ON e.name = v.name AND e.trainer_id IS NULL
WHERE t.slug = 'upper-c'
ON CONFLICT (template_id, position) DO NOTHING;

-- LOWER A (6): Agachamento, Stiff, Leg press, Mesa flexora, Extensora, Panturrilha
INSERT INTO public.workout_template_items
  (template_id, exercise_id, position, sets, reps, load, rest_seconds)
SELECT t.id, e.id, pos, sets, reps, load, rest
FROM public.workout_templates t
CROSS JOIN (VALUES
  ('Agachamento livre',         1, 4, '8-10',  'moderado', 120),
  ('Stiff',                     2, 4, '8-10',  'moderado', 90),
  ('Leg press 45°',             3, 3, '10-12', 'moderado', 90),
  ('Mesa flexora',              4, 3, '12',    'moderado', 60),
  ('Cadeira extensora',         5, 3, '12-15', 'moderado', 60),
  ('Panturrilha em pé',         6, 4, '15',    'moderado', 45)
) AS v(name, pos, sets, reps, load, rest)
JOIN public.exercises e ON e.name = v.name AND e.trainer_id IS NULL
WHERE t.slug = 'lower-a'
ON CONFLICT (template_id, position) DO NOTHING;

-- FULL BODY C (4): Agachamento goblet, Flexão, Remada, Prancha
INSERT INTO public.workout_template_items
  (template_id, exercise_id, position, sets, reps, load, rest_seconds)
SELECT t.id, e.id, pos, sets, reps, load, rest
FROM public.workout_templates t
CROSS JOIN (VALUES
  ('Agachamento goblet',        1, 4, '12',    'moderado', 60),
  ('Flexão de braços',          2, 4, 'até a falha', NULL,  60),
  ('Remada curvada',            3, 4, '10-12', 'moderado', 75),
  ('Prancha frontal',           4, 3, '45s',   NULL,       45)
) AS v(name, pos, sets, reps, load, rest)
JOIN public.exercises e ON e.name = v.name AND e.trainer_id IS NULL
WHERE t.slug = 'full-body-c'
ON CONFLICT (template_id, position) DO NOTHING;
