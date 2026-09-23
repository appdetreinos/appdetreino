-- Migration 0049_SPRINT2_PARITY.sql
-- Sprint 2: trocas equivalentes na dieta + fotos de evolução.
-- IDEMPOTENTE: pode rodar várias vezes no SQL Editor do Supabase.

-- ============================================================
-- (1) Trocas equivalentes por alimento (anti-PDF, padrão Prime)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meal_item_substitutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_item_id UUID NOT NULL REFERENCES public.meal_items(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  grams INT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_substitutes_item ON public.meal_item_substitutes(meal_item_id);

ALTER TABLE public.meal_item_substitutes ENABLE ROW LEVEL SECURITY;

-- Trainer gerencia trocas dos próprios planos
DROP POLICY IF EXISTS "substitutes_trainer_all" ON public.meal_item_substitutes;
CREATE POLICY "substitutes_trainer_all" ON public.meal_item_substitutes
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.meal_items mi
    JOIN public.meals m ON m.id = mi.meal_id
    JOIN public.diets d ON d.id = m.diet_id
    WHERE mi.id = meal_item_substitutes.meal_item_id
      AND d.trainer_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.meal_items mi
    JOIN public.meals m ON m.id = mi.meal_id
    JOIN public.diets d ON d.id = m.diet_id
    WHERE mi.id = meal_item_substitutes.meal_item_id
      AND d.trainer_id = auth.uid()
  ));

-- Aluno lê trocas do próprio plano
DROP POLICY IF EXISTS "substitutes_student_select" ON public.meal_item_substitutes;
CREATE POLICY "substitutes_student_select" ON public.meal_item_substitutes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.meal_items mi
    JOIN public.meals m ON m.id = mi.meal_id
    JOIN public.diets d ON d.id = m.diet_id
    WHERE mi.id = meal_item_substitutes.meal_item_id
      AND d.student_id = auth.uid()
  ));

-- ============================================================
-- (2) Bucket de fotos de evolução (comparar antes/depois)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('measurement-photos', 'measurement-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Upload: só na própria pasta (primeiro segmento = auth.uid())
DROP POLICY IF EXISTS "measurement_photos_insert_own" ON storage.objects;
CREATE POLICY "measurement_photos_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'measurement-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Leitura pública (comparar evolução + trainer ver aluno)
DROP POLICY IF EXISTS "measurement_photos_select_public" ON storage.objects;
CREATE POLICY "measurement_photos_select_public" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'measurement-photos');

-- Delete: só da própria pasta
DROP POLICY IF EXISTS "measurement_photos_delete_own" ON storage.objects;
CREATE POLICY "measurement_photos_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'measurement-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
