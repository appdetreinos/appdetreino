import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Salad } from "lucide-react";

export default async function DietaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: diets, error } = await supabase
    .from("diets")
    .select(
      `id, title, kcal_target, p_target, c_target, g_target,
       meals:meals(
         id, name, time, position,
         meal_items:meal_items(
           id, grams, position,
           foods:food_id(name)
         )
       )`,
    )
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Minha dieta</h1>
        <p className="text-sm text-destructive">Erro: {error.message}</p>
      </div>
    );
  }

  if (!diets) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-extrabold tracking-tight">Minha dieta</h1>
        <Card className="bg-card border-dashed border-white/10 p-8 text-center mt-6">
          <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground mx-auto">
            <Salad className="size-6" />
          </div>
          <h3 className="mt-4 font-semibold">Nenhuma dieta atribuída</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Quando seu personal montar um plano pra você, aparece aqui.
          </p>
        </Card>
      </div>
    );
  }

  const meals = (diets.meals ?? []).sort((a: { position: number }, b: { position: number }) => a.position - b.position);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Minha dieta</h1>
        <p className="text-sm text-muted-foreground">{diets.title}</p>
      </header>

      {/* Sem kcal/macros no aluno — trainer vê em /app/students/[id] (regra de produto).
          Aqui: só as refeições que ele precisa seguir. */}

      <div className="space-y-3">
        {meals.map((meal: {
          id: string;
          name: string;
          time: string | null;
          position: number;
          meal_items: Array<{
            id: string;
            grams: number;
            position: number;
            foods: { name: string } | { name: string }[] | null;
          }> | null;
        }) => {
          // Ordena por `position` (não por UUID lexicográfico — era aleatório)
          const items = (meal.meal_items ?? []).sort(
            (a, b) => (a.position ?? 0) - (b.position ?? 0),
          );
          return (
            <Card key={meal.id} className="bg-card border-white/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{meal.name}</h3>
                {meal.time && (
                  <span className="text-xs font-mono text-muted-foreground">{meal.time}</span>
                )}
              </div>
              <ul className="space-y-1">
                {items.map((it) => {
                  const food = Array.isArray(it.foods) ? it.foods[0] : it.foods;
                  const name = food?.name ?? "Alimento";
                  return (
                    <li key={it.id} className="text-sm flex justify-between gap-2">
                      <span className="truncate">{name}</span>
                      <span className="text-muted-foreground shrink-0">{it.grams}g</span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

