-- Migration 0011 — Backfill trainer_profiles + tornar handle_new_user robusto
-- Idempotente: roda múltiplas vezes sem erro.
--
-- Problema: usuários criados sem `role='trainer'` no metadata (signup direto,
-- admin, import) não ganham `trainer_profiles`, quebrando FKs que dependem dela
-- (ex: student_invites.trainer_id, workouts.trainer_id, etc).
--
-- Fix em 2 partes:
--   1. Backfill: cria trainer_profiles pra todo profile com role='trainer'
--      que ainda não tem registro.
--   2. Trigger atualizado: cria trainer_profiles também quando o profile é
--      inserido direto (não só via signup).

-- ============================================================
-- 1. Backfill: cobre todos os trainers existentes
-- ============================================================

INSERT INTO public.trainer_profiles (user_id)
SELECT p.id
FROM public.profiles p
LEFT JOIN public.trainer_profiles tp ON tp.user_id = p.id
WHERE p.role = 'trainer'
  AND tp.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 2. Trigger em profiles (cobre INSERT direto, não só auth.users)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'trainer' THEN
    INSERT INTO public.trainer_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF NEW.role = 'student' THEN
    -- Aluno precisa ter um trainer_id. Se auth metadata trouxer, usa; senão NULL
    -- (futuramente student_profiles.trainer_id NOT NULL vai precisar default).
    -- Por ora, deixamos criar o profile só — student_profiles é criado no fluxo de
    -- accept_invite.
    NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_role_setup ON public.profiles;
CREATE TRIGGER profiles_role_setup
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();

-- Backfill adicional: cobre o caso onde profile foi inserido em corrida
-- com handle_new_user mas trainer_profiles não chegou a ser criado
-- (transação paralela, falha de permissão, etc).
INSERT INTO public.trainer_profiles (user_id)
SELECT p.id
FROM public.profiles p
LEFT JOIN public.trainer_profiles tp ON tp.user_id = p.id
WHERE p.role = 'trainer'
  AND tp.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;
