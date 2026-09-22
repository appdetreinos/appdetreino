-- Migration 0018 — Biblioteca de exercícios + templates de treino
--
-- Resolve o problema de "começar do zero toda vez". Agora o trainer:
--   1. Acha 30 exercícios essenciais já populados (com vídeo e instruções).
--   2. Pega 4 templates prontos (Full Body A/B, Upper A, Lower B).
--   3. Em 1 clique: "usar template X" → cria workout + workout_days + workout_items.
--
-- Idempotente — pode rodar mais de uma vez.

-- ============================================================
-- 1. Tabela de templates (metadados)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,  -- 'full_body', 'upper', 'lower', 'push', 'pull', 'legs'
  difficulty TEXT NOT NULL DEFAULT 'intermediate', -- beginner, intermediate, advanced
  estimated_minutes SMALLINT,
  is_global BOOLEAN NOT NULL DEFAULT true, -- true = visível pra todos os trainers
  created_by UUID REFERENCES public.trainer_profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_templates_category
  ON public.workout_templates(category, difficulty);

COMMENT ON TABLE public.workout_templates IS
  'Templates de treino pré-montados. is_global=true = biblioteca visível a todos.';

-- ============================================================
-- 2. Itens do template (cada exercício dentro do template)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.workout_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  position SMALLINT NOT NULL,
  sets SMALLINT NOT NULL,
  reps TEXT NOT NULL,
  load TEXT,
  rest_seconds SMALLINT,
  rpe SMALLINT,
  notes TEXT,
  UNIQUE (template_id, position)
);

CREATE INDEX IF NOT EXISTS idx_workout_template_items_template
  ON public.workout_template_items(template_id, position);

COMMENT ON TABLE public.workout_template_items IS
  'Exercícios que compõem cada template. Posição define a ordem de execução.';

-- ============================================================
-- 3. RLS — leitura pública pra todos os trainers
-- ============================================================

ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_template_items ENABLE ROW LEVEL SECURITY;

-- Todos os trainers autenticados podem ler templates globais
DROP POLICY IF EXISTS workout_templates_read_global ON public.workout_templates;
CREATE POLICY workout_templates_read_global ON public.workout_templates
  FOR SELECT TO authenticated
  USING (is_global = true OR created_by = auth.uid());

DROP POLICY IF EXISTS workout_template_items_read ON public.workout_template_items;
CREATE POLICY workout_template_items_read ON public.workout_template_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_templates t
      WHERE t.id = workout_template_items.template_id
        AND (t.is_global = true OR t.created_by = auth.uid())
    )
  );

-- Trainer pode criar o próprio template (criado por mim, is_global=false)
DROP POLICY IF EXISTS workout_templates_insert_own ON public.workout_templates;
CREATE POLICY workout_templates_insert_own ON public.workout_templates
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND is_global = false);

DROP POLICY IF EXISTS workout_templates_update_own ON public.workout_templates;
CREATE POLICY workout_templates_update_own ON public.workout_templates
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND is_global = false);

DROP POLICY IF EXISTS workout_templates_delete_own ON public.workout_templates;
CREATE POLICY workout_templates_delete_own ON public.workout_templates
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() AND is_global = false);

-- ============================================================
-- 4. RPC — clonar template pra virar workout de verdade
-- ============================================================

