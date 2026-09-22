"use client";

import { useState } from "react";
import { ExerciseMedia } from "@/components/ui/exercise-media";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Clock, ChevronRight, ChevronDown } from "lucide-react";

// ============================================================
// Tipos exportados (também usados em workout-form.tsx)
// ============================================================

export type CatalogExercise = {
  exercise_id: string;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  image_url: string | null;
  animation_url: string | null;
  position: number;
  sets: number;
  reps: string;
  load: string | null;
};

export type CatalogTemplateType =
  | "push"
  | "pull"
  | "legs"
  | "upper"
  | "lower"
  | "full_body"
  | "cardio";

export type CatalogTemplate = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  template_type: CatalogTemplateType;
  estimated_minutes: number | null;
  groups: string[];
  exercises: CatalogExercise[];
};

// ============================================================
// Constantes de UI
// ============================================================

const TYPE_CHIPS: Array<{ key: CatalogTemplateType; label: string }> = [
  { key: "push", label: "Push" },
  { key: "pull", label: "Pull" },
  { key: "legs", label: "Legs" },
  { key: "upper", label: "Upper" },
  { key: "lower", label: "Lower" },
  { key: "full_body", label: "Full Body" },
];

const GROUP_LABELS: Record<string, string> = {
  peito: "Peito",
  ombro: "Ombros",
  costas: "Costas",
  biceps: "Bíceps",
  triceps: "Tríceps",
  quadriceps: "Quadríceps",
  posterior: "Posterior",
  gluteos: "Glúteos",
  panturrilha: "Panturrilha",
  core: "Core",
  cardio: "Cardio",
};

// ============================================================
// Componente
// ============================================================

export function TemplateCatalogPicker({
  templates,
  resolvedUrls,
  onUseTemplate,
}: {
  templates: CatalogTemplate[];
  resolvedUrls: Record<string, string | null>;
  onUseTemplate: (template: CatalogTemplate) => void;
}) {
  const [activeType, setActiveType] = useState<CatalogTemplateType>("push");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  // Filtra templates por tipo ativo.
  const templatesByType = templates.filter(
    (t) => t.template_type === activeType,
  );

  // Lista de grupos disponíveis no tipo ativo (único, ordenado).
  const availableGroups = Array.from(
    new Set(templatesByType.flatMap((t) => t.groups)),
  ).sort();

  // Templates do tipo + (opcional) grupo selecionado.
  const filtered = activeGroup
    ? templatesByType.filter((t) => t.groups.includes(activeGroup))
    : templatesByType;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/65">
          Catálogo de modelos
        </h2>
        <p className="mt-1 text-xs text-foreground/55">
          Escolhe um modelo pronto e personaliza depois.
        </p>
      </div>

      {/* Chips de tipo (hierarquia 1) */}
      <div className="flex flex-wrap gap-1.5">
        {TYPE_CHIPS.map((chip) => {
          const count = templates.filter(
            (t) => t.template_type === chip.key,
          ).length;
          if (count === 0) return null;
          const active = activeType === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => {
                setActiveType(chip.key);
                setActiveGroup(null);
              }}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-white/10 text-foreground/65 hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {chip.label}
              <span className="ml-1 text-[10px] text-foreground/50">
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Sub-chips de grupo (hierarquia 2) */}
      {availableGroups.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveGroup(null)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              activeGroup === null
                ? "border-primary/40 bg-primary/5 text-foreground"
                : "border-white/5 text-foreground/55 hover:text-foreground"
            }`}
          >
            Todos
          </button>
          {availableGroups.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setActiveGroup(g === activeGroup ? null : g)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                activeGroup === g
                  ? "border-primary/40 bg-primary/5 text-foreground"
                  : "border-white/5 text-foreground/55 hover:text-foreground"
              }`}
            >
              {GROUP_LABELS[g] ?? g}
            </button>
          ))}
        </div>
      )}

      {/* Lista de templates filtrados */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-background/40 p-4 text-center text-xs text-foreground/55">
            Nenhum modelo nesse grupo ainda.
          </div>
        ) : (
          filtered.map((t) => (
            <CatalogCard
              key={t.id}
              template={t}
              resolvedUrls={resolvedUrls}
              onUse={() => onUseTemplate(t)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// Card de template (compacto)
// ============================================================

function CatalogCard({
  template,
  resolvedUrls,
  onUse,
}: {
  template: CatalogTemplate;
  resolvedUrls: Record<string, string | null>;
  onUse: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-xl border border-white/10 bg-card/80 transition-colors hover:border-primary/40 ${
        expanded ? "ring-1 ring-primary/20" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <Dumbbell className="size-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{template.title}</div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-foreground/55">
            <span>{template.exercises.length} exercícios</span>
            {template.estimated_minutes && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-0.5">
                  <Clock className="size-3" />
                  {template.estimated_minutes} min
                </span>
              </>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="size-4 text-foreground/55 shrink-0" />
        ) : (
          <ChevronRight className="size-4 text-foreground/55 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-white/5 px-3 py-2.5 space-y-2.5 animate-fade-in">
          {template.description && (
            <p className="text-[11px] text-foreground/65 leading-relaxed">
              {template.description}
            </p>
          )}

          {/* Tags de grupos musculares */}
          <div className="flex flex-wrap gap-1">
            {template.groups.map((g) => (
              <Badge
                key={g}
                variant="outline"
                className="border-white/10 text-foreground/65 text-[10px] py-0.5 px-1.5"
              >
                {GROUP_LABELS[g] ?? g}
              </Badge>
            ))}
          </div>

          {/* Lista de exercícios (preview) */}
          <ol className="space-y-1">
            {template.exercises.slice(0, 5).map((ex) => (
              <li
                key={ex.exercise_id || ex.position}
                className="flex items-center gap-2 text-[11px] text-foreground/70"
              >
                <span className="grid size-5 place-items-center rounded bg-primary/10 text-primary text-[10px] font-bold shrink-0">
                  {ex.position}
                </span>
                <span className="truncate flex-1">{ex.name}</span>
                <span className="shrink-0 text-foreground/55">
                  {ex.sets}×{ex.reps}
                </span>
              </li>
            ))}
            {template.exercises.length > 5 && (
              <li className="text-[10px] text-foreground/55 pl-7">
                + {template.exercises.length - 5} exercícios
              </li>
            )}
          </ol>

          {/* CTA "usar este modelo" */}
          <button
            type="button"
            onClick={onUse}
            className="w-full rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs font-bold hover:opacity-90 transition-opacity"
          >
            Usar este modelo
          </button>
        </div>
      )}
    </div>
  );
}
