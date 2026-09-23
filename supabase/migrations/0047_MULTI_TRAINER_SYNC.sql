-- Migration 0047_MULTI_TRAINER_SYNC.sql
-- RESOLUÇÃO FINAL: Sincronização dinâmica de alunos para múltiplos treinadores

-- 1. Garante que todos os alunos que aceitaram convites tenham um perfil na tabela profiles
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

-- 2. Vincula cada aluno ao seu respectivo treinador (baseado no convite que ele aceitou)
-- Isso funciona para QUALQUER treinador (Nicolas, Priscila, etc.)
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
