-- Migration 0022 — Templates de dieta + clonagem
--
-- Resolve: dieta/templates (assim como workout_templates) e dá ao trainer
-- uma forma de aplicar templates pré-prontos aos alunos.

-- ============================================================
-- (1) Tabela de templates (espelho de workout_templates)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.diet_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- NULL = global
  title TEXT NOT NULL,
  description TEXT,
  kcal_target INT,
  p_target INT,
  c_target INT,
  g_target INT,
  goal TEXT,                                       -- cutting/bulking/manutenção/etc
  is_global BOOLEAN NOT NULL DEFAULT false,        -- se true, visível pra todos
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.diet_templates ENABLE ROW LEVEL SECURITY;

-- Qualquer trainer vê templates globais + os próprios
DROP POLICY IF EXISTS "diet_templates_read" ON public.diet_templates;
CREATE POLICY "diet_templates_read"
  ON public.diet_templates
  FOR SELECT
  TO authenticated
  USING (is_global = true OR trainer_id = auth.uid());

DROP POLICY IF EXISTS "diet_templates_insert_own" ON public.diet_templates;
CREATE POLICY "diet_templates_insert_own"
  ON public.diet_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (trainer_id = auth.uid() AND is_global = false)
    OR (is_global = true AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer'
    ))
  );

DROP POLICY IF EXISTS "diet_templates_update_own" ON public.diet_templates;
CREATE POLICY "diet_templates_update_own"
  ON public.diet_templates
  FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid() OR (is_global = true AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer'
  )))
  WITH CHECK (trainer_id = auth.uid() OR is_global = true);

DROP POLICY IF EXISTS "diet_templates_delete_own" ON public.diet_templates;
CREATE POLICY "diet_templates_delete_own"
  ON public.diet_templates
  FOR DELETE
  TO authenticated
  USING (trainer_id = auth.uid());

-- ============================================================
-- (2) Tabela de meals do template
-- ============================================================

CREATE TABLE IF NOT EXISTS public.diet_template_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.diet_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  time TIME,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.diet_template_meals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dtm_read" ON public.diet_template_meals;
CREATE POLICY "dtm_read"
  ON public.diet_template_meals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.diet_templates t
      WHERE t.id = diet_template_meals.template_id
        AND (t.is_global = true OR t.trainer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "dtm_write_owner" ON public.diet_template_meals;
CREATE POLICY "dtm_write_owner"
  ON public.diet_template_meals
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.diet_templates t
      WHERE t.id = diet_template_meals.template_id
        AND (t.trainer_id = auth.uid() OR (t.is_global = true AND EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer'
        )))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.diet_templates t
      WHERE t.id = diet_template_meals.template_id
        AND (t.trainer_id = auth.uid() OR t.is_global = true)
    )
  );

-- ============================================================
-- (3) Tabela de items do meal do template
-- ============================================================

