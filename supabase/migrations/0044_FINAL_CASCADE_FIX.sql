-- Migration 0044_FINAL_CASCADE_FIX.sql
-- RESOLUÇÃO: Remove a função problemática e vincula os alunos corretamente

-- 1. Removemos a função e todos os triggers dependentes de uma vez só
DROP FUNCTION IF EXISTS public.handle_new_profile() CASCADE;

-- 2. Criamos os perfis de alunos que aceitaram convites mas não existem na tabela profiles
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

-- 3. Vinculamos todos os alunos aceitos ao treinador correto
INSERT INTO public.student_profiles (user_id, trainer_id, status, full_name)
SELECT 
    si.accepted_by, 
    si.trainer_id, 
    'active', 
    si.full_name
FROM public.student_invites si
WHERE si.status = 'accepted' 
AND si.accepted_by IS NOT NULL
ON CONFLICT (user_id) DO UPDATE 
SET trainer_id = EXCLUDED.trainer_id, 
    status = 'active';
