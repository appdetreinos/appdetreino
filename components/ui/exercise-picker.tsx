"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExerciseMedia } from "./exercise-media";
import {
  EXERCISE_CATEGORY_LABEL,
  EXERCISE_CATEGORY_ORDER,
  PRIMARY_MUSCLE_LABEL,
} from "@/lib/workout";
import { rankExercisesByQuery, splitByMatch } from "@/lib/text-search";
import type { Exercise } from "@/lib/types/workout";

type ExerciseForPicker = Pick<
  Exercise,
  | "id"
  | "name"
  | "muscle_group"
  | "equipment"
  | "image_url"
  | "animation_url"
  | "category"
  | "aliases"
>;

type ResolvedUrlMap = Record<string, string | null>;

const CATEGORY_CHIPS: ReadonlyArray<string> = [
  "all",
  "gluteos",
  "quadriceps",
  "posterior",
  "panturrilha",
  "peito",
  "costas",
  "ombros",
  "biceps",
  "triceps",
];

type Props = {
  open: boolean;
  onClose: () => void;
  exercises: ExerciseForPicker[];
  /** Mapa exerciseId → URL já resolvida pelo server. */
  resolvedUrls?: ResolvedUrlMap;
  /** Ids já adicionados (mostra ✓ em vez de "+ Adicionar"). */
  selectedIds?: string[];
  onAdd: (exercise: ExerciseForPicker) => Promise<void> | void;
};

/**
 * Cardápio visual de exercícios. Modal full-screen com busca + chips
 * de categoria. Cada card mostra mídia + nome + categoria + equipamento
 * + botão adicionar.
 *
 * Sem motion: usa `animate-fade-in` (CSS puro do globals.css).
 */