CREATE TABLE IF NOT EXISTS public.diet_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES public.diet_template_meals(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,                          -- texto livre; ao clonar criamos food on-demand
  grams INT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.diet_template_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dti_read" ON public.diet_template_items;
CREATE POLICY "dti_read"
  ON public.diet_template_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.diet_template_meals m
      JOIN public.diet_templates t ON t.id = m.template_id
      WHERE m.id = diet_template_items.meal_id
        AND (t.is_global = true OR t.trainer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "dti_write_owner" ON public.diet_template_items;
CREATE POLICY "dti_write_owner"
  ON public.diet_template_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.diet_template_meals m
      JOIN public.diet_templates t ON t.id = m.template_id
      WHERE m.id = diet_template_items.meal_id
        AND (t.trainer_id = auth.uid() OR t.is_global = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.diet_template_meals m
      JOIN public.diet_templates t ON t.id = m.template_id
      WHERE m.id = diet_template_items.meal_id
        AND (t.trainer_id = auth.uid() OR t.is_global = true)
    )
  );

-- ============================================================
-- (4) Helper: cria food sob demanda (lookup por nome) — usado pela RPC clone
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_or_create_food(p_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- busca case-insensitive
  SELECT id INTO v_id FROM public.foods WHERE lower(name) = lower(p_name) LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.foods (name, source) VALUES (p_name, 'manual') RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_food TO authenticated;

-- ============================================================
-- (5) RPC: clonar template pra um aluno
-- ============================================================

CREATE OR REPLACE FUNCTION public.clone_diet_template(
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
  v_trainer UUID;
  v_template RECORD;
  v_diet_id UUID;
  v_meal RECORD;
  v_new_meal_id UUID;
  v_food_id UUID;
BEGIN
  -- pega trainer do aluno
  SELECT trainer_id INTO v_trainer
  FROM public.student_profiles
  WHERE user_id = p_student_id;

  IF v_trainer IS NULL THEN
    RAISE EXCEPTION 'Aluno não tem trainer vinculado';
  END IF;

  -- pega template (precisa ser global OU do trainer do aluno)
  SELECT * INTO v_template
  FROM public.diet_templates
  WHERE id = p_template_id
    AND (is_global = true OR trainer_id = v_trainer);

  IF v_template.id IS NULL THEN
    RAISE EXCEPTION 'Template não encontrado ou sem permissão';
  END IF;

  -- cria diet
  INSERT INTO public.diets (
    trainer_id, student_id, title, kcal_target, p_target, c_target, g_target, goal
  ) VALUES (
    v_trainer, p_student_id,
    COALESCE(p_title, v_template.title),
    v_template.kcal_target, v_template.p_target, v_template.c_target, v_template.g_target,
    v_template.goal
  )
  RETURNING id INTO v_diet_id;

  -- copia meals + items
  FOR v_meal IN
    SELECT id, name, time, position
    FROM public.diet_template_meals
    WHERE template_id = p_template_id
    ORDER BY position
  LOOP
    INSERT INTO public.meals (diet_id, name, time, position)
    VALUES (v_diet_id, v_meal.name, v_meal.time, v_meal.position)
    RETURNING id INTO v_new_meal_id;

    -- pra cada item do template, cria food (se não existir) e copia
    FOR v_food_id IN
      SELECT public.get_or_create_food(dti.food_name)
      FROM public.diet_template_items dti
      WHERE dti.meal_id = v_meal.id
      ORDER BY dti.position
    LOOP
      -- v_food_id loop acima retorna food_ids, mas precisamos também dos grams
      -- Solução: faz INSERT em 2 passos pra cada item
      NULL;
    END LOOP;

    INSERT INTO public.meal_items (meal_id, food_id, grams, position)
    SELECT v_new_meal_id, public.get_or_create_food(dti.food_name), dti.grams, dti.position
    FROM public.diet_template_items dti
    WHERE dti.meal_id = v_meal.id
    ORDER BY dti.position;
  END LOOP;

  RETURN v_diet_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clone_diet_template TO authenticated;

-- ============================================================
-- (5) Seeds — 4 templates globais prontos
-- ============================================================

INSERT INTO public.diet_templates (trainer_id, title, description, kcal_target, p_target, c_target, g_target, goal, is_global)
VALUES
  (NULL, 'Cutting 1.800 kcal', 'Plano agressivo pra cutting mantendo proteína alta.', 1800, 180, 130, 50, 'cutting', true),
  (NULL, 'Manutenção 2.200 kcal', 'Plano pra quem quer manter peso com composição saudável.', 2200, 160, 220, 70, 'manutenção', true),
  (NULL, 'Bulking limpo 2.800 kcal', 'Superávit moderado pra ganho de massa sem excesso de gordura.', 2800, 200, 320, 80, 'bulking', true),
  (NULL, 'Recomposição 2.000 kcal', 'Plano balanceado pra perder gordura e ganhar músculo ao mesmo tempo.', 2000, 170, 180, 60, 'recomposição', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- (6) Seeds — 4 templates globais + meals + items
-- ============================================================

INSERT INTO public.diet_templates (trainer_id, title, description, kcal_target, p_target, c_target, g_target, goal, is_global)
VALUES
  (NULL, 'Cutting 1.800 kcal', 'Plano agressivo pra cutting mantendo proteína alta.', 1800, 180, 130, 50, 'cutting', true),
  (NULL, 'Manutenção 2.200 kcal', 'Plano pra quem quer manter peso com composição saudável.', 2200, 160, 220, 70, 'manutenção', true),
  (NULL, 'Bulking limpo 2.800 kcal', 'Superávit moderado pra ganho de massa sem excesso de gordura.', 2800, 200, 320, 80, 'bulking', true),
  (NULL, 'Recomposição 2.000 kcal', 'Plano balanceado pra perder gordura e ganhar músculo ao mesmo tempo.', 2000, 170, 180, 60, 'recomposição', true)
ON CONFLICT DO NOTHING;

-- Helper macro: insere meal + items
DO $$
DECLARE
  v_tpl_id UUID;
  v_meal_id UUID;
BEGIN
  -- ============================================
  -- CUTTING 1800
  -- ============================================
  SELECT id INTO v_tpl_id FROM public.diet_templates WHERE title = 'Cutting 1.800 kcal' AND is_global = true LIMIT 1;

  INSERT INTO public.diet_template_meals (template_id, name, time, position) VALUES (v_tpl_id, 'Café da manhã', '07:00', 1)
    RETURNING id INTO v_meal_id;
  INSERT INTO public.diet_template_items (meal_id, food_name, grams, position) VALUES
    (v_meal_id, 'Ovo inteiro', 100, 1),
    (v_meal_id, 'Aveia em flocos', 40, 2),
    (v_meal_id, 'Banana', 100, 3);

  INSERT INTO public.diet_template_meals (template_id, name, time, position) VALUES (v_tpl_id, 'Almoço', '12:00', 2)
    RETURNING id INTO v_meal_id;
  INSERT INTO public.diet_template_items (meal_id, food_name, grams, position) VALUES
    (v_meal_id, 'Peito de frango grelhado', 150, 1),
    (v_meal_id, 'Arroz branco cozido', 100, 2),
    (v_meal_id, 'Brócolis cozido', 100, 3),
    (v_meal_id, 'Azeite de oliva', 5, 4);

  INSERT INTO public.diet_template_meals (template_id, name, time, position) VALUES (v_tpl_id, 'Lanche', '15:30', 3)
    RETURNING id INTO v_meal_id;
  INSERT INTO public.diet_template_items (meal_id, food_name, grams, position) VALUES
    (v_meal_id, 'Iogurte grego natural', 150, 1),
    (v_meal_id, 'Castanha do Brasil', 10, 2);

  INSERT INTO public.diet_template_meals (template_id, name, time, position) VALUES (v_tpl_id, 'Jantar', '19:30', 4)
    RETURNING id INTO v_meal_id;
  INSERT INTO public.diet_template_items (meal_id, food_name, grams, position) VALUES
    (v_meal_id, 'Tilápia grelhada', 150, 1),
    (v_meal_id, 'Batata doce cozida', 100, 2),
    (v_meal_id, 'Salada verde', 80, 3);

  -- ============================================
  -- MANUTENÇÃO 2200
  -- ============================================
  SELECT id INTO v_tpl_id FROM public.diet_templates WHERE title = 'Manutenção 2.200 kcal' AND is_global = true LIMIT 1;

  INSERT INTO public.diet_template_meals (template_id, name, time, position) VALUES (v_tpl_id, 'Café da manhã', '07:30', 1)
    RETURNING id INTO v_meal_id;
  INSERT INTO public.diet_template_items (meal_id, food_name, grams, position) VALUES
    (v_meal_id, 'Pão integral', 50, 1),
    (v_meal_id, 'Queijo branco', 30, 2),
    (v_meal_id, 'Ovo inteiro', 100, 3),
    (v_meal_id, 'Café com leite', 200, 4);

  INSERT INTO public.diet_template_meals (template_id, name, time, position) VALUES (v_tpl_id, 'Almoço', '12:30', 2)
    RETURNING id INTO v_meal_id;
  INSERT INTO public.diet_template_items (meal_id, food_name, grams, position) VALUES
    (v_meal_id, 'Arroz integral cozido', 120, 1),
    (v_meal_id, 'Feijão preto cozido', 80, 2),
    (v_meal_id, 'Carne magra grelhada', 150, 3),
    (v_meal_id, 'Salada de legumes', 100, 4);

  INSERT INTO public.diet_template_meals (template_id, name, time, position) VALUES (v_tpl_id, 'Lanche da tarde', '16:00', 3)
    RETURNING id INTO v_meal_id;
  INSERT INTO public.diet_template_items (meal_id, food_name, grams, position) VALUES
    (v_meal_id, 'Frutas vermelhas', 100, 1),
    (v_meal_id, 'Granola', 30, 2),
    (v_meal_id, 'Iogurte natural', 150, 3);

  INSERT INTO public.diet_template_meals (template_id, name, time, position) VALUES (v_tpl_id, 'Jantar', '20:00', 4)
    RETURNING id INTO v_meal_id;
  INSERT INTO public.diet_template_items (meal_id, food_name, grams, position) VALUES
    (v_meal_id, 'Omelete (3 ovos)', 180, 1),
    (v_meal_id, 'Tomate', 80, 2),
    (v_meal_id, 'Pão integral', 50, 3);

  -- ============================================
  -- BULKING 2800
  -- ============================================
  SELECT id INTO v_tpl_id FROM public.diet_templates WHERE title = 'Bulking limpo 2.800 kcal' AND is_global = true LIMIT 1;

  INSERT INTO public.diet_template_meals (template_id, name, time, position) VALUES (v_tpl_id, 'Café da manhã', '07:00', 1)
    RETURNING id INTO v_meal_id;
  INSERT INTO public.diet_template_items (meal_id, food_name, grams, position) VALUES
    (v_meal_id, 'Aveia em flocos', 80, 1),
    (v_meal_id, 'Banana', 150, 2),
    (v_meal_id, 'Whey protein', 30, 3),
    (v_meal_id, 'Pasta de amendoim', 20, 4);

  INSERT INTO public.diet_template_meals (template_id, name, time, position) VALUES (v_tpl_id, 'Almoço', '12:00', 2)
    RETURNING id INTO v_meal_id;
  INSERT INTO public.diet_template_items (meal_id, food_name, grams, position) VALUES
    (v_meal_id, 'Arroz branco cozido', 200, 1),
    (v_meal_id, 'Feijão carioca cozido', 100, 2),
    (v_meal_id, 'Peito de frango grelhado', 200, 3),
    (v_meal_id, 'Salada de legumes', 100, 4);

  INSERT INTO public.diet_template_meals (template_id, name, time, position) VALUES (v_tpl_id, 'Lanche pré-treino', '15:30', 3)
    RETURNING id INTO v_meal_id;
  INSERT INTO public.diet_template_items (meal_id, food_name, grams, position) VALUES
    (v_meal_id, 'Tapioca', 50, 1),
    (v_meal_id, 'Frango desfiado', 80, 2);

  INSERT INTO public.diet_template_meals (template_id, name, time, position) VALUES (v_tpl_id, 'Jantar', '19:30', 4)
    RETURNING id INTO v_meal_id;
  INSERT INTO public.diet_template_items (meal_id, food_name, grams, position) VALUES
    (v_meal_id, 'Patinho moído refogado', 200, 1),
    (v_meal_id, 'Macarrão cozido', 150, 2),
    (v_meal_id, 'Brócolis cozido', 100, 3);

  INSERT INTO public.diet_template_meals (template_id, name, time, position) VALUES (v_tpl_id, 'Ceia', '22:00', 5)
    RETURNING id INTO v_meal_id;
  INSERT INTO public.diet_template_items (meal_id, food_name, grams, position) VALUES
    (v_meal_id, 'Iogurte natural', 200, 1),
    (v_meal_id, 'Granola', 30, 2);

  -- ============================================
  -- RECOMPOSIÇÃO 2000
  -- ============================================
  SELECT id INTO v_tpl_id FROM public.diet_templates WHERE title = 'Recomposição 2.000 kcal' AND is_global = true LIMIT 1;

  INSERT INTO public.diet_template_meals (template_id, name, time, position) VALUES (v_tpl_id, 'Café da manhã', '07:00', 1)
    RETURNING id INTO v_meal_id;
  INSERT INTO public.diet_template_items (meal_id, food_name, grams, position) VALUES
    (v_meal_id, 'Ovo inteiro', 150, 1),
    (v_meal_id, 'Aveia em flocos', 40, 2),
    (v_meal_id, 'Frutas vermelhas', 80, 3);

  INSERT INTO public.diet_template_meals (template_id, name, time, position) VALUES (v_tpl_id, 'Almoço', '12:00', 2)
    RETURNING id INTO v_meal_id;
  INSERT INTO public.diet_template_items (meal_id, food_name, grams, position) VALUES
    (v_meal_id, 'Peito de frango grelhado', 180, 1),
    (v_meal_id, 'Arroz integral cozido', 100, 2),
    (v_meal_id, 'Feijão preto cozido', 60, 3),
    (v_meal_id, 'Salada verde', 100, 4);

  INSERT INTO public.diet_template_meals (template_id, name, time, position) VALUES (v_tpl_id, 'Lanche', '15:30', 3)
    RETURNING id INTO v_meal_id;
  INSERT INTO public.diet_template_items (meal_id, food_name, grams, position) VALUES
    (v_meal_id, 'Tofu grelhado', 100, 1),
    (v_meal_id, 'Cenoura ralada', 60, 2);

  INSERT INTO public.diet_template_meals (template_id, name, time, position) VALUES (v_tpl_id, 'Jantar', '19:30', 4)
    RETURNING id INTO v_meal_id;
  INSERT INTO public.diet_template_items (meal_id, food_name, grams, position) VALUES
    (v_meal_id, 'Salmão grelhado', 150, 1),
    (v_meal_id, 'Batata doce cozida', 120, 2),
    (v_meal_id, 'Brócolis cozido', 100, 3);
END $$;

-- ============================================================
-- VERIFICAÇÃO
-- ============================================================
-- SELECT count(*) FROM public.diet_templates WHERE is_global = true; -- 4 esperados
-- SELECT count(*) FROM public.diet_template_meals; -- ~16 esperados
-- SELECT count(*) FROM public.diet_template_items; -- ~45 esperados
