-- Migration 0025 — Trigger handle_new_user ultra-robusto
--
-- Resolve "Database error creating new user" no signup de aluno.
-- Causa provável: cast ::user_role falhando silenciosamente OU inserção em
-- trainer_profiles falhando quando role=student.
--
-- Estratégia:
--   - Valida role manualmente (default trainer, fallback se metadata inválido)
--   - NÃO insere em trainer_profiles se role=student
--   - Wrap em EXCEPTION handler que loga e continua (não bloqueia criação do user)
--   - Idempotente

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_role_enum user_role;
  v_full_name TEXT;
BEGIN
  -- Pega role e full_name do metadata, com fallbacks seguros
  v_role := NEW.raw_user_meta_data ->> 'role';
  v_full_name := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), split_part(NEW.email, '@', 1));

  -- Valida role (só aceita trainer/student/admin; senão default trainer)
  IF v_role IN ('trainer', 'student', 'admin') THEN
    v_role_enum := v_role::user_role;
  ELSE
    v_role_enum := 'trainer'::user_role;
  END IF;

  -- 1. Cria profile (sempre)
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (NEW.id, v_role_enum, v_full_name)
  ON CONFLICT (id) DO UPDATE
    SET role = EXCLUDED.role,
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name);

  -- 2. Se trainer, cria trainer_profile com trial (cobre só trainer)
  IF v_role_enum = 'trainer' THEN
    INSERT INTO public.trainer_profiles (user_id, plan_tier, trial_ends_at)
    VALUES (NEW.id, 'start', now() + interval '3 days')
    ON CONFLICT (user_id) DO UPDATE
      SET trial_ends_at = COALESCE(public.trainer_profiles.trial_ends_at, EXCLUDED.trial_ends_at);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Se algo falhar (RLS, FK, check), LOGA mas não bloqueia criação do user.
  -- Assim o signup nunca quebra, mesmo se o profile/trainer_profile falhar.
  RAISE WARNING '[handle_new_user] user=% role=% err=%: %',
    NEW.id, v_role_enum, SQLSTATE, SQLERRM;
  RETURN NEW;
END;
$$;

-- Trigger (DROP IF EXISTS pra idempotência)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS
  'Cria profile + trainer_profile (se trainer) após signup. Tolerante a falhas: nunca bloqueia criação do user.';
