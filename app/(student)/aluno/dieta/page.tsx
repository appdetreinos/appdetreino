import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Salad, Coffee, Sun, Moon, Apple, UtensilsCrossed } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/ui/stagger";

type MealIcon = "cafe" | "almoco" | "jantar" | "lanche" | "outro";

function pickMealIcon(name: string): React.ComponentType<{ className?: string }> {
  const n = name.toLowerCase();
  if (n.includes("café") || n.includes("cafe") || n.includes("manhã") || n.includes("manha"))
    return Coffee;
  if (n.includes("almoço") || n.includes("almoco")) return Sun;
  if (n.includes("jantar") || n.includes("noite")) return Moon;
  if (n.includes("lanche") || n.includes("snack")) return Apple;
  if (n.includes("ceia")) return Moon;
  return UtensilsCrossed;
}

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

  const meals = (
    (diets.meals ?? []) as Array<{
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
    }>
  ).sort((a, b) => a.position - b.position);

  // Sem kcal/macros no aluno — trainer vê em /app/students/[id] (regra de produto).

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 pb-12">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Minha dieta</h1>
        <p className="text-sm text-muted-foreground">{diets.title}</p>
      </header>

      <Stagger className="space-y-3" delay={0.05}>
        {meals.map((meal) => {
          const items = (meal.meal_items ?? []).sort(
            (a, b) => (a.position ?? 0) - (b.position ?? 0),
          );
          const Icon = pickMealIcon(meal.name);
          return (
            <StaggerItem key={meal.id}>
              <Card className="bg-card border-white/5 p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <Icon className="size-4" />
                    </div>
                    <h3 className="font-bold">{meal.name}</h3>
                  </div>
                  {meal.time && (
                    <span className="text-xs font-mono text-muted-foreground bg-secondary/40 px-2 py-1 rounded">
                      {meal.time}
                    </span>
                  )}
                </div>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Sem alimentos.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {items.map((it) => {
                      const food = Array.isArray(it.foods) ? it.foods[0] : it.foods;
                      const name = food?.name ?? "Alimento";
                      return (
                        <li
                          key={it.id}
                          className="text-sm flex justify-between gap-2 px-2 py-1 rounded hover:bg-white/[0.03]"
                        >
                          <span className="truncate">{name}</span>
                          <span className="text-muted-foreground shrink-0 font-mono">
                            {it.grams}g
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </StaggerItem>
          );
        })}
      </Stagger>
    </div>
  );
}
