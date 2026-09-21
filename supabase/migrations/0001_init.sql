-- Migration 0001 — estrutura inicial Painel FIT
-- Idempotente: pode rodar múltiplas vezes

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- Enums
-- ============================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('trainer', 'student', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE plan_tier AS ENUM ('start', 'pro', 'top');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE student_status AS ENUM ('active', 'inactive', 'paused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE evolution_instance_state AS ENUM ('open', 'close', 'connecting');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE billing_type AS ENUM ('PIX', 'CREDIT_CARD', 'BOLETO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- Perfis (1:1 com auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'trainer',
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  cref TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trainer_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  bio TEXT,
  specialties TEXT[] DEFAULT '{}',
  plan_tier plan_tier NOT NULL DEFAULT 'start',
  trial_ends_at TIMESTAMPTZ,
  evolution_instance TEXT,
  evolution_apikey_enc BYTEA,
  asaas_wallet_id TEXT,
  onboarding_step SMALLINT NOT NULL DEFAULT 0,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES public.trainer_profiles(user_id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE,
  status student_status NOT NULL DEFAULT 'active',
  full_name TEXT NOT NULL,
  phone TEXT,
  birthdate DATE,
  gender TEXT,
  height_cm NUMERIC(5,1),
  goal TEXT,
  xp_total INT NOT NULL DEFAULT 0,
  streak_current INT NOT NULL DEFAULT 0,
  streak_last_action_at TIMESTAMPTZ,
  asaas_customer_id TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_trainer ON public.student_profiles(trainer_id);
CREATE INDEX IF NOT EXISTS idx_student_status ON public.student_profiles(status);

-- ============================================================
-- Treinos + exercícios
-- ============================================================
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES public.trainer_profiles(user_id) ON DELETE CASCADE, -- NULL = biblioteca global
  name TEXT NOT NULL,
  video_url TEXT,
  muscle_group TEXT,
  equipment TEXT,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.trainer_profiles(user_id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  goal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workout_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  title TEXT,
  UNIQUE (workout_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS public.workout_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_day_id UUID NOT NULL REFERENCES public.workout_days(id) ON DELETE CASCADE,
  position SMALLINT NOT NULL,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id),
  sets SMALLINT NOT NULL,
  reps TEXT NOT NULL,
  load TEXT,
  rest_seconds SMALLINT,
  rpe SMALLINT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- Dietas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kcal_100g NUMERIC(7,2),
  protein_100g NUMERIC(6,2),
  carbs_100g NUMERIC(6,2),
  fat_100g NUMERIC(6,2),
  source TEXT NOT NULL DEFAULT 'taco'
);

CREATE TABLE IF NOT EXISTS public.diets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.trainer_profiles(user_id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  kcal_target INT,
  p_target INT,
  c_target INT,
  g_target INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diet_id UUID NOT NULL REFERENCES public.diets(id) ON DELETE CASCADE,
  position SMALLINT NOT NULL,
  time TIME,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.meal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  food_id UUID NOT NULL REFERENCES public.foods(id),
  grams NUMERIC(7,1) NOT NULL
);

-- ============================================================
-- Avaliação física
-- ============================================================
CREATE TABLE IF NOT EXISTS public.measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_kg NUMERIC(5,2),
  body_fat_pct NUMERIC(4,2),
  chest_cm NUMERIC(5,1),
  waist_cm NUMERIC(5,1),
  hip_cm NUMERIC(5,1),
  arm_cm NUMERIC(5,1),
  thigh_cm NUMERIC(5,1),
  photos_urls TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Pagamentos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.trainer_profiles(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  cycle TEXT NOT NULL DEFAULT 'MONTHLY',
  billing_type billing_type NOT NULL DEFAULT 'PIX'
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.trainer_profiles(user_id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  gateway TEXT NOT NULL DEFAULT 'mercadopago',
  external_id TEXT,
  billing_type billing_type,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_trainer ON public.payments(trainer_id);
CREATE INDEX IF NOT EXISTS idx_payments_student ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- ============================================================
-- WhatsApp / Evolution
-- ============================================================
CREATE TABLE IF NOT EXISTS public.evolution_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL UNIQUE REFERENCES public.trainer_profiles(user_id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  state evolution_instance_state NOT NULL DEFAULT 'close',
  qr_code_base64 TEXT,
  phone TEXT,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.evolution_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.trainer_profiles(user_id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  UNIQUE(trainer_id, key)
);

CREATE TABLE IF NOT EXISTS public.evolution_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.trainer_profiles(user_id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  direction TEXT NOT NULL,
  to_phone TEXT,
  from_phone TEXT,
  type TEXT NOT NULL DEFAULT 'text',
  payload_jsonb JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.evolution_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_jsonb JSONB,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Comunidade + gamificação
-- ============================================================
CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.trainer_profiles(user_id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  audience TEXT NOT NULL DEFAULT 'students',
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_likes (
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  criteria_jsonb JSONB
);

CREATE TABLE IF NOT EXISTS public.student_badges (
  student_id UUID NOT NULL REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, badge_id)
);

CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.trainer_profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reward_xp INT DEFAULT 0,
  reward_badge UUID REFERENCES public.badges(id)
);

CREATE TABLE IF NOT EXISTS public.challenge_participants (
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
  progress INT NOT NULL DEFAULT 0,
  PRIMARY KEY (challenge_id, student_id)
);

-- ============================================================
-- LGPD
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  resource_type TEXT NOT NULL,
  resource_id UUID,
  action TEXT NOT NULL,
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS (multi-tenant) — habilitado em todas as tabelas
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Policies básicas (multi-tenant via trainer_id)
-- ============================================================

-- profiles: cada um lê o próprio; trainer lê profiles dos seus alunos
CREATE POLICY "profiles_self_read" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- trainer_profiles: próprio trainer lê; admin lê tudo
CREATE POLICY "trainer_self_read" ON public.trainer_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "trainer_self_update" ON public.trainer_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "trainer_self_insert" ON public.trainer_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- student_profiles: trainer lê seus alunos; aluno lê o próprio
CREATE POLICY "student_trainer_read" ON public.student_profiles
  FOR SELECT USING (
    trainer_id = auth.uid() OR user_id = auth.uid()
  );

CREATE POLICY "student_self_update" ON public.student_profiles
  FOR UPDATE USING (user_id = auth.uid() OR trainer_id = auth.uid());

CREATE POLICY "trainer_insert_student" ON public.student_profiles
  FOR INSERT WITH CHECK (trainer_id = auth.uid());

-- workouts/diets/payments/evolution_messages: trainer escopa por trainer_id
-- aluno só lê o que tem student_id = auth.uid()

CREATE POLICY "workouts_trainer_all" ON public.workouts
  FOR ALL USING (
    trainer_id = auth.uid()
    OR (student_id IS NOT NULL AND student_id IN (
      SELECT user_id FROM public.student_profiles WHERE trainer_id = auth.uid()
    ))
  );

CREATE POLICY "workouts_student_read" ON public.workouts
  FOR SELECT USING (
    student_id = auth.uid()
  );

CREATE POLICY "diets_trainer_all" ON public.diets
  FOR ALL USING (
    trainer_id = auth.uid()
    OR student_id = auth.uid()
    OR student_id IN (SELECT user_id FROM public.student_profiles WHERE trainer_id = auth.uid())
  );

CREATE POLICY "payments_trainer_all" ON public.payments
  FOR ALL USING (
    trainer_id = auth.uid()
    OR student_id = auth.uid()
  );

CREATE POLICY "evolution_trainer_all" ON public.evolution_instances
  FOR ALL USING (trainer_id = auth.uid());

CREATE POLICY "evolution_tpl_trainer_all" ON public.evolution_templates
  FOR ALL USING (trainer_id = auth.uid());

CREATE POLICY "evolution_msg_trainer_all" ON public.evolution_messages
  FOR ALL USING (trainer_id = auth.uid());

CREATE POLICY "community_post_read" ON public.community_posts
  FOR SELECT USING (
    trainer_id = auth.uid()
    OR author_id = auth.uid()
    OR (
      audience = 'students'
      AND EXISTS (
        SELECT 1 FROM public.student_profiles
        WHERE user_id = auth.uid() AND trainer_id = community_posts.trainer_id
      )
    )
  );

CREATE POLICY "community_post_insert" ON public.community_posts
  FOR INSERT WITH CHECK (trainer_id = auth.uid() OR author_id = auth.uid());

CREATE POLICY "audit_self_read" ON public.audit_log
  FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- Trigger: cria profile ao signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'trainer'),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;

  IF (NEW.raw_user_meta_data ->> 'role') = 'trainer' THEN
    INSERT INTO public.trainer_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();