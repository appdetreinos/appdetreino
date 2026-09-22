-- Migration 0027 — Backfill ULTRA robusto + diagnóstico
--
-- Resolve casos onde:
--  (A) student_invites.status='accepted' mas accepted_by IS NULL
--      (aceitação falhou parcialmente — usuário criado, invite ficou aceito
--      sem amarrar quem aceitou). Vamos casar pelo email: o email do convite
--      é o email de quem aceitou.
--  (B) student_profiles sem trainer_id (criado pelo trigger handle_new_profile
--      mas sem vínculo porque accept_invite falhou). Vamos re-vincular usando
--      o invite aceito mais recente daquele user.
--  (C) Backfill por email: pra cada invite com accepted_by IS NULL mas com
--      status='accepted', procuramos o auth.users pelo email e preenchemos.
--
-- Idempotente.

-- ============================================================
-- A. Cria coluna auxiliar pra casar invite → user via email
--    (vamos popular temporariamente com o email do convite se houver)
-- ============================================================

-- Adiciona coluna email em student_invites se ainda não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'student_invites' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.student_invites ADD COLUMN email TEXT;
  END IF;
END $$;

-- ============================================================
-- B. BACKFILL por email: tenta descobrir quem aceitou cada invite 'accepted'
--    sem accepted_by
-- ============================================================

UPDATE public.student_invites si
SET accepted_by = (
  SELECT id FROM auth.users
  WHERE email = si.email
  ORDER BY created_at DESC
  LIMIT 1
)
WHERE si.status = 'accepted'
  AND si.accepted_by IS NULL
  AND si.email IS NOT NULL;

-- ============================================================
-- C. Cria student_profiles pra todo invite aceito com accepted_by conhecido
--    mas sem student_profile correspondente
-- ============================================================

INSERT INTO public.student_profiles (
  user_id, trainer_id, full_name, phone, goal, status, joined_at
)
SELECT
  si.accepted_by,
  si.trainer_id,
  si.full_name,
  si.phone,
  si.goal,
  'active',
  COALESCE(si.accepted_at, now())
FROM public.student_invites si
LEFT JOIN public.student_profiles sp ON sp.user_id = si.accepted_by
WHERE si.status = 'accepted'
  AND si.accepted_by IS NOT NULL
  AND sp.user_id IS NULL
ON CONFLICT (user_id) DO UPDATE
  SET trainer_id = EXCLUDED.trainer_id,
      full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.student_profiles.full_name),
      phone = COALESCE(EXCLUDED.phone, public.student_profiles.phone),
      goal = COALESCE(EXCLUDED.goal, public.student_profiles.goal),
      status = 'active';

-- ============================================================
-- D. Atualiza profiles.role='student' pra quem aceitou invite
-- ============================================================

UPDATE public.profiles p
SET role = 'student'::user_role
FROM public.student_invites si
WHERE si.accepted_by = p.id
  AND si.status = 'accepted'
  AND p.role <> 'student'::user_role;

-- ============================================================
-- E. Re-vincula trainer_id se ficou NULL (caso accept_invite tenha criado
--    student_profile sem trainer_id por causa de race condition no FK)
-- ============================================================

UPDATE public.student_profiles sp
SET trainer_id = (
  SELECT si.trainer_id FROM public.student_invites si
  WHERE si.accepted_by = sp.user_id AND si.status = 'accepted'
  ORDER BY si.accepted_at DESC NULLS LAST
  LIMIT 1
)
WHERE sp.trainer_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.student_invites si
    WHERE si.accepted_by = sp.user_id AND si.status = 'accepted'
  );

-- ============================================================
-- F. View de diagnóstico — pra ver de relance se tem invites quebrados
-- ============================================================

CREATE OR REPLACE VIEW public.diagnostic_invites AS
SELECT
  si.id,
  si.code,
  si.full_name AS invite_name,
  si.email AS invite_email,
  si.status,
  si.accepted_by,
  au.email AS accepted_by_email,
  si.trainer_id,
  au_trainer.email AS trainer_email,
  sp.user_id AS student_profile_user_id,
  sp.trainer_id AS student_profile_trainer_id
FROM public.student_invites si
LEFT JOIN auth.users au ON au.id = si.accepted_by
LEFT JOIN auth.users au_trainer ON au_trainer.id = si.trainer_id
LEFT JOIN public.student_profiles sp ON sp.user_id = si.accepted_by;

GRANT SELECT ON public.diagnostic_invites TO authenticated, service_role;
