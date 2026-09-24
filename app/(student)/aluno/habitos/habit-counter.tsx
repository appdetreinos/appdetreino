"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Sparkles } from "lucide-react";
import { safeLog } from "@/lib/log/safe";

type HabitCounterProps = {
  habitId: string;
  name: string;
  icon: string | null;
  target: number;
  unit: string;
  current: number;
};

export function HabitCounter({
  habitId,
  name,
  icon,
  target,
  unit,
  current: initialCurrent,
}: HabitCounterProps) {
  const [current, setCurrent] = useState(initialCurrent);
  const [pending, startTransition] = useTransition();

  function delta(amount: number) {
    const next = Math.max(0, current + amount);
    setCurrent(next); // otimista
    startTransition(async () => {
      try {
        const res = await fetch("/api/me/habit-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ habit_id: habitId, count: next }),
        });
        if (!res.ok) {
          setCurrent(current); // reverte
          safeLog.warn("[habit-log] save failed", { status: res.status });
        }
      } catch (e) {
        setCurrent(current);
        safeLog.error("[habit-log] error", e instanceof Error ? e.message : "unknown");
      }
    });
  }

  const pct = Math.min(100, (current / target) * 100);
  const done = current >= target;

  return (
    <Card className={`bg-card p-4 ${done ? "border-emerald-500/40" : "border-white/5"}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="text-2xl">{icon ?? "✨"}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{name}</div>
          <div className="text-xs text-muted-foreground">
            {current.toFixed(unit === "h" || unit === "L" ? 2 : 0)} / {target} {unit}
          </div>
        </div>
        {done && <Sparkles className="size-5 text-emerald-500" />}
      </div>

      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
        <div
          className={`h-full transition-all ${done ? "bg-emerald-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => delta(-1)}
          disabled={pending || current <= 0}
          aria-label="Diminuir"
          className="min-h-[44px] min-w-[44px]"
        >
          <Minus className="size-4" />
        </Button>
        <Button
          size="sm"
          onClick={() => delta(1)}
          disabled={pending}
          aria-label="Aumentar"
          className="min-h-[44px] min-w-[44px]"
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </Card>
  );
}
