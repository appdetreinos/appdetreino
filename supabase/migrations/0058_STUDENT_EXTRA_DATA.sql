-- Migration 0058_STUDENT_EXTRA_DATA.sql
-- Completa o cadastro do aluno: emergência + restrições médicas.
-- (gender/height_cm já existem desde 0001; birthdate também.)
-- IDEMPOTENTE.

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
  ADD COLUMN IF NOT EXISTS medical_notes TEXT;
