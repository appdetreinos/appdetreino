-- 0007_invite_code_trigger.sql
-- Gera `code` automaticamente em student_invites quando omitido.
-- Hex 16 chars (8 bytes), caps. Usado pelo trainer se a UI esquecer de gerar.

CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := UPPER(encode(gen_random_bytes(8), 'hex'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS student_invites_auto_code ON public.student_invites;
CREATE TRIGGER student_invites_auto_code
  BEFORE INSERT ON public.student_invites
  FOR EACH ROW EXECUTE FUNCTION public.generate_invite_code();

-- Garantir coluna code existe (idempotente) caso migration prévia falhou.
ALTER TABLE public.student_invites
  ALTER COLUMN code SET DEFAULT NULL;

-- Comentário de orientação
COMMENT ON TRIGGER student_invites_auto_code ON public.student_invites IS
  'Auto-gera `code` hex 16-char se INSERT omitir. Trainer UI deve passar NULL.';
