import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ShoppingItemRow } from "./shopping-item-row";
import { ShoppingBasket } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Stagger, StaggerItem, AnimatedNumber } from "@/components/ui/stagger";

export default async function ComprasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const weekStart = monday.toISOString().split("T")[0];

  const { data: shoppingList, error } = await supabase
    .from("shopping_lists")
    .select(
      `id, week_start, generated_at,
       items:shopping_list_items(id, food_name, total_grams, category, checked)`,
    )
    .eq("student_id", user.id)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (error) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Lista de compras</h1>
        <p className="text-sm text-destructive">Erro: {error.message}</p>
      </div>
    );
  }

  if (!shoppingList) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6 pb-12">
        <header>
          <h1 className="text-2xl font-extrabold tracking-tight">Lista de compras</h1>
        </header>
        <Card className="bg-card border-dashed border-white/10 p-8 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground mx-auto">
            <ShoppingBasket className="size-6" />
          </div>
          <h3 className="mt-4 font-semibold">Sem lista essa semana</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Quando seu personal gerar a lista da sua dieta, aparece aqui.
          </p>
        </Card>
      </div>
    );
  }

  type Item = {
    id: string;
    food_name: string;
    total_grams: number;
    category: string | null;
    checked: boolean;
  };

  const items = (shoppingList.items ?? []) as Item[];

  const byCategory = items.reduce<Record<string, Item[]>>((acc, it) => {
    const cat = it.category ?? "Outros";
    (acc[cat] ??= []).push(it);
    return acc;
  }, {});

  const totalChecked = items.filter((i) => i.checked).length;
  const progressPct = items.length === 0 ? 0 : (totalChecked / items.length) * 100;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 pb-12">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Lista de compras</h1>
        <p className="text-sm text-muted-foreground">
          Semana de{" "}
          {new Date(shoppingList.week_start).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
          })}
        </p>
      </header>

      {/* Progresso com ProgressRing */}
      <Card className="bg-card border-white/5 p-5">
        <div className="flex items-center gap-5">
          <ProgressRing
            value={progressPct}
            size={84}
            strokeWidth={7}
            progressColor="oklch(0.696 0.17 162.48)"
            label={
              <span className="text-lg font-extrabold">
                <AnimatedNumber value={totalChecked} />/<AnimatedNumber value={items.length} />
              </span>
            }
            sublabel="itens"
          />
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">
              {progressPct === 100
                ? "Lista completa!"
                : progressPct >= 50
                  ? "Tá indo bem, falta pouco."
                  : "Bora começar pelo hortifruti?"}
            </div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      <Stagger className="space-y-4" delay={0.05}>
        {Object.entries(byCategory).map(([category, list]) => (
          <StaggerItem key={category}>
            <Card className="bg-card border-white/5 overflow-hidden">
              <div className="px-4 py-2 border-b border-white/5 bg-muted/30">
                <h3 className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                  {category}
                </h3>
              </div>
              <div>
                {list.map((item) => (
                  <ShoppingItemRow key={item.id} item={item} />
                ))}
              </div>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
