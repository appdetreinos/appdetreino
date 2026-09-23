import { createClient } from "@/lib/supabase/server";
import { getTrainerScopeIds } from "@/lib/supabase/scope";
import { resolveExerciseMediaUrl } from "@/lib/exercise-images";
import { WorkoutForm } from "./workout-form";
import type {
  CatalogTemplate,
  CatalogTemplateType,
  CatalogExercise,
} from "./template-catalog-picker";

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
    .in("trainer_id", await getTrainerScopeIds(supabase, user.id))
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

  // Catálogo de templates: hierárquico (Tipo > Grupo > Exercícios).
  // Migration 0032 (template_type + workout_template_groups).
  // Tenta query completa; se coluna template_type não existir (0032 não aplicada),
  // cai num fallback sem template_type (mostra só os 4 legados via /templates).
  type RawTemplateItem = {
    position: number;
    sets: number;
    reps: string;
    load: string | null;
    exercises: RawExercise | RawExercise[] | null;
  };
  type RawTemplate = {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    template_type: string | null;
    estimated_minutes: number | null;
    workout_template_groups: Array<{ group_slug: string }> | null;
    workout_template_items: RawTemplateItem[] | null;
  };

  let templatesRaw: RawTemplate[] = [];
  let templatesError: unknown = null;

  if (!exerciseError) {
    // Só tenta o catálogo se a query principal de exercises funcionou
    // (exercises é a tabela de JOIN). Se 0031 não foi aplicada, items
    // podem ter colunas extras que quebram.
    const fullTemplatesQuery = await supabase
      .from("workout_templates")
      .select(`
        id, slug, title, description, template_type, estimated_minutes,
        workout_template_groups(group_slug),
        workout_template_items(
          position, sets, reps, load,
          exercises:exercise_id(id, name, muscle_group, equipment, image_url, animation_url, media_type)
        )
      `)
      .or(`is_global.eq.true,created_by.eq.${user.id}`)
      .order("template_type", { ascending: true })
      .order("title", { ascending: true });

    templatesRaw = (fullTemplatesQuery.data ?? []) as unknown as RawTemplate[];
    templatesError = fullTemplatesQuery.error;

    // Fallback se template_type não existir (0032 não aplicada)
    if (templatesError && /column .* does not exist/i.test(String((templatesError as { message?: string }).message ?? ""))) {
      const fallbackTemplates = await supabase
        .from("workout_templates")
        .select(`
          id, slug, title, description, estimated_minutes,
          workout_template_groups(group_slug),
          workout_template_items(
            position, sets, reps, load,
            exercises:exercise_id(id, name, muscle_group, equipment, image_url, animation_url, media_type)
          )
        `)
        .or(`is_global.eq.true,created_by.eq.${user.id}`)
        .order("title", { ascending: true });
      templatesRaw = (fallbackTemplates.data ?? []) as unknown as RawTemplate[];
      templatesError = fallbackTemplates.error;
    }
  }

  if (templatesError) {
    // eslint-disable-next-line no-console
    console.error("[new-workout] templates select error", templatesError);
  }

  const templateCatalog: CatalogTemplate[] = (templatesRaw ?? []).map((t) => {
    const groups = ((t.workout_template_groups ?? []) as Array<{
      group_slug: string;
    }>)
      .map((g) => g.group_slug)
      .sort();

    const exercises: CatalogExercise[] = ((t.workout_template_items ?? []) as RawTemplateItem[])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((it) => {
        const e = Array.isArray(it.exercises) ? it.exercises[0] : it.exercises;
        return {
          exercise_id: e?.id ?? "",
          name: e?.name ?? "—",
          muscle_group: e?.muscle_group ?? null,
          equipment: e?.equipment ?? null,
          image_url: e?.image_url ?? null,
          animation_url: e?.animation_url ?? null,
          position: it.position,
          sets: it.sets,
          reps: it.reps,
          load: it.load ?? null,
        };
      });

    return {
      id: t.id,
      slug: t.slug,
      title: t.title,
      description: t.description,
      // Default "full_body" pra templates legados que não têm template_type
      template_type: ((t.template_type ?? "full_body") as CatalogTemplateType),
      estimated_minutes: t.estimated_minutes,
      groups,
      exercises,
    };
  });

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

  // Garante que mídias dos templates também têm URL resolvida
  // (alguns exercícios do template podem não ter vindo no exercisesRaw
  // se forem trainer-scoped de outro trainer — improvável mas defensivo)
  for (const t of templateCatalog) {
    for (const ex of t.exercises) {
      if (ex.exercise_id && resolvedUrls[ex.exercise_id] === undefined) {
        resolvedUrls[ex.exercise_id] = resolveExerciseMediaUrl(
          ex.image_url,
          ex.name,
        );
      }
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
      templateCatalog={templateCatalog}
    />
  );
}
