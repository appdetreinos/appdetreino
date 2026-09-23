-- Migration 0048_SPRINT1_CONSOLIDATED.sql
-- Sprint 1: garante que produção tenha tudo que o código espera.
-- IDEMPOTENTE: pode rodar várias vezes no SQL Editor do Supabase.

-- 1. Onboarding columns (caso 0014 não tenha rodado em prod)
ALTER TABLE public.trainer_profiles
  ADD COLUMN IF NOT EXISTS actuation TEXT,
  ADD COLUMN IF NOT EXISTS client_volume TEXT,
  ADD COLUMN IF NOT EXISTS monthly_revenue TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_step INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- 2. diet_templates + filhas (caso 0022 não tenha rodado em prod)
CREATE TABLE IF NOT EXISTS public.diet_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  kcal_target INT,
  p_target INT,
  c_target INT,
  g_target INT,
  goal TEXT,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.diet_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "diet_templates_read" ON public.diet_templates;
CREATE POLICY "diet_templates_read" ON public.diet_templates
  FOR SELECT TO authenticated
  USING (is_global = true OR trainer_id = auth.uid());

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
CREATE POLICY "dtm_read" ON public.diet_template_meals
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.diet_templates t
    WHERE t.id = diet_template_meals.template_id
      AND (t.is_global = true OR t.trainer_id = auth.uid())
  ));

CREATE TABLE IF NOT EXISTS public.diet_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES public.diet_template_meals(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  grams INT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.diet_template_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dti_read" ON public.diet_template_items;
CREATE POLICY "dti_read" ON public.diet_template_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.diet_template_meals m
    JOIN public.diet_templates t ON t.id = m.template_id
    WHERE m.id = diet_template_items.meal_id
      AND (t.is_global = true OR t.trainer_id = auth.uid())
  ));

-- Seeds globais (só insere se ainda não existir pelo título)
INSERT INTO public.diet_templates (trainer_id, title, description, kcal_target, p_target, c_target, g_target, goal, is_global)
SELECT NULL, x.title, x.description, x.kcal, x.p, x.c, x.g, x.goal, true
FROM (VALUES
  ('Cutting 1.800 kcal', 'Plano agressivo pra cutting mantendo proteína alta.', 1800, 180, 130, 50, 'cutting'),
  ('Manutenção 2.200 kcal', 'Plano pra manter peso com composição saudável.', 2200, 160, 220, 70, 'manutenção'),
  ('Bulking limpo 2.800 kcal', 'Superávit moderado pra ganho de massa.', 2800, 200, 320, 80, 'bulking'),
  ('Recomposição 2.000 kcal', 'Perder gordura e ganhar músculo ao mesmo tempo.', 2000, 170, 180, 60, 'recomposição')
) AS x(title, description, kcal, p, c, g, goal)
WHERE NOT EXISTS (SELECT 1 FROM public.diet_templates t WHERE t.title = x.title AND t.is_global = true);

-- 3. habits.target_count (caso coluna esteja com nome antigo)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'habits' AND column_name = 'target_value'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'habits' AND column_name = 'target_count'
  ) THEN
    ALTER TABLE public.habits RENAME COLUMN target_value TO target_count;
  END IF;
END $$;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS target_count INT NOT NULL DEFAULT 1;

-- 4. RLS leitura trainer (reaplica 0045 de forma idempotente)
DROP POLICY IF EXISTS "student_profiles_trainer_all" ON public.student_profiles;
DROP POLICY IF EXISTS "student_profiles_self_read" ON public.student_profiles;
DROP POLICY IF EXISTS "trainer_full_access_students" ON public.student_profiles;
DROP POLICY IF EXISTS "student_trainer_read" ON public.student_profiles;
DROP POLICY IF EXISTS "trainer_read_own_students" ON public.student_profiles;
DROP POLICY IF EXISTS "trainer_modify_own_students" ON public.student_profiles;
CREATE POLICY "trainer_read_own_students" ON public.student_profiles
  FOR SELECT USING (trainer_id = auth.uid());
CREATE POLICY "trainer_modify_own_students" ON public.student_profiles
  FOR ALL USING (trainer_id = auth.uid()) WITH CHECK (trainer_id = auth.uid());
DROP POLICY IF EXISTS "student_self_read_own" ON public.student_profiles;
CREATE POLICY "student_self_read_own" ON public.student_profiles
  FOR SELECT USING (user_id = auth.uid());
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- 5. Sincroniza órfãos: convite aceito sem student_profiles vira active
INSERT INTO public.student_profiles (user_id, trainer_id, status, full_name)
SELECT si.accepted_by, si.trainer_id, 'active', si.full_name
FROM public.student_invites si
WHERE si.status = 'accepted' AND si.accepted_by IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET trainer_id = EXCLUDED.trainer_id, status = 'active';
