import { createClient } from "@/lib/supabase/server";
import { resolveExerciseMediaUrl } from "@/lib/exercise-images";
import { WorkoutForm } from "./workout-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  // Tenta selecionar com as colunas novas (migration 0031). Se alguma
  // ainda não estiver no schema remoto, cai num fallback mínimo.
  const fullSelect =
    "id, name, muscle_group, equipment, image_url, animation_url, media_type, category, aliases";
  const fallbackSelect = "id, name, muscle_group, equipment";

  const fullQuery = await supabase
    .from("exercises")
    .select(fullSelect)
    .or(`trainer_id.is.null,trainer_id.eq.${user.id}`)
    .order("muscle_group", { ascending: true })
    .order("name", { ascending: true })
    .limit(500);

  type RawExercise = {
    id: string;
    name: string;
    muscle_group: string | null;
    equipment: string | null;
    image_url?: string | null;
    animation_url?: string | null;
    media_type?: string | null;
    category?: string | null;
    aliases?: string[] | null;
  };

  let exercisesRaw: RawExercise[] = (fullQuery.data ?? []) as RawExercise[];
  let exerciseError: unknown = fullQuery.error;

  if (exerciseError && /column .* does not exist/i.test(String((exerciseError as { message?: string }).message ?? ""))) {
    // Migração 0031 ainda não foi aplicada neste projeto.
    const fallback = await supabase
      .from("exercises")
      .select(fallbackSelect)
      .or(`trainer_id.is.null,trainer_id.eq.${user.id}`)
      .order("muscle_group", { ascending: true })
      .order("name", { ascending: true })
      .limit(500);
    exercisesRaw = (fallback.data ?? []) as RawExercise[];
    exerciseError = fallback.error;
  }

  if (exerciseError) {
    // eslint-disable-next-line no-console
    console.error("[new-workout] exercises select error", exerciseError);
  }

  // Resolve URLs no server: pega image_url OU cai no mapa Wikimedia/silhueta.
  // Cachear por id (mesma URL pode aparecer em N exercícios).
  const resolvedUrls: Record<string, string | null> = {};
  for (const ex of exercisesRaw) {
    if (!resolvedUrls[ex.id]) {
      resolvedUrls[ex.id] = resolveExerciseMediaUrl(
        ex.image_url ?? null,
        ex.name,
      );
    }
  }

  return (
    <WorkoutForm
      students={(students ?? []).map((s) => ({
        id: s.user_id,
        full_name: s.full_name,
      }))}
      exercises={exercisesRaw.map((e) => ({
        id: e.id,
        name: e.name,
        muscle_group: e.muscle_group ?? null,
        equipment: e.equipment ?? null,
        image_url: e.image_url ?? null,
        animation_url: e.animation_url ?? null,
        category: e.category ?? null,
        aliases: e.aliases ?? null,
      }))}
      resolvedUrls={resolvedUrls}
    />
  );
}
