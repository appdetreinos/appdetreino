"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExerciseMedia } from "@/components/ui/exercise-media";
import { ListChecks, ChevronDown, Play } from "lucide-react";
import {
  PRIMARY_MUSCLE_LABEL,
  EQUIPMENT_LABEL,
} from "@/lib/workout";

// ============================================================
// Tipos
// ============================================================

export type ExecutionItem = {
  id: string;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  image_url: string | null;
  animation_url: string | null;
  media_type: "gif" | "video" | "svg" | null;
  sets: number;
  reps: string;
  load: string | null;
  position: number;
};

export type ExecutionStep = {
  dayId: string;
  dayTitle: string | null;
  dayOfWeek: number;
  items: ExecutionItem[];
};

// ============================================================
// Constantes
// ============================================================

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// ============================================================
// Componente principal
// ============================================================

export function WorkoutExecutionPreview({
  steps,
  resolvedUrls,
}: {
  steps: ExecutionStep[];
  resolvedUrls: Record<string, string | null>;
}) {
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [activeItemIdx, setActiveItemIdx] = useState(0);

  // Sem dias configurados: nem renderiza.
  if (steps.length === 0) return null;

  const currentDay = steps[activeDayIdx] ?? steps[0];
  const currentItem = currentDay.items[activeItemIdx] ?? currentDay.items[0];

  function handleSelectDay(idx: number) {
    setActiveDayIdx(idx);
    setActiveItemIdx(0);
  }

  return (
    <Card className="bg-card border-white/10 overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/5 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-4">
        <div className="flex items-center gap-2">
          <ListChecks className="size-5 text-primary" />
          <h2 className="font-bold">Sequência do treino</h2>
        </div>
        <p className="mt-1 text-[11px] text-foreground/65">
          Visualiza como o treino vai ser executado, dia a dia.
        </p>
      </div>

      {/* Tab strip dos dias */}
      <div className="border-b border-white/5 px-2 py-2 overflow-x-auto">
        <div className="flex gap-1.5">
          {steps.map((step, idx) => {
            const itemCount = step.items.length;
            const active = idx === activeDayIdx;
            return (
              <button
                key={step.dayId}
                type="button"
                onClick={() => handleSelectDay(idx)}
                className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-white/10 text-foreground/65 hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <span className="block">Dia {idx + 1}</span>
                <span
                  className={`block text-[10px] ${
                    active ? "text-foreground/75" : "text-foreground/45"
                  }`}
                >
                  {DAY_NAMES[step.dayOfWeek]} · {itemCount} ex
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Body: timeline vertical */}
      <div className="p-4">
        {currentDay.items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-background/40 p-6 text-center text-xs text-foreground/55">
            Sem exercícios nesse dia.
          </div>
        ) : (
          <ol className="space-y-2">
            {currentDay.items.map((item, idx) => {
              const isActive = idx === activeItemIdx;
              const isNext = idx === activeItemIdx + 1;
              const isPast = idx < activeItemIdx;

              if (isActive) {
                return (
                  <li
                    key={item.id}
                    className="animate-fade-in rounded-xl border border-primary/40 bg-primary/[0.06] p-3 ring-1 ring-primary/20"
                  >
                    <div className="flex items-start gap-3">
                      <ExerciseMedia
                        exercise={{
                          id: item.id,
                          name: item.name,
                          muscle_group: item.muscle_group,
                          image_url: item.image_url,
                          animation_url: item.animation_url,
                          media_type: item.media_type,
                          category: null,
                        }}
                        resolvedUrl={resolvedUrls[item.id] ?? null}
                        size="lg"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 font-bold">
                            <Play className="size-2.5 mr-0.5" />
                            Atual
                          </Badge>
                          <span className="text-[10px] text-foreground/55">
                            #{item.position}
                          </span>
                        </div>
                        <h3 className="mt-1 text-sm font-bold truncate">
                          {item.name}
                        </h3>
                        <p className="mt-0.5 text-[11px] text-primary/80 uppercase tracking-wider font-semibold truncate">
                          {PRIMARY_MUSCLE_LABEL[
                            (item.muscle_group ?? "outro") as keyof typeof PRIMARY_MUSCLE_LABEL
                          ] ?? item.muscle_group}
                          {item.equipment
                            ? ` · ${
                                EQUIPMENT_LABEL[
                                  item.equipment as keyof typeof EQUIPMENT_LABEL
                                ] ?? item.equipment
                              }`
                            : ""}
                        </p>
                        <div className="mt-2 text-sm">
                          <span className="font-bold text-foreground">
                            {item.sets}
                          </span>
                          <span className="text-foreground/55 mx-0.5">×</span>
                          <span className="font-bold text-foreground">
                            {item.reps}
                          </span>
                          {item.load && (
                            <span className="text-xs text-foreground/65 ml-2">
                              · {item.load}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              }

              if (isNext) {
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setActiveItemIdx(idx)}
                      className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-card/60 px-3 py-2.5 text-left hover:border-primary/40 transition-colors"
                    >
                      <ExerciseMedia
                        exercise={{
                          id: item.id,
                          name: item.name,
                          muscle_group: item.muscle_group,
                          image_url: item.image_url,
                          animation_url: item.animation_url,
                          media_type: item.media_type,
                          category: null,
                        }}
                        resolvedUrl={resolvedUrls[item.id] ?? null}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-primary/30 text-primary text-[10px] px-1.5 py-0.5 font-semibold"
                          >
                            Próximo
                          </Badge>
                          <span className="text-[10px] text-foreground/55">
                            #{item.position}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm font-semibold truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-foreground/55">
                          {item.sets}×{item.reps}
                          {item.load ? ` · ${item.load}` : ""}
                        </p>
                      </div>
                      <ChevronDown className="size-4 text-foreground/55 shrink-0" />
                    </button>
                  </li>
                );
              }

              // Demais itens (passados ou futuros): compacto e dimmed
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setActiveItemIdx(idx)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                      isPast
                        ? "border-white/5 bg-background/30 opacity-60 hover:opacity-90"
                        : "border-white/5 bg-background/40 hover:border-primary/30"
                    }`}
                  >
                    <span
                      className={`grid size-7 place-items-center rounded-md text-xs font-bold shrink-0 ${
                        isPast
                          ? "bg-white/5 text-foreground/55"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {item.position}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-foreground/55 shrink-0">
                      {item.sets}×{item.reps}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Card>
  );
}
