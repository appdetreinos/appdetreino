-- Migration 0015 — Onboarding checklist (tour guiado do primeiro login)
--
-- Idempotente.
--
-- 4 tarefas que o trainer pode marcar como concluídas no dashboard:
--   1. invited_student  : convidou o primeiro aluno (criou um student_invite)
--   2. sent_workout     : mandou o primeiro treino (criou um workout)
--   3. sent_diet        : mandou a primeira dieta (criou uma diet)
--   4. configured_pay   : configurou cobrança recorrente (criou um payment_link)
--
-- O front mostra o progresso "0/4", "1/4"... e some quando completar.
--
-- Também adiciona `password_setup_completed_at` em profiles: usado pra
-- saber se o usuário já entrou com a senha dele (vs entrou com link de
-- "definir senha" do e-mail de boas-vindas) — futuro uso.

ALTER TABLE public.trainer_profiles
  ADD COLUMN IF NOT EXISTS onboarding_checklist_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checklist_invited_student_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checklist_sent_workout_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checklist_sent_diet_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checklist_configured_pay_at TIMESTAMPTZ;

-- Comentários pra DX
COMMENT ON COLUMN public.trainer_profiles.onboarding_checklist_completed_at IS
  'Quando o trainer marcou todas as 4 tarefas do checklist de boas-vindas. NULL = checklist visível.';
COMMENT ON COLUMN public.trainer_profiles.checklist_invited_student_at IS
  'Tarefa 1: convidou o primeiro aluno.';
COMMENT ON COLUMN public.trainer_profiles.checklist_sent_workout_at IS
  'Tarefa 2: mandou o primeiro treino.';
COMMENT ON COLUMN public.trainer_profiles.checklist_sent_diet_at IS
  'Tarefa 3: mandou a primeira dieta.';
COMMENT ON COLUMN public.trainer_profiles.checklist_configured_pay_at IS
  'Tarefa 4: configurou cobrança recorrente.';

-- ============================================================
-- Função: marcar 1 item do checklist + checar se completou tudo
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_onboarding_checklist(
  p_task TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_col TEXT;
  v_now TIMESTAMPTZ := now();
  v_completed_at TIMESTAMPTZ;
  v_count INT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated'
      USING ERRCODE = '42501';
  END IF;

  -- Whitelist de tasks pra evitar SQL injection no identifier
  v_col := CASE p_task
    WHEN 'invited_student' THEN 'checklist_invited_student_at'
    WHEN 'sent_workout' THEN 'checklist_sent_workout_at'
    WHEN 'sent_diet' THEN 'checklist_sent_diet_at'
    WHEN 'configured_pay' THEN 'checklist_configured_pay_at'
    ELSE NULL
  END;

  IF v_col IS NULL THEN
    RAISE EXCEPTION 'invalid_task: %', p_task
      USING ERRCODE = '22023';
  END IF;

  -- Marca a coluna específica (idempotente — se já tá preenchida, no-op)
  EXECUTE format(
    'UPDATE public.trainer_profiles
       SET %I = COALESCE(%I, $1)
     WHERE user_id = $2',
    v_col, v_col
  )
  USING v_now, v_user_id;

  -- Recalcula se completou tudo
  SELECT
    (CASE WHEN checklist_invited_student_at  IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN checklist_sent_workout_at     IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN checklist_sent_diet_at        IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN checklist_configured_pay_at   IS NOT NULL THEN 1 ELSE 0 END),
    onboarding_checklist_completed_at
  INTO v_count, v_completed_at
  FROM public.trainer_profiles
  WHERE user_id = v_user_id;

  IF v_count >= 4 AND v_completed_at IS NULL THEN
    UPDATE public.trainer_profiles
      SET onboarding_checklist_completed_at = v_now
    WHERE user_id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'task', p_task,
    'completed_count', v_count,
    'all_done', v_count >= 4
  );
END;
$$;

-- ============================================================
-- Auto-marcar quando a ação acontece de verdade
-- (não precisa o front chamar mark_onboarding_checklist)
-- ============================================================

-- 1. Convite de aluno → invited_student
CREATE OR REPLACE FUNCTION public.trg_auto_checklist_invite()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.trainer_id IS NOT NULL THEN
    PERFORM public.mark_onboarding_checklist('invited_student');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS student_invites_checklist ON public.student_invites;
CREATE TRIGGER student_invites_checklist
  AFTER INSERT ON public.student_invites
  FOR EACH ROW EXECUTE FUNCTION public.trg_auto_checklist_invite();

-- 2. Workout criado → sent_workout
CREATE OR REPLACE FUNCTION public.trg_auto_checklist_workout()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.trainer_id IS NOT NULL THEN
    PERFORM public.mark_onboarding_checklist('sent_workout');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workouts_checklist ON public.workouts;
CREATE TRIGGER workouts_checklist
  AFTER INSERT ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.trg_auto_checklist_workout();

-- 3. Dieta criada → sent_diet
CREATE OR REPLACE FUNCTION public.trg_auto_checklist_diet()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.trainer_id IS NOT NULL THEN
    PERFORM public.mark_onboarding_checklist('sent_diet');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS diets_checklist ON public.diets;
CREATE TRIGGER diets_checklist
  AFTER INSERT ON public.diets
  FOR EACH ROW EXECUTE FUNCTION public.trg_auto_checklist_diet();

-- 4. Payment link criado → configured_pay
CREATE OR REPLACE FUNCTION public.trg_auto_checklist_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.trainer_id IS NOT NULL THEN
    PERFORM public.mark_onboarding_checklist('configured_pay');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payment_links_checklist ON public.payment_links;
CREATE TRIGGER payment_links_checklist
  AFTER INSERT ON public.payment_links
  FOR EACH ROW EXECUTE FUNCTION public.trg_auto_checklist_payment();

-- Permissões: trainer pode chamar a função e ler os próprios checks
GRANT EXECUTE ON FUNCTION public.mark_onboarding_checklist(TEXT) TO authenticated;

COMMENT ON FUNCTION public.mark_onboarding_checklist IS
  'Marca 1 das 4 tarefas do checklist de onboarding do trainer. Idempotente.';
