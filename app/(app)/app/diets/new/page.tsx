"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { csrfFetch } from "@/lib/security/client";

type StudentOption = { id: string; name: string };
type MealDraft = {
  name: string;
  time: string;
  items: { food_name: string; grams: string }[];
};

export default function NewDietPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [studentId, setStudentId] = useState("");
  const [meals, setMeals] = useState<MealDraft[]>([
    { name: "Café da manhã", time: "07:00", items: [{ food_name: "", grams: "" }] },
    { name: "Almoço", time: "12:00", items: [{ food_name: "", grams: "" }] },
  ]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoadingStudents(false);
        return;
      }
      const { data } = await supabase
        .from("student_profiles")
        .select("user_id, full_name")
        .eq("trainer_id", user.id)
        .eq("status", "active")
        .order("full_name");
      setStudents(
        (data ?? []).map((s) => ({ id: s.user_id as string, name: (s.full_name as string) ?? "Aluno" })),
      );
      setLoadingStudents(false);
    })();
  }, []);

  function addMeal() {
    setMeals((prev) => [
      ...prev,
      { name: "", time: "", items: [{ food_name: "", grams: "" }] },
    ]);
  }

  function removeMeal(idx: number) {
    setMeals((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateMeal(idx: number, patch: Partial<MealDraft>) {
    setMeals((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  }

  function addItem(mealIdx: number) {
    setMeals((prev) =>
      prev.map((m, i) =>
        i === mealIdx ? { ...m, items: [...m.items, { food_name: "", grams: "" }] } : m,
      ),
    );
  }

  function removeItem(mealIdx: number, itemIdx: number) {
    setMeals((prev) =>
      prev.map((m, i) =>
        i === mealIdx ? { ...m, items: m.items.filter((_, j) => j !== itemIdx) } : m,
      ),
    );
  }

  function updateItem(mealIdx: number, itemIdx: number, patch: Partial<{ food_name: string; grams: string }>) {
    setMeals((prev) =>
      prev.map((m, i) =>
        i === mealIdx
          ? {
              ...m,
              items: m.items.map((it, j) => (j === itemIdx ? { ...it, ...patch } : it)),
            }
          : m,
      ),
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Dá um título pra dieta.");
      return;
    }

    // Limpa meals vazios
    const cleanMeals = meals
      .filter((m) => m.name.trim() && m.items.some((it) => it.food_name.trim()))
      .map((m, idx) => ({
        name: m.name.trim(),
        time: m.time || null,
        position: idx,
        items: m.items
          .filter((it) => it.food_name.trim())
          .map((it, j) => ({
            food_name: it.food_name.trim(),
            grams: Number(it.grams) || 0,
            position: j,
          })),
      }));

    if (cleanMeals.length === 0) {
      setError("Adiciona ao menos uma refeição com alimentos.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await csrfFetch("/api/me/diets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          goal: goal.trim() || null,
          kcal_target: kcal ? Number(kcal) : null,
          p_target: protein ? Number(protein) : null,
          student_id: studentId || null,
          meals: cleanMeals,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; id?: string; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Erro ao criar dieta.");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      startTransition(() => {
        if (json.id) router.push(`/app/diets/${json.id}`);
        else router.push("/app/diets");
        router.refresh();
      });
    } catch {
      setError("Erro de rede.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center gap-3">
          <Link href="/app/diets" className="text-foreground/70 hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-xl font-bold">Nova dieta</h1>
        </div>
      </header>

      <main className="p-6 max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Card className="bg-card/80 border-white/10 p-6 space-y-5">
            <div>
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Dieta cutting — Lucas"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="student_id">Aluno (opcional)</Label>
              {loadingStudents ? (
                <div className="mt-1.5 flex items-center gap-2 text-sm text-foreground/65">
                  <Loader2 className="size-4 animate-spin" /> Carregando…
                </div>
              ) : students.length === 0 ? (
                <p className="mt-1.5 text-sm text-foreground/65">
                  Sem alunos ativos. A dieta vai ficar como template seu.
                </p>
              ) : (
                <select
                  id="student_id"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="mt-1.5 w-full h-11 rounded-md border border-white/10 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">— Nenhum (template) —</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="kcal">Kcal / dia</Label>
                <Input
                  id="kcal"
                  type="number"
                  value={kcal}
                  onChange={(e) => setKcal(e.target.value)}
                  placeholder="2000"
                  className="mt-1.5 num"
                />
              </div>
              <div>
                <Label htmlFor="protein">Proteína (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  placeholder="160"
                  className="mt-1.5 num"
                />
              </div>
              <div>
                <Label htmlFor="goal">Objetivo</Label>
                <Input
                  id="goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="cutting, bulking, manutenção…"
                  className="mt-1.5"
                />
              </div>
            </div>
          </Card>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Refeições
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMeal}
                className="text-xs"
              >
                <Plus className="size-3.5" />
                Adicionar refeição
              </Button>
            </div>

            {meals.map((meal, mealIdx) => (
              <Card key={mealIdx} className="bg-card/80 border-white/10 p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <Input
                    value={meal.name}
                    onChange={(e) => updateMeal(mealIdx, { name: e.target.value })}
                    placeholder="Nome da refeição (ex: Almoço)"
                    className="max-w-xs"
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={meal.time}
                      onChange={(e) => updateMeal(mealIdx, { time: e.target.value })}
                      className="w-32"
                    />
                    {meals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMeal(mealIdx)}
                        className="p-2 rounded-md text-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {meal.items.map((it, itemIdx) => (
                    <div key={itemIdx} className="flex items-center gap-2">
                      <Input
                        value={it.food_name}
                        onChange={(e) =>
                          updateItem(mealIdx, itemIdx, { food_name: e.target.value })
                        }
                        placeholder="Alimento (ex: Frango grelhado)"
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={it.grams}
                        onChange={(e) =>
                          updateItem(mealIdx, itemIdx, { grams: e.target.value })
                        }
                        placeholder="gramas"
                        className="w-24 num"
                      />
                      {meal.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(mealIdx, itemIdx)}
                          className="p-2 rounded-md text-foreground/60 hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addItem(mealIdx)}
                    className="text-xs text-primary"
                  >
                    <Plus className="size-3.5" />
                    Adicionar alimento
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <ButtonLink href="/app/diets" variant="outline">
              Cancelar
            </ButtonLink>
            <Button type="submit" disabled={submitting || pending} className="font-semibold">
              {submitting || pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Criando…
                </>
              ) : (
                "Criar dieta"
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
