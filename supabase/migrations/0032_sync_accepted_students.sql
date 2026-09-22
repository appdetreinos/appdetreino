-- Migration 0032 — SINCRONIZAÇÃO FORÇADA DE ALUNOS
-- Este script resolve o problema de alunos que aceitaram o convite mas não aparecem no Dashboard

-- 1. Identifica alunos que aceitaram o convite mas não têm perfil de estudante vinculado ao treinador
-- E insere eles na student_profiles
INSERT INTO public.student_profiles (user_id, trainer_id, full_name, status, created_at)
SELECT 
    p.id as user_id, 
    inv.trainer_id, 
    p.full_name, 
    'active', 
    now()
FROM public.invitations inv
JOIN public.profiles p ON inv.email = p.email
WHERE inv.status = 'accepted' 
AND NOT EXISTS (
    SELECT 1 FROM public.student_profiles sp 
    WHERE sp.user_id = p.id AND sp.trainer_id = inv.trainer_id
);

-- 2. Garante que não existam duplicatas (caso tenha havido erro de insert anterior)
-- Mantemos apenas o registro mais recente
DELETE FROM public.student_profiles
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, trainer_id ORDER BY created_at DESC) as row_num
        FROM public.student_profiles
    ) t WHERE t.row_num > 1
);

-- 3. Atualiza o status de qualquer aluno que esteja 'pending' mas já tenha perfil
UPDATE public.invitations
SET status = 'accepted'
WHERE status = 'pending' 
AND EXISTS (
    SELECT 1 FROM public.student_profiles sp 
    WHERE sp.trainer_id = invitations.trainer_id 
    AND sp.user_id = (SELECT id FROM public.profiles WHERE email = invitations.email LIMIT 1)
);
