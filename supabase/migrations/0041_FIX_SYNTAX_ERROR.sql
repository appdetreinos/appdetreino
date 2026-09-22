-- Migration 0041_FIX_SYNTAX_ERROR.sql
-- CORREÇÃO DE SINTAXE: Removemos todos os comentários residuais para evitar erro no SQL

-- 1. Cria perfis para alunos que aceitaram convites mas não existem na tabela profiles
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

-- 2. Vincula todos os alunos aceitos ao treinador correto
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
SET trainer_id = '4f30f9c8-3f46-4e1e-88ce-0598941d6528', 
    status = 'active';

-- 3. Limpeza de segurança
DELETE FROM public.student_profiles
WHERE user_id NOT IN (SELECT id FROM public.profiles);
