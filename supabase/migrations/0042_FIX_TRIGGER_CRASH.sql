-- Migration 0042_FIX_TRIGGER_CRASH.sql
-- RESOLUÇÃO: Remove o trigger que está causando erro de null value no trainer_id

-- 1. Removemos o trigger problemático que tenta criar student_profiles automaticamente sem trainer_id
DROP TRIGGER IF EXISTS on_auth_user_created ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_new_profile();

-- 2. Agora criamos os perfis de forma segura (sem disparar o trigger quebrado)
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

-- 3. Vinculamos esses alunos ao treinador correto
INSERT INTO public.student_profiles (user_id, trainer_id, status, full_name)
SELECT 
    si.accepted_by, 
    '4f30f9c8-3f46-4e1e-88ce-0598941d6528', 
    'active', 
    si.full_// a la l'ancien code, on a:
    si.full_name
FROM public.student_invites si
WHERE si.status = 'accepted' 
AND si.accepted_by IS NOT NULL
ON CONFLICT (user_id) DO UPDATE 
SET trainer_id = '4f30f9c8-3f46-4e1e-88ce-0598941d6528', 
    status = 'active';
