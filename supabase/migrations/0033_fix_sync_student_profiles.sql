-- Migration 0033_fix_sync_student_profiles.sql
-- Este script resolve o problema de alunos que aceitaram o convite (na student_invites)
-- mas não foram corretamente vinculados na student_profiles.

-- 1. Sincronização Forçada: Alunos que aceitaram convite mas não estão no perfil de estudante
INSERT INTO public.student_profiles (user_id, trainer_id, invite_code, status, full_name)
SELECT 
    si.accepted_by as user_id, 
    si.trainer_id, 
    si.code as invite_code, 
    'active', 
    si.full_name
FROM public.student_invites si
JOIN public.profiles p ON si.accepted_by = p.id
WHERE si.status = 'accepted' 
AND si.accepted_by IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.student_profiles sp 
    WHERE sp.user_id = si.accepted_by AND sp.trainer_id = si.trainer_id
);

-- 2. Correção de Orphaned Students: Se o aluno existe no perfil mas o convite está 'pending'
UPDATE public.student_invites
SET status = 'accepted',
    accepted_at = now()
WHERE status = 'pending' 
AND EXISTS (
    SELECT 1 FROM public.student_profiles sp 
    WHERE sp.trainer_id = student_invites.trainer_id 
    AND sp.invite_code = student_invites.code
);

-- 3. Limpeza de Duplicatas ( Segurança )
DELETE FROM public.student_profiles
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, trainer_id ORDER BY created_at DESC) as row_num
        FROM public.student_profiles
    ) t WHERE t.row_num > 1
);
