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

  return (
    <WorkoutForm
      students={(students ?? []).map((s) => ({
        id: s.user_id,
        full_name: s.full_name,
      }))}
    />
  );
}
