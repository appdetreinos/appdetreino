"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type Substitute = { id: string; food_name: string; grams: number };

/**
 * Trocas equivalentes de um alimento (padrão Prime: chega de PDF).
 * Trainer adiciona/remove; aluno vê como opção.
 */
export function SubstituteManager({
  mealItemId,
  initial,
}: {
  mealItemId: string;
  initial: Substitute[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<Substitute[]>(initial);
  const [food, setFood] = useState("");
  const [grams, setGrams] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const foodName = food.trim();
    const g = Number(grams);
    if (!foodName || !Number.isFinite(g) || g <= 0) {
      setError("Informa o alimento e a quantidade em gramas.");
      return;
    }
    const supabase = createClient();
    const { data, error: insErr } = await supabase
      .from("meal_item_substitutes")
      .insert({ meal_item_id: mealItemId, food_name: foodName, grams: Math.round(g) })
      .select("id, food_name, grams")
      .single();
    if (insErr || !data) {
      setError("Não deu pra salvar a troca.");
      return;
    }
    setItems((cur) => [...cur, data as Substitute]);
    setFood("");
    setGrams("");
    startTransition(() => router.refresh());
  }

  async function remove(id: string) {
    const supabase = createClient();
    const prev = items;
    setItems((cur) => cur.filter((s) => s.id !== id));
    const { error: delErr } = await supabase.from("meal_item_substitutes").delete().eq("id", id);
    if (delErr) setItems(prev);
    else startTransition(() => router.refresh());
  }

  return (
    <div className="mt-2 rounded-lg bg-background/40 border border-dashed border-white/10 p-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
        Trocas equivalentes
      </div>
      {items.length > 0 && (
        <ul className="space-y-1 mb-2">
          {items.map((s) => (
            <li key={s.id} className="text-xs flex items-center justify-between gap-2">
              <span className="truncate">
                ⇄ {s.food_name} <span className="text-muted-foreground font-mono">{s.grams}g</span>
              </span>
              <button
                type="button"
                onClick={() => remove(s.id)}
                disabled={pending}
                className="text-muted-foreground hover:text-destructive shrink-0"
                aria-label={`Remover troca ${s.food_name}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="flex gap-1.5">
        <Input
          value={food}
          onChange={(e) => setFood(e.target.value)}
          placeholder="Ex: batata inglesa"
          className="h-8 text-xs"
        />
        <Input
          value={grams}
          onChange={(e) => setGrams(e.target.value)}
          placeholder="g"
          inputMode="numeric"
          className="h-8 text-xs w-16"
        />
        <Button type="submit" size="sm" variant="outline" className="h-8 shrink-0" disabled={pending}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
        </Button>
      </form>
      {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
    </div>
  );
}