export function ExercisePicker({
  open,
  onClose,
  exercises,
  resolvedUrls = {},
  selectedIds = [],
  onAdd,
}: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // pequeno delay pra o browser não pular o foco antes do mount.
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  const term = query.trim();
  const byChip = useMemo(() => {
    if (category === "all") return exercises;
    return exercises.filter((ex) => ex.category === category);
  }, [exercises, category]);

  const filtered = useMemo(() => {
    if (!term) return byChip;
    return rankExercisesByQuery(byChip, query);
  }, [byChip, query, term]);

  const grouped = useMemo(() => {
    const map = new Map<string, ExerciseForPicker[]>();
    for (const ex of filtered) {
      const key = (ex.category ?? ex.muscle_group ?? "outro") as string;
      const arr = map.get(key) ?? [];
      arr.push(ex);
      map.set(key, arr);
    }
    return map;
  }, [filtered]);

  const orderedGroups: string[] = useMemo(() => {
    const v2 = EXERCISE_CATEGORY_ORDER.filter((g) => grouped.has(g));
    const legacy = Object.keys(grouped).filter(
      (k) => !EXERCISE_CATEGORY_ORDER.includes(k as (typeof EXERCISE_CATEGORY_ORDER)[number]),
    );
    return [...v2, ...legacy];
  }, [grouped]);

  const totalFiltered = useMemo(
    () => orderedGroups.reduce((n, key) => n + (grouped.get(key)?.length ?? 0), 0),
    [orderedGroups, grouped],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="picker-title"
      className="fixed inset-0 z-50 flex flex-col bg-background animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground/70 hover:bg-white/5 hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <h2
              id="picker-title"
              className="text-lg font-bold"
            >
              Adicionar exercícios
            </h2>
            <p className="text-[11px] text-foreground/65">
              Toque em "+ Adicionar" para incluir no treino.
            </p>
            {term && (
              <p
                className="text-[11px] text-foreground/65"
                data-testid="picker-result-count"
                aria-live="polite"
              >
                Mostrando {totalFiltered} de {exercises.length} exercícios
              </p>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-4 pb-3">
          <label className="relative block">
            <span className="sr-only">Buscar exercício</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground/40"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔍 Pesquisar exercício…"
              aria-label="Pesquisar exercício"
              className={cn(
                "w-full rounded-full border border-white/10 bg-card py-2.5 pl-9 text-sm placeholder:text-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                query ? "pr-9" : "pr-3",
              )}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Limpar pesquisa"
                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-foreground/70 hover:bg-white/5 hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </label>
        </div>

        <div className="mx-auto max-w-3xl px-4 pb-3">
          <div
            className="-mx-1 flex gap-1.5 overflow-x-auto pb-1"
            role="tablist"
            aria-label="Filtrar por grupo muscular"
          >
            {CATEGORY_CHIPS.map((c) => {
              const active = category === c;
              const label = c === "all" ? "Todos" : EXERCISE_CATEGORY_LABEL[c as keyof typeof EXERCISE_CATEGORY_LABEL] ?? c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  aria-pressed={active}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                    active
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-white/10 bg-card text-foreground/70 hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {orderedGroups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-card/60 p-6 text-center text-[13px] text-foreground/65">
            Nenhum exercício encontrado
            {term
              ? ` para “${query}”`
              : category !== "all"
                ? ` em ${EXERCISE_CATEGORY_LABEL[category as keyof typeof EXERCISE_CATEGORY_LABEL] ?? category}`
                : ""}
            .
          </div>
        ) : (
          orderedGroups.map((group) => (
            <section key={group}>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground/65">
                {groupLabel(group)}
                <span className="text-[10px] font-normal normal-case text-foreground/40">
                  {grouped.get(group)?.length ?? 0} exercícios
                </span>
              </h3>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {grouped.get(group)?.map((ex) => {
                  const isSelected = selectedIds.includes(ex.id);
                  return (
                    <li
                      key={ex.id}
                      className={cn(
                        "flex items-stretch gap-3 rounded-2xl border bg-card p-3 transition-colors",
                        isSelected
                          ? "border-emerald-500/40 bg-emerald-500/[0.05]"
                          : "border-white/10 hover:border-primary/40",
                      )}
                    >
                      <ExerciseMedia
                        exercise={ex}
                        resolvedUrl={resolvedUrls[ex.id] ?? null}
                        size="lg"
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <p className="line-clamp-2 text-sm font-semibold">
                          <HighlightedName name={ex.name} term={term} />
                        </p>
                        <p className="text-[11px] text-foreground/65">
                          {groupLabel(
                            (ex.category ?? ex.muscle_group ?? "outro") as string,
                          )}
                          {ex.equipment && ex.equipment !== "nenhum"
                            ? ` · ${equipmentShortLabel(ex.equipment)}`
                            : ""}
                        </p>
                        <div className="mt-auto pt-2">
                          <AddButton
                            isSelected={isSelected}
                            onClick={() => onAdd(ex)}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function AddButton({
  isSelected,
  onClick,
}: {
  isSelected: boolean;
  onClick: () => void;
}) {
  if (isSelected) {
    return (
      <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 text-[11px] font-semibold text-emerald-500">
        <Check className="size-3" aria-hidden="true" />
        Adicionado
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
    >
      <Plus className="size-3" aria-hidden="true" />
      Adicionar
    </button>
  );
}

function equipmentShortLabel(eq: string): string {
  switch (eq) {
    case "haltere":
      return "Haltere";
    case "barra":
      return "Barra";
    case "maquina":
      return "Máquina";
    case "elastico":
      return "Elástico";
    case "cabo":
      return "Cabo";
    case "kettlebell":
      return "Kettlebell";
    case "outro":
      return "Outro";
    case "nenhum":
      return "Peso corporal";
    default:
      return eq;
  }
}

function groupLabel(key: string): string {
  return (
    EXERCISE_CATEGORY_LABEL[key as keyof typeof EXERCISE_CATEGORY_LABEL] ??
    PRIMARY_MUSCLE_LABEL[key as keyof typeof PRIMARY_MUSCLE_LABEL] ??
    "Outro"
  );
}

function HighlightedName({ name, term }: { name: string; term: string }) {
  if (!term) return <>{name}</>;
  const segments = splitByMatch(name, term);
  return (
    <>
      {segments.map((seg, i) =>
        seg.match ? (
          <mark
            key={i}
            className="rounded bg-amber-500/30 px-0.5 text-inherit"
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}
