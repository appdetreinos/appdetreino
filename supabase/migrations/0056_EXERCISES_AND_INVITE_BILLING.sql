-- Migration 0056_EXERCISES_AND_INVITE_BILLING.sql
-- (1) Normaliza categorias (ombro→ombros, core→abdomen) — picker filtrava e achava zero.
-- (2) Remove exercícios duplicados (reaponta usos antes de apagar).
-- (3) Índice único anti-duplicata futura.
-- (4) Pack de ~40 exercícios novos PT-BR.
-- (5) Mensalidade no convite + primeira cobrança no aceite.
-- IDEMPOTENTE (partes 1-4; parte 5 usa IF NOT EXISTS / OR REPLACE).

-- ============================================================
-- (1) Normalização
-- ============================================================
UPDATE public.exercises SET muscle_group = 'ombros' WHERE muscle_group = 'ombro';
UPDATE public.exercises SET muscle_group = 'abdomen' WHERE muscle_group = 'core';
UPDATE public.exercises SET category = 'ombros' WHERE category = 'ombro';
UPDATE public.exercises SET category = 'abdomen' WHERE category = 'core';
UPDATE public.exercises SET category = muscle_group WHERE category IS NULL;

-- ============================================================
-- (2) Dedupe: reaponta itens pro keeper (mais antigo) e apaga resto
-- ============================================================
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY trainer_id, lower(name) ORDER BY created_at NULLS LAST, id) AS rn,
    FIRST_VALUE(id) OVER (PARTITION BY trainer_id, lower(name) ORDER BY created_at NULLS LAST, id) AS keeper
  FROM public.exercises
)
UPDATE public.workout_items wi
SET exercise_id = ranked.keeper
FROM ranked
WHERE wi.exercise_id = ranked.id AND ranked.rn > 1 AND ranked.keeper <> ranked.id;

WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY trainer_id, lower(name) ORDER BY created_at NULLS LAST, id) AS rn,
    FIRST_VALUE(id) OVER (PARTITION BY trainer_id, lower(name) ORDER BY created_at NULLS LAST, id) AS keeper
  FROM public.exercises
)
UPDATE public.workout_template_items wti
SET exercise_id = ranked.keeper
FROM ranked
WHERE wti.exercise_id = ranked.id AND ranked.rn > 1 AND ranked.keeper <> ranked.id;

WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY trainer_id, lower(name) ORDER BY created_at NULLS LAST, id) AS rn
  FROM public.exercises
)
DELETE FROM public.exercises e
USING ranked
WHERE e.id = ranked.id AND ranked.rn > 1
  AND NOT EXISTS (SELECT 1 FROM public.workout_items wi WHERE wi.exercise_id = e.id)
  AND NOT EXISTS (SELECT 1 FROM public.workout_template_items wti WHERE wti.exercise_id = e.id);

-- ============================================================
-- (3) Anti-duplicata futura
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS exercises_unique_name
  ON public.exercises (COALESCE(trainer_id, '00000000-0000-0000-0000-000000000000'), lower(name));

