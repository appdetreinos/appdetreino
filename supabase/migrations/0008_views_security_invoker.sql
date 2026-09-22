-- 0008_views_security_invoker.sql
-- Define `security_invoker = true` em views que filtram PII (RLS do usuário).

DROP VIEW IF EXISTS public.student_invites_safe;
CREATE VIEW public.student_invites_safe
  WITH (security_invoker = true) AS
SELECT
  si.id,
  si.trainer_id,
  si.code,
  si.status,
  si.accepted_at,
  si.accepted_by,
  si.created_at
FROM public.student_invites si;

DROP VIEW IF EXISTS public.trainer_settings_safe;
CREATE VIEW public.trainer_settings_safe
  WITH (security_invoker = true) AS
SELECT
  ts.user_id,
  ts.pix_key_type,
  ts.pix_beneficiary_name,
  ts.default_charge_message,
  ts.default_overdue_message,
  ts.updated_at,
  ts.onboarding_completed_at,
  -- pix_key liberado só via SECURITY DEFINER ou função dedicada; aqui fica null.
  NULL::text AS pix_key_masked
FROM public.trainer_settings ts;

GRANT SELECT ON public.student_invites_safe TO authenticated;
GRANT SELECT ON public.trainer_settings_safe TO authenticated;
