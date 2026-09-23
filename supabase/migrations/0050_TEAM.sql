-- Migration 0050_TEAM.sql
-- Multi-colaborador (plano Top): staff opera a consultoria do owner.
-- ESTRATÉGIA ADITIVA: só ADICIONA policies permissivas — nunca remove
-- as existentes. Zero risco de quebrar o acesso atual.
-- IDEMPOTENTE.

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff',
  status TEXT NOT NULL DEFAULT 'accepted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, member_id),
  CHECK (owner_id <> member_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_owner_manage" ON public.team_members;
CREATE POLICY "team_owner_manage" ON public.team_members
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "team_member_read_self" ON public.team_members;
CREATE POLICY "team_member_read_self" ON public.team_members
  FOR SELECT TO authenticated
  USING (member_id = auth.uid());

-- Helper: uid pode operar dados do owner? (é o próprio ou staff aceito)
CREATE OR REPLACE FUNCTION public.trainer_scope_has_access(owner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.team_members t
      WHERE t.owner_id = trainer_scope_has_access.owner_id
        AND t.member_id = auth.uid()
        AND t.status = 'accepted'
    );
$$;

-- Escopo: onde o membro enxerga/opera (SELECT + ALL aditivos)
-- Tabelas com trainer_id direto
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'student_profiles','workouts','diets','payments','payment_links',
    'appointments','appointment_types','habits','wods','challenges',
    'community_posts','anamnesis','anamnesis_templates','payment_templates',
    'trainer_availability','evolution_instances'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_team_scope_all ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_team_scope_all ON public.%I FOR ALL TO authenticated USING (public.trainer_scope_has_access(trainer_id)) WITH CHECK (public.trainer_scope_has_access(trainer_id))',
      t, t);
  END LOOP;
END $$;

-- Measurements: via vínculo do aluno
DROP POLICY IF EXISTS measurements_team_scope_all ON public.measurements;
CREATE POLICY measurements_team_scope_all ON public.measurements
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.student_profiles sp
    WHERE sp.user_id = measurements.student_id
      AND public.trainer_scope_has_access(sp.trainer_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.student_profiles sp
    WHERE sp.user_id = measurements.student_id
      AND public.trainer_scope_has_access(sp.trainer_id)
  ));

-- Convites: owner + staff gerenciam
DROP POLICY IF EXISTS student_invites_team_scope_all ON public.student_invites;
CREATE POLICY student_invites_team_scope_all ON public.student_invites
  FOR ALL TO authenticated
  USING (public.trainer_scope_has_access(trainer_id))
  WITH CHECK (public.trainer_scope_has_access(trainer_id));

-- Helper de app: de quem esse uid pode ver dados? (próprio + owners onde é staff)
CREATE OR REPLACE FUNCTION public.trainer_scope_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT auth.uid()
  UNION
  SELECT t.owner_id FROM public.team_members t
  WHERE t.member_id = auth.uid() AND t.status = 'accepted';
$$;
