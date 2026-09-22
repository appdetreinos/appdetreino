-- Migration 0024 — Auto-criação de profile + trainer_profile on-demand
--
-- Resolve bug "Falha ao configurar perfil de profissional" ao criar convite.
-- Causa raiz: trainer logou, mas profile em `profiles` nunca foi criado
-- (handle_new_user falhou silenciosamente em algum signup). Sem profile,
-- o trainer_profile FK quebra.
--
-- Estratégia:
--   1. Policy INSERT em `profiles` permitindo o próprio user criar (auth.uid() = id)
--   2. RPC `ensure_trainer_ready()` SECURITY DEFINER que cria profile + trainer_profile
--      numa única chamada (bypass RLS pra qualquer um dos dois).

-- ============================================================
-- 1. Policy INSERT em profiles (auto-criação)
-- ============================================================

DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
CREATE POLICY "profiles_self_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- 2. RPC ensure_trainer_ready — idempotente, cria tudo que faltar
-- ============================================================

CREATE OR REPLACE FUNCTION public.ensure_trainer_ready()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_email TEXT;
  v_user_full_name TEXT;
  v_profile_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- 1. Garante profile existe
  SELECT id INTO v_profile_id FROM public.profiles WHERE id = v_user_id;
  IF v_profile_id IS NULL THEN
    -- Pega email/full_name do auth.users
    SELECT email, COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
      INTO v_user_email, v_user_full_name
    FROM auth.users WHERE id = v_user_id;

    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (v_user_id, COALESCE(v_user_full_name, 'Profissional'), v_user_email, 'trainer')
    ON CONFLICT (id) DO NOTHING;
  ELSE
    -- Se profile existe mas role não é trainer, atualiza
    UPDATE public.profiles SET role = 'trainer' WHERE id = v_user_id AND role <> 'trainer';
  END IF;

  -- 2. Garante trainer_profile existe (com trial_ends_at)
  IF NOT EXISTS (SELECT 1 FROM public.trainer_profiles WHERE user_id = v_user_id) THEN
    INSERT INTO public.trainer_profiles (user_id, plan_tier, trial_ends_at)
    VALUES (v_user_id, 'start', now() + interval '3 days')
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    -- Se já existe mas trial_ends_at é NULL, garante
    UPDATE public.trainer_profiles
      SET trial_ends_at = COALESCE(trial_ends_at, now() + interval '3 days')
      WHERE user_id = v_user_id AND trial_ends_at IS NULL;
  END IF;

  RETURN jsonb_build_object('ok', true, 'user_id', v_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_trainer_ready() TO authenticated;

COMMENT ON FUNCTION public.ensure_trainer_ready() IS
  'Idempotente: garante profile + trainer_profile pro trainer logado. Chamado antes de criar convite.';
