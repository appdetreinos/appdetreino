-- Migration 0039_FINAL_REPAIR_STUDENTS.sql
-- CORREÇÃO FINAL: Vincula alunos aceitos ao perfil correto e cria os profiles faltantes

-- 1. Move todos os convites aceitos para o perfil principal do Nicolas
-- Isso corrige o erro de o aluno estar vinculado ao ID duplicado
UPDATE public.student_invites
SET trainer_id = '4f30f9c8-3f46-4e1e-88ce-0598941d6528'
WHERE status = 'accepted';

-- 2. Cria os perfis de estudantes para todos os convites aceitos
-- Isso resolve o problema da tabela student_profiles estar vazia
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

-- 3. Limpeza de segurança
DELETE FROM public.student_profiles
WHERE user_id NOT IN (SELECT id FROM public.profiles);
