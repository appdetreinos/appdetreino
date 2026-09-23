import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function run() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  console.log('--- Ativando Aluno Teste ---')

  // 1. Achar o aluno "teste"
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .ilike('full_name', '%teste%')
    .single()

  if (!profile) {
    console.error('Aluno "teste" não encontrado.')
    return
  }

  // 2. Forçar status 'active' no student_profiles
  const { data: sProfile, error: spErr } = await supabase
    .from('student_profiles')
    .select('status')
    .eq('user_id', profile.id)
    .single()

  if (spErr) {
    console.error('Erro ao buscar student_profile:', spErr)
    return
  }

  console.log(`Status atual: ${sProfile.status}`)

  const { error: updateErr } = await supabase
    .from('student_profiles')
    .update({ status: 'active' })
    .eq('user_id', profile.id)

  if (updateErr) {
    console.error('Erro ao ativar aluno:', updateErr)
  } else {
    console.log('✅ Aluno ativado com sucesso!')
  }

  // 3. Verificar se existe convite pendente para ele e marcar como aceito/processado
  // (Para sumir da lista de "Convites Pendentes" se o sistema filtrar por status)
  const { error: inviteErr } = await supabase
    .from('student_invites')
    .update({ status: 'accepted' })
    .eq('accepted_by', profile.id)

  if (inviteErr) {
    console.error('Erro ao atualizar convite:', inviteErr)
  } else {
    console.log('✅ Convite sincronizado como aceito.')
  }
}

run().catch(console.error)
