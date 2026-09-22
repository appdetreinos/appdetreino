-- Migration 0034_fix_sync_student_profiles_no_id.sql
-- Este script resolve a sincronização de alunos sem usar a coluna "id" (que é a PK user_id)

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

-- 2. Correção de Orphaned Students
UPDATE public.student_invites
SET status = 'accepted',
    accepted_at = now()
WHERE status = 'pending' 
AND EXISTS (
    SELECT 1 FROM public.student_profiles sp 
    WHERE sp.trainer_id = student_invites.trainer_id 
    AND sp.invite_code = student_invites.code
);

-- 3. Limpeza de Duplicatas usando user_id como referência
-- Como a PK é user_id, não podemos ter duplicatas de user_id, mas podemos ter 
-- o mesmo user_id com treinadores diferentes em casos raros. 
-- Esta query limpa duplicatas exatas de user_id + trainer_id.
DELETE FROM public.student_profiles sp1
USING public.student_profiles sp2
WHERE sp1.user_id = sp2.user_id 
  AND sp1.trainer_id = sp2.trainer_id 
  AND sp1.created_at < sp2.created_at;
