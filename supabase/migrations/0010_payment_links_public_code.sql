-- 0010_payment_links_public_code.sql
-- Adiciona coluna public_code para URL curta tipo /pay/abc123
-- (12 chars hex = ~2^48 combinações, suficiente pro MVP).

ALTER TABLE public.payment_links
  ADD COLUMN IF NOT EXISTS public_code TEXT;

-- Preenche os existentes com codigo derivado do external_id (idempotente).
UPDATE public.payment_links
  SET public_code = UPPER(SUBSTRING(MD5(id::text) FROM 1 FOR 12))
  WHERE public_code IS NULL;

-- Constraint única (a partir daqui, sempre populado)
ALTER TABLE public.payment_links
  ALTER COLUMN public_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_links_public_code
  ON public.payment_links(public_code);

COMMENT ON COLUMN public.payment_links.public_code IS
  'Código curto (12 chars hex) usado na URL pública /pay/[code].';
