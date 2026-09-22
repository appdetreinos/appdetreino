-- Migration 0002 — features avançadas (o que os concorrentes têm e a gente também passa a ter)
-- Idempotente

-- ============================================================
-- ENUMS novos
-- ============================================================
DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE appointment_type AS ENUM ('presencial', 'online', 'avaliacao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE habit_frequency AS ENUM ('daily', 'weekly', 'weekdays', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE recurrence_type AS ENUM ('none', 'weekly', 'biweekly', 'monthly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- AGENDAMENTO / APPOINTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.appointment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                       -- "Avaliação inicial", "Sessão presencial"
  duration_minutes INT NOT NULL DEFAULT 60,
  type appointment_type NOT NULL DEFAULT 'presencial',
  price_cents INT,                          -- null = grátis
  color TEXT DEFAULT '#FF6B35',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  appointment_type_id UUID REFERENCES public.appointment_types(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status appointment_status NOT NULL DEFAULT 'scheduled',
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_appointments_trainer_starts ON public.appointments(trainer_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_student_starts ON public.appointments(student_id, starts_at);

-- Disponibilidade do trainer (dias e horários que ele atende)
CREATE TABLE IF NOT EXISTS public.trainer_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),  -- 0=domingo, 6=sábado
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trainer_id, weekday, start_time)
);

-- ============================================================
-- HÁBITOS CUSTOMIZADOS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                       -- "Beber 3L de água", "Dormir 8h"
  icon TEXT,                                -- emoji ou lucide icon name
  frequency habit_frequency NOT NULL DEFAULT 'daily',
  target_count INT NOT NULL DEFAULT 1,      -- ex: 3L de água por dia
  unit TEXT,                                -- "L", "h", "refeições"
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  count NUMERIC NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(habit_id, logged_at)
);

-- ============================================================
-- WOD (Workout of the Day)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,                      -- "Franco 21-15-9", "AMRAP 20"
  description TEXT,
  scheduled_for DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trainer_id, scheduled_for)
);

CREATE TABLE IF NOT EXISTS public.wod_participants (
  wod_id UUID NOT NULL REFERENCES public.wods(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  result_time_seconds INT,                  -- se for "for time"
  result_rounds INT,                        -- se for AMRAP
  result_notes TEXT,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (wod_id, student_id)
);

-- ============================================================
-- RECORRÊNCIA DE TREINOS (auto-repeat semanal)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workout_recurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recurrence recurrence_type NOT NULL DEFAULT 'weekly',
  start_date DATE NOT NULL,
  end_date DATE,                            -- null = sem fim
  weekday SMALLINT,                         -- 0=dom, 6=sáb (se weekly)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- LISTA DE COMPRAS (gerada a partir da dieta)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  diet_id UUID REFERENCES public.diets(id) ON DELETE SET NULL,
  week_start DATE NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_list_id UUID NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  total_grams NUMERIC NOT NULL DEFAULT 0,
  category TEXT,                            -- "Proteínas", "Carboidratos", "Hortifruti"
  checked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- LINKS DE PAGAMENTO AVULSOS (não-recorrentes)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  description TEXT NOT NULL,                -- "Avaliação inicial", "Pack 4 sessões"
  amount_cents INT NOT NULL,
  billing_type billing_type NOT NULL DEFAULT 'PIX',
  external_id TEXT,                         -- ID do gateway (Mercado Pago)
  url TEXT,                                 -- link público
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_links_trainer ON public.payment_links(trainer_id, paid_at);

-- ============================================================
-- PUSH SUBSCRIPTIONS (notificações para aluno)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ANAMNESE DIGITAL (formulário pré-treino)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.anamnesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  answers JSONB NOT NULL,                   -- {objetivo: "emagrecer", lesoes: ["joelho"], etc.}
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id)
);

CREATE TABLE IF NOT EXISTS public.anamnesis_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  questions JSONB NOT NULL,                 -- [{key, label, type, options}]
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS — todas as tabelas novas respeitam multi-tenant
-- ============================================================
ALTER TABLE public.appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wod_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_recurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamnesis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamnesis_templates ENABLE ROW LEVEL SECURITY;

-- Trainer pode tudo no seu tenant; aluno lê só o próprio
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'appointment_types','appointments','trainer_availability',
      'habits','wods','payment_links','anamnesis_templates'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_trainer_all ON public.%I', t, t);
    EXECUTE format('
      CREATE POLICY %I_trainer_all ON public.%I
      FOR ALL TO authenticated
      USING (trainer_id = auth.uid())
      WITH CHECK (trainer_id = auth.uid())',
      t, t);
  END LOOP;
END $$;

-- workout_recurrences NÃO tem trainer_id (só student_id + workout_id).
-- Trainer acessa via workout → trainer_id; aluno é o student_id direto.
DROP POLICY IF EXISTS workout_recurrences_trainer_all ON public.workout_recurrences;
CREATE POLICY workout_recurrences_trainer_all ON public.workout_recurrences
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_recurrences.workout_id
        AND w.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_recurrences.workout_id
        AND w.trainer_id = auth.uid()
    )
  );

-- Aluno lê seus próprios dados
DROP POLICY IF EXISTS appointments_student_select ON public.appointments;
CREATE POLICY appointments_student_select ON public.appointments
  FOR SELECT TO authenticated USING (student_id = auth.uid());

DROP POLICY IF EXISTS habits_student_all ON public.habits;
CREATE POLICY habits_student_all ON public.habits
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS habit_logs_student_all ON public.habit_logs;
CREATE POLICY habit_logs_student_all ON public.habit_logs
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS wods_student_select ON public.wods;
CREATE POLICY wods_student_select ON public.wods
  FOR SELECT TO authenticated USING (trainer_id IN (
    SELECT trainer_id FROM public.student_profiles WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS wod_participants_student_all ON public.wod_participants;
CREATE POLICY wod_participants_student_all ON public.wod_participants
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS shopping_lists_student_select ON public.shopping_lists;
CREATE POLICY shopping_lists_student_select ON public.shopping_lists
  FOR SELECT TO authenticated USING (student_id = auth.uid());

DROP POLICY IF EXISTS shopping_list_items_student_select ON public.shopping_list_items;
CREATE POLICY shopping_list_items_student_select ON public.shopping_list_items
  FOR SELECT TO authenticated USING (shopping_list_id IN (
    SELECT id FROM public.shopping_lists WHERE student_id = auth.uid()
  ));

DROP POLICY IF EXISTS payment_links_student_select ON public.payment_links;
CREATE POLICY payment_links_student_select ON public.payment_links
  FOR SELECT TO authenticated USING (student_id = auth.uid());

DROP POLICY IF EXISTS anamnesis_student_all ON public.anamnesis;
CREATE POLICY anamnesis_student_all ON public.anamnesis
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Trainer lê anamnese dos seus alunos
DROP POLICY IF EXISTS anamnesis_trainer_select ON public.anamnesis;
CREATE POLICY anamnesis_trainer_select ON public.anamnesis
  FOR SELECT TO authenticated USING (trainer_id = auth.uid());
