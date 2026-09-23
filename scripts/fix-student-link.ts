import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function run() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  console.log('--- Diagnosticando Vínculos ---')

  // 1. Buscar perfis (removido 'email' que não existe na tabela profiles)
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, full_name')

  if (profErr) {
    console.error('Erro ao buscar perfis:', profErr)
    return
  }

  console.log('Perfis encontrados:', profiles?.length)

  // 2. Achar o aluno "teste"
  const student = profiles?.find(p => p.full_name?.toLowerCase().includes('teste'))
  if (!student) {
    console.error('Aluno "teste" não encontrado na tabela profiles.')
    return
  }
  console.log(`Aluno encontrado: ${student.full_name} (ID: ${student.id})`)

  // 3. Buscar student_profile
  const { data: sProfile, error: spErr } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('user_id', student.id)
    .single()

  if (spErr || !sProfile) {
    console.error('Perfil de estudante não encontrado para este usuário:', spErr)
    return
  }
  console.log(`Trainer ID atual do aluno: ${sProfile.trainer_id}`)

  // 4. Achar o treinador
  // Buscamos quem tem role 'trainer'
  const { data: trainerProfile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'trainer')
    .limit(1)
    .single()

  if (!trainerProfile) {
    console.error('Nenhum treinador com role "trainer" encontrado.')
    return
  }

  const targetTrainerId = trainerProfile.id
  console.log(`Vinculando aluno ao treinador: ${trainerProfile.full_name} (ID: ${targetTrainerId})`)

  const { error: updateErr } = await supabase
    .from('student_profiles')
    .update({ trainer_id: targetTrainerId })
    .eq('user_id', student.id)

  if (updateErr) {
    console.error('Erro ao atualizar vínculo:', updateErr)
  } else {
    console.log('✅ Sucesso! Aluno agora vinculado ao treinador. O 404 deve sumir.')
  }
}

run().catch(console.error)
