-- 0009_guard_role_jwt.sql
-- Substitui `is_superuser` (que não funciona bem em produção atrás de PostgREST)
-- por checagem via JWT custom claim `role = service_role`. Apenas o backend
-- com service_role key pode atualizar `profiles.role`.

CREATE OR REPLACE FUNCTION public.guard_role_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  jwt_role text;
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- auth.jwt() -> 'role' é o JWT custom claim; só o backend service_role tem.
    jwt_role := (auth.jwt() ->> 'role');

    -- se JWT tem 'role' = service_role, permite (uso do backend admin).
    -- caso contrário, rejeita.
    IF jwt_role IS DISTINCT FROM 'service_role' THEN
      RAISE EXCEPTION 'role_immutable: apenas service_role pode alterar profiles.role'
        USING ERRCODE = '42501'; -- insufficient_privilege
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- O trigger já existe de 0006, recriamos só a função para garantir.
DROP TRIGGER IF EXISTS profiles_role_guard ON public.profiles;
CREATE TRIGGER profiles_role_guard
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_role_immutable();
