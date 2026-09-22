import { createClient } from "@/lib/supabase/server";
import { WorkoutForm } from "./workout-form";

export default async function NewWorkoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Lista de alunos do trainer (pra atribuir o treino, opcional)
  const { data: students } = await supabase
    .from("student_profiles")
    .select("user_id, full_name")
    .eq("trainer_id", user.id)
    .eq("status", "active")
    .order("full_name", { ascending: true });

  // Biblioteca de exercícios: globais (trainer_id IS NULL) + do próprio trainer
  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name, muscle_group, equipment")
    .or(`trainer_id.is.null,trainer_id.eq.${user.id}`)
    .order("muscle_group", { ascending: true })
    .order("name", { ascending: true })
    .limit(500);

  return (
    <WorkoutForm
      students={(students ?? []).map((s) => ({
        id: s.user_id,
        full_name: s.full_name,
      }))}
      exercises={(exercises ?? []).map((e) => ({
        id: e.id,
        name: e.name,
        muscle_group: e.muscle_group,
        equipment: e.equipment,
      }))}
    />
  );
}
