-- Migration 0036_FINAL_CLEANUP
-- RESOLUÇÃO DEFINITIVA: Remove duplicatas e vincula alunos

-- 1. Removemos o perfil duplicado (Mantemos o mais antigo)
DELETE FROM public.profiles
WHERE id = '63816edd-1021-49c3-8dd3-ee3120560ccb';

-- 2. Vincula todos os alunos aceitos ao perfil correto (4f30f9c8-3f46-4e1e-88ce-0598941d6528)
INSERT INTO public.student_profiles (user_id, trainer_id, status, full_name)
SELECT 
    p.id as user_id, 
    '4f30f9c8-3f46-4e1e-88ce-0598941d6528' as trainer_id, 
    'active', 
    p.full_name
FROM public.profiles p
JOIN public.student_invites si ON p.email = si.email -- Assumindo que email está nos perfis ou convites
WHERE si.status = 'accepted' 
AND p.role = 'student'
ON CONFLICT (user_id) DO UPDATE 
SET trainer_id = '4f30f9c8-3f46-4e1e-88ce-0598941d6528', status = 'active';

-- 3. Se a tabela de convites não tem email, usamos o accepted_by
INSERT INTO public.student_profiles (user_id, trainer_id, status, full_name)
SELECT 
    si.accepted_by, 
    '4f30f9c8-3f46-4e1e-88ce-0598941d6528', 
    'active', 
    si.full_name
FROM public.student_invites si
WHERE si.status = 'accepted' 
AND si.accepted_by IS NOT NULL
ON CONFLICT (user_id) DO UPDATE 
SET trainer_id = '4f30f9c8-3f46-4e1e-88ce-0598941d6528', status = 'active';

-- 4. Garante a limpeza de qualquer outra duplicata
DELETE FROM public.student_profiles
WHERE user_id NOT IN (SELECT id FROM public.profiles);
