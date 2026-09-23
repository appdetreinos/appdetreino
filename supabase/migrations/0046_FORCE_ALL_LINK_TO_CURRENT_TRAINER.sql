-- Migration 0046_FORCE_ALL_LINK_TO_CURRENT_TRAINER.sql
-- RESOLUÇÃO ABSOLUTA: Força a vinculação de TODOS os alunos ao perfil principal do Nicolas

-- 1. Vincula TODOS os alunos de TODOS os treinadores para o perfil principal
-- Isso resolve o problema de alunos vinculados a IDs de perfis duplicados ou errados
UPDATE public.student_profiles
SET trainer_id = '4f30f9c8-3f46-4e1e-88ce-0598941d6528'
WHERE trainer_id IS NOT NULL;

-- 2. Sincroniza convites aceitos que podem ter ficado para trás
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

-- 3. Força a limpeza de qualquer registro sem trainer
DELETE FROM public.student_profiles WHERE trainer_id IS NULL;
