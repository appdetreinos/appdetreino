-- ============================================================
-- Migration 0004: Cobrança via Pix direto (mensagem WhatsApp)
-- ============================================================
-- Decisão de produto: o app NÃO intermedia pagamento.
-- Cada trainer cadastra a chave Pix dele e o app dispara
-- mensagem automática no WhatsApp com a chave + valor.
-- Aluno paga direto na conta do trainer.

-- 1. Trainer cadastra a chave Pix dele
ALTER TABLE public.trainer_profiles
  ADD COLUMN IF NOT EXISTS pix_key TEXT,
  ADD COLUMN IF NOT EXISTS pix_key_type TEXT CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
  ADD COLUMN IF NOT EXISTS pix_beneficiary_name TEXT;

-- 2. Remove a FK de Asaas (não usamos mais nessa versão)
ALTER TABLE public.payments DROP COLUMN IF EXISTS asaas_customer_id;
ALTER TABLE public.student_profiles DROP COLUMN IF EXISTS asaas_customer_id;
ALTER TABLE public.trainer_profiles DROP COLUMN IF EXISTS asaas_wallet_id;
ALTER TABLE public.trainer_profiles DROP COLUMN IF EXISTS stripe_customer_id;

-- 3. Altera default do gateway — agora é só "pix_direto" por enquanto
ALTER TABLE public.payments
  ALTER COLUMN gateway SET DEFAULT 'pix_direto',
  DROP CONSTRAINT IF EXISTS payments_gateway_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_gateway_check
  CHECK (gateway IN ('pix_direto', 'mercadopago', 'manual'));

-- 4. Mensagens automáticas — template que o app vai disparar pro aluno
-- quando o trainer clica em "Cobrar". As vars {{nome}}, {{valor}}, {{chave_pix}}
-- são resolvidas no momento do envio.
CREATE TABLE IF NOT EXISTS public.payment_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.trainer_profiles(user_id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  -- Conteúdo final enviado (template + vars resolvidas), pra debug/auditoria
  resolved_text TEXT NOT NULL,
  whatsapp_to TEXT, -- telefone do aluno (com DDI 55)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_messages_trainer ON public.payment_messages(trainer_id);
CREATE INDEX IF NOT EXISTS idx_payment_messages_payment ON public.payment_messages(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_messages_status ON public.payment_messages(status);

ALTER TABLE public.payment_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_messages_trainer_all ON public.payment_messages;
CREATE POLICY payment_messages_trainer_all ON public.payment_messages
  FOR ALL
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- 5. Settings do trainer — onde ele configura Pix + templates
CREATE TABLE IF NOT EXISTS public.trainer_settings (
  user_id UUID PRIMARY KEY REFERENCES public.trainer_profiles(user_id) ON DELETE CASCADE,
  -- Cobrança
  pix_key TEXT,
  pix_key_type TEXT CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
  pix_beneficiary_name TEXT,
  -- Mensagens
  default_charge_message TEXT NOT NULL DEFAULT 'Oi, {{nome}}! 💪 Passando pra avisar que tua mensalidade de {{valor}} tá em aberto. Paga direto no Pix: {{chave_pix}} (em nome de {{beneficiario}}). Qualquer coisa me chama! 🔥',
  default_overdue_message TEXT NOT NULL DEFAULT 'Fala, {{nome}}. Tua mensalidade de {{valor}} venceu há {{dias_atraso}} dias. Quando puder pagar, a chave Pix é {{chave_pix}} (em nome de {{beneficiario}}). Tô no WhatsApp se precisar! 💬',
  -- Onboarding
  onboarding_completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trainer_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trainer_settings_all ON public.trainer_settings;
CREATE POLICY trainer_settings_all ON public.trainer_settings
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trigger: cria trainer_settings sempre que um trainer_profiles nasce
CREATE OR REPLACE FUNCTION public.handle_new_trainer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.trainer_settings (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_trainer_created ON public.trainer_profiles;
CREATE TRIGGER on_trainer_created
  AFTER INSERT ON public.trainer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_trainer();
