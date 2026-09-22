-- Migration 0037_FINAL_FIX_NO_EMAIL.sql
-- RESOLUÇÃO FINAL: Vincula alunos usando apenas a coluna accepted_by (UUID)

-- 1. Removemos o perfil duplicado definitivamente
DELETE FROM public.profiles
WHERE id = '63816edd-1021-49c3-8dd3-ee3120560ccb';

-- 2. Vincula alunos usando accepted_by (UUID) que é a coluna correta
-- Isso evita o erro de "column p.email does not exist"
INSERT INTO public.student_profiles (user_id, trainer_id, status, full_name)
SELECT 
    si.accepted_by as user_id, 
    '4f30f9c8-3f46-4e1e-88ce-0598941d6528' as trainer_id, 
    'active', 
    si.full_name
FROM public.student_invites si
WHERE si.status = 'accepted' 
AND si.accepted_by IS NOT NULL
ON CONFLICT (user_id) DO UPDATE 
SET trainer_id = '4f30f9c8-3f46-4e1e-88ce-0598941d6528', 
    status = 'active';

-- 3. Garante que não há perfis de alunos órfãos
DELETE FROM public.student_profiles
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- 4. Força atualização de estatísticas do banco
ANALYZE public.student_profiles;
ANALYZE public.profiles;
