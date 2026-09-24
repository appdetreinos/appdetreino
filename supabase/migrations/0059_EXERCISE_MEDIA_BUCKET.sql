-- Migration 0059_EXERCISE_MEDIA_BUCKET.sql
-- Bucket próprio pra mídia dos exercícios (Wikimedia limita hotlink
-- com 429 — servindo do nosso domínio, acaba o problema).
-- IDEMPOTENTE.

INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-media', 'exercise-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Leitura pública (thumbnails do picker/runner)
DROP POLICY IF EXISTS "exercise_media_public_read" ON storage.objects;
CREATE POLICY "exercise_media_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'exercise-media');

-- Escrita só via service_role (scripts de seed); sem policy de INSERT
-- pra authenticated = ninguém sobe por conta própria.
