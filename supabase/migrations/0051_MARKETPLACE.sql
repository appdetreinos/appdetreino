-- Migration 0051_MARKETPLACE.sql
-- Vitrine: trainer vende planilha de treino/dieta pra outro trainer.
-- IDEMPOTENTE.

ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS is_for_sale BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_cents INT;

ALTER TABLE public.diet_templates
  ADD COLUMN IF NOT EXISTS is_for_sale BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_cents INT;

-- Catálogo público entre trainers autenticados
DROP POLICY IF EXISTS workout_templates_read_marketplace ON public.workout_templates;
CREATE POLICY workout_templates_read_marketplace ON public.workout_templates
  FOR SELECT TO authenticated
  USING (is_for_sale = true);

DROP POLICY IF EXISTS workout_template_items_read_marketplace ON public.workout_template_items;
CREATE POLICY workout_template_items_read_marketplace ON public.workout_template_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workout_templates t
    WHERE t.id = workout_template_items.template_id AND t.is_for_sale = true
  ));

DROP POLICY IF EXISTS diet_templates_read_marketplace ON public.diet_templates;
CREATE POLICY diet_templates_read_marketplace ON public.diet_templates
  FOR SELECT TO authenticated
  USING (is_for_sale = true);

DROP POLICY IF EXISTS dtm_read_marketplace ON public.diet_template_meals;
CREATE POLICY dtm_read_marketplace ON public.diet_template_meals
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.diet_templates t
    WHERE t.id = diet_template_meals.template_id AND t.is_for_sale = true
  ));

DROP POLICY IF EXISTS dti_read_marketplace ON public.diet_template_items;
CREATE POLICY dti_read_marketplace ON public.diet_template_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.diet_template_meals m
    JOIN public.diet_templates t ON t.id = m.template_id
    WHERE m.id = diet_template_items.meal_id AND t.is_for_sale = true
  ));

-- Dono edita preço/vitrine dos próprios
DROP POLICY IF EXISTS workout_templates_sell_own ON public.workout_templates;
CREATE POLICY workout_templates_sell_own ON public.workout_templates
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
