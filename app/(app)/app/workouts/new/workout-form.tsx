"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { csrfFetch } from "@/lib/security/client";

type Student = { id: string; full_name: string };
type ExerciseOption = {
  id: string;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
};
type ExerciseDraft = { name: string; sets: string; reps: string; load: string };

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function WorkoutForm({
  students,
  exercises,
}: {
  students: Student[];
  exercises: ExerciseOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [studentId, setStudentId] = useState<string>(""); // "" = template (sem aluno)
  const [days, setDays] = useState<number[]>([1, 3, 5]); // seg/qua/sex default
  const [exerciseRows, setExerciseRows] = useState<ExerciseDraft[]>([
    { name: "", sets: "3", reps: "10-12", load: "" },
  ]);

  function toggleDay(d: number) {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  }

  function addExercise() {
    setExerciseRows((prev) => [...prev, { name: "", sets: "3", reps: "10-12", load: "" }]);
  }

  function removeExercise(i: number) {
    setExerciseRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateExercise(i: number, patch: Partial<ExerciseDraft>) {
    setExerciseRows((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Título é obrigatório.");
      return;
    }
    const validExercises = exerciseRows.filter((ex) => ex.name.trim().length > 0);
    if (validExercises.length === 0) {
      setError("Adicione pelo menos 1 exercício com nome.");
      return;
    }
    if (days.length === 0) {
      setError("Selecione pelo menos 1 dia da semana.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await csrfFetch("/api/me/workouts", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          goal: goal.trim() || null,
          student_id: studentId || null,
          days,
          exercises: validExercises.map((e) => ({
            name: e.name.trim(),
            sets: Number(e.sets) || 3,
            reps: e.reps.trim(),
            load: e.load.trim() || null,
          })),
        }),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Erro ao criar treino.");
        setSubmitting(false);
        return;
      }

      startTransition(() => {
        router.push(`/app/workouts/${body.id}`);
        router.refresh();
      });
    } catch {
      setError("Falha de conexão.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center gap-3">
          <Link href="/app/workouts" className="text-foreground/70 hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-xl font-bold">Novo treino</h1>
        </div>
      </header>

      <main className="p-6 max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-card/80 border-white/10 p-6 space-y-5">
            <div>
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Treino A — Peito e tríceps"
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="goal">Objetivo (opcional)</Label>
              <Input
                id="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Hipertrofia, emagrecimento, performance…"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="student">Atribuir a (opcional — vazio = template)</Label>
              <select
                id="student"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm"
              >
                <option value="">— Template (sem aluno) —</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="block mb-2">Dias da semana</Label>
              <div className="grid grid-cols-7 gap-2">
                {DAY_LABELS.map((label, idx) => {
                  const active = days.includes(idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`rounded-md border px-2 py-2 text-sm font-semibold transition-colors ${
                        active
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-white/10 text-foreground/60 hover:border-primary/40"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          <Card className="bg-card/80 border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Exercícios</h2>
              <Button type="button" variant="outline" size="sm" onClick={addExercise}>
                <Plus className="size-4" />
                Adicionar
              </Button>
            </div>

            {exerciseRows.map((ex, i) => (
              <div
                key={i}
                className="rounded-lg border border-white/10 bg-background/40 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <Label className="text-xs uppercase tracking-wider text-foreground/65">
                    Exercício {i + 1}
                  </Label>
                  {exerciseRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeExercise(i)}
                      className="text-foreground/60 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
                <ExercisePicker
                  value={ex.name}
                  onChange={(name) => updateExercise(i, { name })}
                  options={exercises}
                />
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Séries</Label>
                    <Input
                      type="number"
                      min={1}
                      value={ex.sets}
                      onChange={(e) => updateExercise(i, { sets: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Reps</Label>
                    <Input
                      value={ex.reps}
                      onChange={(e) => updateExercise(i, { reps: e.target.value })}
                      placeholder="8-12"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Carga</Label>
                    <Input
                      value={ex.load}
                      onChange={(e) => updateExercise(i, { load: e.target.value })}
                      placeholder="20kg"
                    />
                  </div>
                </div>
              </div>
            ))}
          </Card>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <ButtonLink href="/app/workouts" variant="outline">
              Cancelar
            </ButtonLink>
            <Button type="submit" disabled={submitting || pending} className="font-semibold">
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Criando…
                </>
              ) : (
                "Criar treino"
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

/**
 * Picker de exercício com autocomplete na biblioteca (30+ exercícios globais + do trainer).
 * Aceita nome digitado também (fallback pra exercícios custom não cadastrados).
 */
function ExercisePicker({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (name: string) => void;
  options: ExerciseOption[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fecha dropdown ao clicar fora
  useState(() => {
    if (typeof window === "undefined") return;
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDocClick);
    return () => window.removeEventListener("mousedown", onDocClick);
  });

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options.slice(0, 30);
    return options
      .filter((o) =>
        o.name.toLowerCase().includes(q) ||
        (o.muscle_group ?? "").toLowerCase().includes(q) ||
        (o.equipment ?? "").toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [value, options]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar exercício (ex: supino, agachamento)"
          className="pl-9"
          autoComplete="off"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-white/10 bg-card shadow-lg">
          {filtered.map((o) => {
            const selected = o.name === value;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onChange(o.name);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-primary/10 ${
                  selected ? "bg-primary/5" : ""
                }`}
              >
                <span className="truncate">{o.name}</span>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-foreground/55">
                  {[o.muscle_group, o.equipment].filter(Boolean).join(" · ")}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {open && filtered.length === 0 && value.trim().length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-white/10 bg-card p-3 text-xs text-foreground/60 shadow-lg">
          Nenhum exercício na biblioteca. O nome "{value}" será criado ao salvar.
        </div>
      )}
    </div>
  );
}