CREATE OR REPLACE FUNCTION public.clone_workout_template(
  p_template_id UUID,
  p_student_id UUID,
  p_title TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trainer_id UUID := auth.uid();
  v_template public.workout_templates%ROWTYPE;
  v_new_workout_id UUID;
  v_new_day_id UUID;
  v_title TEXT;
BEGIN
  -- Trainer precisa estar logado
  IF v_trainer_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated'
      USING ERRCODE = '42501';
  END IF;

  -- Busca o template
  SELECT * INTO v_template
  FROM public.workout_templates
  WHERE id = p_template_id
    AND (is_global = true OR created_by = v_trainer_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'template_not_found: %', p_template_id
      USING ERRCODE = 'P0002';
  END IF;

  v_title := COALESCE(p_title, v_template.title);

  -- Cria workout pro aluno
  INSERT INTO public.workouts (trainer_id, student_id, title, status)
  VALUES (v_trainer_id, p_student_id, v_title, 'active')
  RETURNING id INTO v_new_workout_id;

  -- Cria 1 workout_day (template = treino único, não split)
  INSERT INTO public.workout_days (workout_id, day_of_week, title)
  VALUES (v_new_workout_id, 1, v_title)
  RETURNING id INTO v_new_day_id;

  -- Copia os itens do template pro workout_day
  INSERT INTO public.workout_items (
    workout_day_id, position, exercise_id, sets, reps, load, rest_seconds, rpe, notes
  )
  SELECT
    v_new_day_id, position, exercise_id, sets, reps, load, rest_seconds, rpe, notes
  FROM public.workout_template_items
  WHERE template_id = p_template_id
  ORDER BY position;

  -- Marca o checklist (treiner mandou um treino)
  PERFORM public.mark_onboarding_checklist('sent_workout');

  RETURN v_new_workout_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clone_workout_template(UUID, UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.clone_workout_template IS
  'Clona um workout_templates num workout real pra um aluno. Cria workout + 1 workout_day + workout_items em transação.';

-- ============================================================
-- 5. SEED — 30 exercícios essenciais (biblioteca global)
-- ============================================================
--
-- trainer_id = NULL = visível pra todos. Mídia:
--   media_type='gif'   → Wikimedia Commons (CC0) — banda do Wikimedia, 0 custo nosso
--   media_type='video' → Supabase Storage ou YouTube embed (futuro)
--   media_type=NULL    → sem mídia, front mostra placeholder "vídeo em breve"
--
-- Para evoluir pra Supabase Storage próprio, basta rodar o script
-- scripts/seed-exercise-gifs.ts (busca CC0 → upload → troca URLs).

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS media_type TEXT
    CHECK (media_type IS NULL OR media_type IN ('gif', 'video'));

COMMENT ON COLUMN public.exercises.media_type IS
  '''gif'' = Wikimedia/CC0 hospedado externamente. ''video'' = Supabase Storage/YouTube. NULL = sem mídia.';
COMMENT ON COLUMN public.exercises.video_url IS
  'URL do GIF ou vídeo de execução. Wikimedia Commons (CC0) preferido pra MVP.';

-- Seed inicial: 30 exercícios SEM mídia (video_url = NULL).
-- O script scripts/seed-exercise-gifs.ts roda depois e preenche
-- video_url + media_type com GIFs do Wikimedia Commons (CC0).
INSERT INTO public.exercises (trainer_id, name, muscle_group, equipment, instructions, video_url, media_type)
VALUES
  -- Pernas (8)
  (NULL, 'Agachamento livre', 'quadriceps', 'barbell', 'Pés na largura dos ombros, desce até 90° mantendo o joelho alinhado com o pé.', NULL, NULL),
  (NULL, 'Agachamento goblet', 'quadriceps', 'kettlebell', 'Halter ou kettlebell no peito, cotovelos para baixo, desce controladamente.', NULL, NULL),
  (NULL, 'Leg press 45°', 'quadriceps', 'machine', 'Pés na largura dos ombros na plataforma, desce até 90° sem tirar o lombar do banco.', NULL, NULL),
  (NULL, 'Cadeira extensora', 'quadriceps', 'machine', 'Senta com as costas apoiadas, sobe até a extensão completa, desce controlado.', NULL, NULL),
  (NULL, 'Mesa flexora', 'posterior', 'machine', 'Deita de bruços, traz o calcanhar em direção ao glúteo, sem levantar o quadril.', NULL, NULL),
  (NULL, 'Stiff', 'posterior', 'barbell', 'Pés na largura do quadril, barra próxima da coxa, desce com costas retas até sentir alongamento.', NULL, NULL),
  (NULL, 'Avanço búlgaro', 'quadriceps', 'dumbbell', 'Pé de trás apoiado no banco, desce com o joelho quase tocando o chão, mantém tronco ereto.', NULL, NULL),
  (NULL, 'Panturrilha em pé', 'panturrilha', 'machine', 'Em pé na máquina, sobe na ponta dos pés, contrai 1s, desce controladamente.', NULL, NULL),

  -- Peito (4)
  (NULL, 'Supino reto barra', 'peito', 'barbell', 'Deita no banco, pés firmes no chão, desce a barra no meio do peito, empurra pra cima.', NULL, NULL),
  (NULL, 'Supino inclinado halteres', 'peito', 'dumbbell', 'Banco a 30-45°, halteres na altura do peito, empurra com palmas para frente.', NULL, NULL),
  (NULL, 'Crucifixo reto', 'peito', 'dumbbell', 'Deita no banco, abre os braços com leve flexão no cotovelo, junta no topo.', NULL, NULL),
  (NULL, 'Flexão de braços', 'peito', 'bodyweight', 'Mãos na largura dos ombros, corpo em prancha, desce até o peito quase tocar o chão.', NULL, NULL),

  -- Costas (4)
  (NULL, 'Puxada frontal', 'costas', 'cable', 'Puxa a barra até o peito, escápulas para baixo e para trás, controla a volta.', NULL, NULL),
  (NULL, 'Remada curvada', 'costas', 'barbell', 'Tronco a 45°, puxa a barra em direção ao umbigo, cotovelos próximos do corpo.', NULL, NULL),
  (NULL, 'Remada unilateral halter', 'costas', 'dumbbell', 'Apoiado no banco, puxa o halter em direção ao quadril, escápula retraída.', NULL, NULL),
  (NULL, 'Barra fixa', 'costas', 'bodyweight', 'Pendurado na barra, puxa até o queixo passar, controla a descida.', NULL, NULL),

  -- Ombros (3)
  (NULL, 'Desenvolvimento militar', 'ombro', 'barbell', 'Em pé, barra na altura dos ombros, empurra pra cima sem travar os cotovelos.', NULL, NULL),
  (NULL, 'Elevação lateral', 'ombro', 'dumbbell', 'Em pé, halteres ao lado do corpo, sobe até a altura dos ombros com leve flexão no cotovelo.', NULL, NULL),
  (NULL, 'Face pull', 'ombro', 'cable', 'Puxa a corda em direção ao rosto, cotovelos altos, rotação externa no topo.', NULL, NULL),

  -- Braços (4)
  (NULL, 'Rosca direta', 'biceps', 'barbell', 'Em pé, barra com pegada supinada, sobe até a contração completa, controla a descida.', NULL, NULL),
  (NULL, 'Rosca alternada', 'biceps', 'dumbbell', 'Em pé, sobe um halter de cada vez, sem balançar o tronco.', NULL, NULL),
  (NULL, 'Tríceps pulley', 'triceps', 'cable', 'Cotovelos colados ao corpo, estende os braços para baixo, contrai 1s no final.', NULL, NULL),
  (NULL, 'Tríceps testa', 'triceps', 'barbell', 'Deitado, desce a barra em direção à testa com cotovelos fixos, estende pra cima.', NULL, NULL),

  -- Core (4)
  (NULL, 'Prancha frontal', 'core', 'bodyweight', 'Apoio nos antebraços e ponta dos pés, corpo alinhado, contrai o abdômen.', NULL, NULL),
  (NULL, 'Abdominal supra', 'core', 'bodyweight', 'Deitado, joelhos flexionados, sobe o tronco em direção aos joelhos sem puxar o pescoço.', NULL, NULL),
  (NULL, 'Abdominal roda', 'core', 'equipment', 'De joelhos, rola pra frente com a roda mantendo o core contraído.', NULL, NULL),
  (NULL, 'Elevação de pernas', 'core', 'bodyweight', 'Pendurado na barra, sobe as pernas até 90°, controla a descida sem balançar.', NULL, NULL),

  -- Cardio / Mobilidade (3)
  (NULL, 'Esteira corrida', 'cardio', 'machine', 'Mantém postura ereta, cadence constante, respiração ritmada.', NULL, NULL),
  (NULL, 'Bike ergométrica', 'cardio', 'machine', 'Ajusta altura do selim, cadência entre 70-90rpm, resistência progressiva.', NULL, NULL),
  (NULL, 'Burpee', 'cardio', 'bodyweight', 'Agachamento + prancha + flexão + salto, mantém ritmo constante.', NULL, NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. SEED — 4 templates prontos
-- ============================================================

INSERT INTO public.workout_templates (slug, title, description, category, difficulty, estimated_minutes)
VALUES
  ('full-body-a', 'Full Body A', 'Treino completo focado em movimentos compostos. Ideal pra começar a semana.', 'full_body', 'intermediate', 60),
  ('full-body-b', 'Full Body B', 'Complementar ao Full Body A, ênfase em posterior de coxa e costas.', 'full_body', 'intermediate', 60),
  ('upper-a', 'Upper A — Peito/Ombro/Tríceps', 'Treino superior focado em hipertrofia de peito, ombro e tríceps.', 'upper', 'intermediate', 50),
  ('lower-b', 'Lower B — Quadríceps/Panturrilha', 'Treino inferior focado em quadríceps e panturrilha.', 'lower', 'intermediate', 45)
ON CONFLICT (slug) DO NOTHING;

-- Insere os itens de cada template (subquery pelo slug)
DO $$
DECLARE
  v_full_body_a UUID;
  v_full_body_b UUID;
  v_upper_a UUID;
  v_lower_b UUID;
BEGIN
  SELECT id INTO v_full_body_a FROM public.workout_templates WHERE slug = 'full-body-a';
  SELECT id INTO v_full_body_b FROM public.workout_templates WHERE slug = 'full-body-b';
  SELECT id INTO v_upper_a FROM public.workout_templates WHERE slug = 'upper-a';
  SELECT id INTO v_lower_b FROM public.workout_templates WHERE slug = 'lower-b';

  -- Full Body A: agachamento + supino + remada + ombro + bíceps + core
  INSERT INTO public.workout_template_items
    (template_id, exercise_id, position, sets, reps, load, rest_seconds)
  SELECT v_full_body_a, e.id, pos, sets, reps, load, rest
  FROM (VALUES
    ('Agachamento livre', 1, 4, '8-10', 'moderado', 90),
    ('Supino reto barra', 2, 4, '8-10', 'moderado', 90),
    ('Remada curvada', 3, 4, '8-10', 'moderado', 90),
    ('Desenvolvimento militar', 4, 3, '10-12', 'leve', 60),
    ('Rosca direta', 5, 3, '12', 'leve', 60),
    ('Prancha frontal', 6, 3, '45s', NULL, 45)
  ) AS t(name, pos, sets, reps, load, rest)
  JOIN public.exercises e ON e.name = t.name AND e.trainer_id IS NULL
  ON CONFLICT DO NOTHING;

  -- Full Body B: stiff + puxada + agachamento goblet + crucifixo + tríceps + abdominal
  INSERT INTO public.workout_template_items
    (template_id, exercise_id, position, sets, reps, load, rest_seconds)
  SELECT v_full_body_b, e.id, pos, sets, reps, load, rest
  FROM (VALUES
    ('Stiff', 1, 4, '8-10', 'moderado', 90),
    ('Puxada frontal', 2, 4, '10-12', 'moderado', 60),
    ('Agachamento goblet', 3, 3, '12', 'moderado', 60),
    ('Crucifixo reto', 4, 3, '12-15', 'leve', 60),
    ('Tríceps pulley', 5, 3, '12', 'leve', 60),
    ('Abdominal supra', 6, 3, '15', NULL, 45)
  ) AS t(name, pos, sets, reps, load, rest)
  JOIN public.exercises e ON e.name = t.name AND e.trainer_id IS NULL
  ON CONFLICT DO NOTHING;

  -- Upper A: supino inclinado + crucifixo + desenvolvimento + elevação lateral + face pull + bíceps
  INSERT INTO public.workout_template_items
    (template_id, exercise_id, position, sets, reps, load, rest_seconds)
  SELECT v_upper_a, e.id, pos, sets, reps, load, rest
  FROM (VALUES
    ('Supino inclinado halteres', 1, 4, '10-12', 'moderado', 60),
    ('Crucifixo reto', 2, 3, '12-15', 'leve', 60),
    ('Desenvolvimento militar', 3, 4, '8-10', 'moderado', 90),
    ('Elevação lateral', 4, 4, '12-15', 'leve', 45),
    ('Face pull', 5, 3, '15', 'leve', 45),
    ('Rosca alternada', 6, 3, '12', 'leve', 60)
  ) AS t(name, pos, sets, reps, load, rest)
  JOIN public.exercises e ON e.name = t.name AND e.trainer_id IS NULL
  ON CONFLICT DO NOTHING;

  -- Lower B: leg press + mesa flexora + cadeira extensora + búlgaro + panturrilha + elevação de pernas
  INSERT INTO public.workout_template_items
    (template_id, exercise_id, position, sets, reps, load, rest_seconds)
  SELECT v_lower_b, e.id, pos, sets, reps, load, rest
  FROM (VALUES
    ('Leg press 45°', 1, 4, '10-12', 'moderado', 90),
    ('Mesa flexora', 2, 4, '12', 'moderado', 60),
    ('Cadeira extensora', 3, 3, '12-15', 'leve', 60),
    ('Avanço búlgaro', 4, 3, '10 cada perna', 'moderado', 90),
    ('Panturrilha em pé', 5, 4, '15', 'moderado', 45),
    ('Elevação de pernas', 6, 3, '12', NULL, 60)
  ) AS t(name, pos, sets, reps, load, rest)
  JOIN public.exercises e ON e.name = t.name AND e.trainer_id IS NULL
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================
-- 7. Comentários finais
-- ============================================================

COMMENT ON COLUMN public.workout_templates.is_global IS
  'TRUE = biblioteca visível a todos os trainers. FALSE = criado pelo próprio trainer.';
COMMENT ON FUNCTION public.clone_workout_template IS
  'Clona um template pra virar workout + workout_day + workout_items. Auto-marca checklist sent_workout.';