-- ============================================================
-- (4) Seed pack PT-BR (categoria = muscle_group, chips do picker)
-- ============================================================
INSERT INTO public.exercises (trainer_id, name, muscle_group, category, equipment, instructions, video_url, media_type)
VALUES
  -- Ombros
  (NULL, 'Desenvolvimento com halteres', 'ombros', 'ombros', 'dumbbell', 'Sentado, halteres na altura dos ombros, empurra pra cima sem travar o cotovelo.', NULL, NULL),
  (NULL, 'Elevação frontal', 'ombros', 'ombros', 'dumbbell', 'Em pé, sobe um halter de cada vez até a altura dos olhos, controla a descida.', NULL, NULL),
  (NULL, 'Crucifixo invertido', 'ombros', 'ombros', 'dumbbell', 'Inclinado à frente, abre os braços lateralmente focando posterior de ombro.', NULL, NULL),
  (NULL, 'Desenvolvimento Arnold', 'ombros', 'ombros', 'dumbbell', 'Gira as palmas durante a subida, de supinada embaixo a pronada em cima.', NULL, NULL),
  (NULL, 'Remada alta', 'ombros', 'ombros', 'barbell', 'Puxa a barra até o peito com cotovelos altos e abertos.', NULL, NULL),
  -- Trapézio
  (NULL, 'Encolhimento com barra', 'trapezio', 'trapezio', 'barbell', 'Em pé, sobe os ombros em direção às orelhas, segura 1s no topo.', NULL, NULL),
  -- Costas
  (NULL, 'Remada baixa', 'costas', 'costas', 'cable', 'Sentado, puxa o triângulo até o abdômen, escápulas juntas atrás.', NULL, NULL),
  (NULL, 'Barra fixa supinada', 'costas', 'costas', 'bodyweight', 'Pegada invertida, puxa até o peito tocar a barra.', NULL, NULL),
  (NULL, 'Pullover com halter', 'costas', 'costas', 'dumbbell', 'Deitado, desce o halter atrás da cabeça e traz de volta sobre o peito.', NULL, NULL),
  (NULL, 'Serrote na polia', 'costas', 'costas', 'cable', 'Unilateral, puxa como serra em direção ao quadril.', NULL, NULL),
  -- Peito
  (NULL, 'Supino declinado barra', 'peito', 'peito', 'barbell', 'Banco declinado, desce a barra na base do peito.', NULL, NULL),
  (NULL, 'Crucifixo inclinado', 'peito', 'peito', 'dumbbell', 'Banco a 30°, abre e fecha os braços sobre o peito superior.', NULL, NULL),
  (NULL, 'Cross over', 'peito', 'peito', 'cable', 'Polias altas, fecha as mãos na frente do corpo inclinando o tronco.', NULL, NULL),
  (NULL, 'Peck deck', 'peito', 'peito', 'machine', 'Costas apoiadas, fecha os braços até juntar as almofadas.', NULL, NULL),
  -- Quadríceps
  (NULL, 'Agachamento frontal', 'quadriceps', 'quadriceps', 'barbell', 'Barra à frente dos ombros, tronco ereto, desce até 90°.', NULL, NULL),
  (NULL, 'Afundo com halteres', 'quadriceps', 'quadriceps', 'dumbbell', 'Passo à frente, desce até os dois joelhos em 90°.', NULL, NULL),
  (NULL, 'Leg press horizontal', 'quadriceps', 'quadriceps', 'machine', 'Costas apoiadas, empurra sem travar os joelhos.', NULL, NULL),
  -- Posterior
  (NULL, 'Levantamento terra', 'posterior', 'posterior', 'barbell', 'Barra no chão, costas retas, estende quadril e joelhos juntos.', NULL, NULL),
  (NULL, 'Good morning', 'posterior', 'posterior', 'barbell', 'Barra nas costas, inclina o tronco à frente com joelhos semi-flexionados.', NULL, NULL),
  (NULL, 'Stiff unilateral', 'posterior', 'posterior', 'dumbbell', 'Apoiado numa perna, desce o halter com costas retas.', NULL, NULL),
  -- Glúteos
  (NULL, 'Hip thrust', 'gluteos', 'gluteos', 'barbell', 'Costas no banco, barra no quadril, sobe até alinhar tronco e coxas.', NULL, NULL),
  (NULL, 'Ponte de glúteo', 'gluteos', 'gluteos', 'bodyweight', 'Deitado, pés no chão, sobe o quadril contraindo o glúteo.', NULL, NULL),
  (NULL, 'Cadeira abdutora', 'gluteos', 'gluteos', 'machine', 'Sentado, abre as pernas contra a resistência.', NULL, NULL),
  (NULL, 'Glúteo na polia', 'gluteos', 'gluteos', 'cable', 'Caneleira presa, estende a perna pra trás contraindo o glúteo.', NULL, NULL),
  (NULL, 'Cadeira adutora', 'adutores', 'adutores', 'machine', 'Sentado, fecha as pernas contra a resistência.', NULL, NULL),
  -- Panturrilha
  (NULL, 'Panturrilha sentado', 'panturrilha', 'panturrilha', 'machine', 'Sentado, sobe na ponta dos pés com carga nos joelhos.', NULL, NULL),
  (NULL, 'Panturrilha no leg press', 'panturrilha', 'panturrilha', 'machine', 'Só a ponta dos pés na plataforma, empurra com a panturrilha.', NULL, NULL),
  -- Bíceps
  (NULL, 'Rosca martelo', 'biceps', 'biceps', 'dumbbell', 'Pegada neutra, sobe alternando sem balançar.', NULL, NULL),
  (NULL, 'Rosca concentrada', 'biceps', 'biceps', 'dumbbell', 'Sentado, cotovelo apoiado na coxa, sobe até o ombro.', NULL, NULL),
  (NULL, 'Rosca scott', 'biceps', 'biceps', 'barbell', 'Braços no banco scott, desce total e sobe sem impulso.', NULL, NULL),
  -- Tríceps
  (NULL, 'Tríceps corda', 'triceps', 'triceps', 'cable', 'Abre a corda no final da extensão, cotovelos fixos.', NULL, NULL),
  (NULL, 'Tríceps francês', 'triceps', 'triceps', 'dumbbell', 'Halter atrás da cabeça, estende os cotovelos pra cima.', NULL, NULL),
  (NULL, 'Mergulho no banco', 'triceps', 'triceps', 'bodyweight', 'Mãos no banco atrás, desce o corpo flexionando os cotovelos.', NULL, NULL),
  -- Abdômen
  (NULL, 'Prancha lateral', 'abdomen', 'abdomen', 'bodyweight', 'Apoio no antebraço e lateral do pé, quadril alto e alinhado.', NULL, NULL),
  (NULL, 'Crunch bicicleta', 'abdomen', 'abdomen', 'bodyweight', 'Alterna cotovelo com joelho oposto em movimento contínuo.', NULL, NULL),
  (NULL, 'Abdominal infra', 'abdomen', 'abdomen', 'bodyweight', 'Deitado, sobe as pernas dobradas tirando o quadril do chão.', NULL, NULL),
  -- Lombar
  (NULL, 'Hiperextensão lombar', 'lombar', 'lombar', 'bodyweight', 'No banco romano, desce o tronco e sobe até alinhar.', NULL, NULL),
  -- Corpo inteiro
  (NULL, 'Kettlebell swing', 'corpo_inteiro', 'corpo_inteiro', 'kettlebell', 'Empurra o quadril pra trás e projeta o kettlebell à frente com o quadril.', NULL, NULL),
  (NULL, 'Thruster', 'corpo_inteiro', 'corpo_inteiro', 'barbell', 'Agachamento frontal emendado com desenvolvimento.', NULL, NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- (5) Mensalidade no convite + primeira cobrança no aceite
-- ============================================================
ALTER TABLE public.student_invites
  ADD COLUMN IF NOT EXISTS monthly_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS first_due_date DATE;

-- Garante coluna usada pela primeira cobrança (0021 já adiciona; reforço idempotente)
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS description TEXT;

CREATE OR REPLACE FUNCTION public.accept_invite(
  invite_code TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_user_id UUID;
  v_existing_student RECORD;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_invite
  FROM public.student_invites
  WHERE code = invite_code
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_or_expired_or_used_invite');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    INSERT INTO public.profiles (id, role, full_name, phone)
    VALUES (
      v_user_id,
      'student'::user_role,
      COALESCE(v_invite.full_name, 'Aluno'),
      v_invite.phone
    )
    ON CONFLICT (id) DO UPDATE
      SET role = 'student'::user_role,
          full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
          phone = COALESCE(NULLIF(public.profiles.phone, ''), EXCLUDED.phone);
  ELSE
    UPDATE public.profiles
    SET role = 'student'::user_role,
        full_name = COALESCE(NULLIF(public.profiles.full_name, ''), v_invite.full_name),
        phone = COALESCE(NULLIF(public.profiles.phone, ''), v_invite.phone)
    WHERE id = v_user_id;
  END IF;

  INSERT INTO public.student_profiles (
    user_id, trainer_id, full_name, phone, goal, status, joined_at
  )
  VALUES (
    v_user_id, v_invite.trainer_id, v_invite.full_name,
    v_invite.phone, v_invite.goal, 'active', now()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET trainer_id = EXCLUDED.trainer_id,
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.student_profiles.full_name),
        phone = COALESCE(EXCLUDED.phone, public.student_profiles.phone),
        goal = COALESCE(EXCLUDED.goal, public.student_profiles.goal),
        status = 'active';

  UPDATE public.student_invites
  SET status = 'accepted',
      accepted_by = v_user_id,
      accepted_at = COALESCE(accepted_at, now())
  WHERE id = v_invite.id;

  -- Primeira cobrança (se o trainer definiu mensalidade no convite)
  IF v_invite.monthly_amount IS NOT NULL AND v_invite.monthly_amount > 0 THEN
    INSERT INTO public.payments (
      trainer_id, student_id, amount, status, due_date,
      gateway, billing_type, description
    )
    SELECT
      v_invite.trainer_id, v_user_id, v_invite.monthly_amount, 'pending',
      COALESCE(v_invite.first_due_date, (date_trunc('month', now()) + interval '1 month' + interval '4 days')::date),
      'pix_direto', 'PIX',
      'Mensalidade — ' || to_char(COALESCE(v_invite.first_due_date, now()), 'MM/YYYY')
    WHERE NOT EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.student_id = v_user_id AND p.status IN ('pending', 'overdue')
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'trainer_id', v_invite.trainer_id,
    'invite_id', v_invite.id,
    'student_id', v_user_id,
    'student_full_name', v_invite.full_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invite(TEXT, UUID) TO authenticated, service_role;
