-- Migration 0038_FIX_FINAL_STUDENT_VINCULATION.sql
-- RESOLUÇÃO ABSOLUTA: Corrigindo o vínculo de alunos com a conta correta do treinador

-- 1. Limpeza de perfis duplicados (Novamente, para garantir)
-- Mantemos apenas o perfil 4f30f9c8-3f46-4e1e-88ce-0598941d6528
DELETE FROM public.profiles
WHERE id = '63816edd-1021-49c3-8dd3-ee3120560ccb';

-- 2. CORREÇÃO DO VÍNCULO: 
-- O aluno 'fae93e4b...' aceitou o convite do perfil deletado (63816edd...).
-- Vamos mover esse aluno e todos os outros para o perfil correto (4f30f9c8...).
UPDATE public.student_profiles
SET trainer_id = '4f30f9c8-3f46-4e1e-88ce-0598941d6528'
WHERE trainer_id = '63816edd-1021-49c3-8dd3-ee3120560ccb';

-- 3. Sincronização de convites aceitos que ainda não viraram student_profiles
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

-- 4. Limpeza de órfãos
DELETE FROM public.student_profiles
WHERE trainer_id NOT IN (SELECT id FROM public.profiles);
