import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button-link";
import { ArrowLeft, Salad, User } from "lucide-react";
import { SubstituteManager, type Substitute } from "./substitute-manager";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export default async function DietDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: diet } = await supabase
    .from("diets")
    .select(
      `id, title, kcal_target, p_target, c_target, g_target, goal, student_id,
       student:student_id(full_name),
       meals:meals(id, name, time, position, meal_items(id, grams, position, foods:food_id(name), substitutes:meal_item_substitutes(id, food_name, grams)))`,
    )
    .eq("id", id)
    .eq("trainer_id", user.id)
    .maybeSingle();

  if (!diet) notFound();

  const student = Array.isArray(diet.student) ? diet.student[0] : diet.student;
  const meals = ((diet.meals ?? []) as Array<{
    id: string;
    name: string;
    time: string | null;
    position: number;
    meal_items: Array<{
      id: string;
      grams: number;
      position: number;
      foods: { name: string } | { name: string }[] | null;
      substitutes: Substitute[] | null;
    }> | null;
  }>)
    .slice()
    .sort((a, b) => a.position - b.position);

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center gap-3">
          <Link href="/app/diets" className="text-foreground/70 hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-xl font-bold truncate">{diet.title}</h1>
        </div>
      </header>

      <main className="p-6 max-w-3xl mx-auto space-y-6">
        {student && (
          <Card className="bg-card/80 border-white/10 p-4 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
              <User className="size-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Aluno
              </div>
              <Link
                href={`/app/students/${diet.student_id}`}
                className="font-bold hover:text-primary transition-colors"
              >
                {student.full_name}
              </Link>
            </div>
          </Card>
        )}

        {/* Macros */}
        <Card className="bg-card/80 border-white/10 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Meta diária
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MacroBox label="Calorias" value={diet.kcal_target} unit="kcal" />
            <MacroBox label="Proteína" value={diet.p_target} unit="g" />
            <MacroBox label="Carboidrato" value={diet.c_target} unit="g" />
            <MacroBox label="Gordura" value={diet.g_target} unit="g" />
          </div>
          {diet.goal && (
            <div className="mt-3 text-xs text-muted-foreground">
              Objetivo: <span className="capitalize">{diet.goal}</span>
            </div>
          )}
        </Card>

        {/* Refeições */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Refeições
          </h2>
          {meals.length === 0 ? (
            <Card className="bg-card border-dashed border-white/10 p-8 text-center">
              <Salad className="size-10 text-muted-foreground mx-auto" />
              <p className="mt-3 text-sm text-muted-foreground">
                Sem refeições configuradas.
              </p>
            </Card>
          ) : (
            meals.map((meal) => {
              const items = (meal.meal_items ?? [])
                .slice()
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
              return (
                <Card key={meal.id} className="bg-card border-white/5 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold">{meal.name}</h3>
                    {meal.time && (
                      <span className="text-xs font-mono text-muted-foreground">
                        {meal.time}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1.5">
                    {items.map((it) => {
                      const food = Array.isArray(it.foods) ? it.foods[0] : it.foods;
                      const name = food?.name ?? "Alimento";
                      return (
                        <li key={it.id}>
                          <div
                            className="text-sm flex justify-between gap-2 py-1 border-b border-white/5 last:border-0"
                          >
                            <span className="truncate">{name}</span>
                            <span className="text-muted-foreground shrink-0 num">
                              {it.grams}g
                            </span>
                          </div>
                          <SubstituteManager mealItemId={it.id} initial={it.substitutes ?? []} />
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              );
            })
          )}
        </div>

        <div className="flex justify-end">
          <ButtonLink href="/app/diets" variant="outline">
            Voltar
          </ButtonLink>
        </div>
      </main>
    </div>
  );
}

function MacroBox({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit: string;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-background/40 p-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 num text-xl font-extrabold">
        {value != null ? value : "—"}
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          {value != null ? unit : ""}
        </span>
      </div>
    </div>
  );
}
