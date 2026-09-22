-- Migration 0017 — Lookup público de convite (sem expor PII)
--
-- Idempotente.
--
-- Problema: a policy `invites_authenticated_read` (0006) só permite
-- SELECT pra usuários autenticados. A página pública `/invite/[code]`
-- é Server Component e roda sem JWT — então a query RLS retorna NULL
-- e mostra "Convite não encontrado" mesmo com código válido.
--
-- Fix: permite SELECT público apenas na VIEW `student_invites_safe`
-- (que já existe em 0006 e mascara o phone). Ninguém consegue ver
-- o convite completo via API pública — só os campos públicos.
--
-- Isso destrava o fluxo: o user clica no link do WhatsApp
-- (sem estar logado) → /invite/CODE consegue renderizar a tela
-- "Aceitar e entrar" → redireciona pro /register?role=student.

GRANT SELECT ON public.student_invites_safe TO anon, authenticated;

-- Comentário pra DX
COMMENT ON VIEW public.student_invites_safe IS
  'View pública de convites pendentes — mascara phone. Usado pela página /invite/[code].';
