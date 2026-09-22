-- Migration 0040_FINAL_FIX_ORPHAN_PROFILES.sql
-- CORREÇÃO FINAL: Resolve o erro de Foreign Key (aluno sem perfil na tabela profiles)

-- 1. Identificamos usuários que aceitaram convites mas não têm entrada na tabela profiles.
-- Para esses casos, criamos o perfil básico para que a vinculação do aluno funcione.
INSERT INTO public.profiles (id, full_name, role)
SELECT 
    si.accepted_by, 
    si.full_name, 
    'student'
FROM public.student_invites si
WHERE si.status = 'accepted' 
AND si.accepted_by IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = si.accepted_by
);

-- 2. Agora que todos os alunos têm um profile, vinculamos eles ao treinador correto
INSERT INTO public.student_profiles (user_id, trainer_id, status, full_name)
SELECT 
    si.accepted_// a la l'ancien code, on a:
    si.accepted_by, 
    '4f30f9c8-3f46-4e1e-88ce-0598941d6528', 
    'active', 
    si.full_name
FROM public.student_invites si
WHERE si.status = 'accepted' 
AND si.accepted_by IS NOT NULL
ON CONFLICT (user_id) DO UPDATE 
SET trainer_id = '4f30f9c8-3f46-4e1e-88ce-0598941d6528', 
    status = 'active';

-- 3. Garante que a tabela student_profiles não tem lixo
DELETE FROM public.student_profiles
WHERE user_id NOT IN (SELECT id FROM public.profiles);
