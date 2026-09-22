"use client";

import { Card } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/stagger";

/**
 * KPI com count-up animado (CSS + requestAnimationFrame, sem motion).
 * Migrado pra não usar motion/react (motion v13.4.0 quebra com Next 16
 * + React 19 — ref 3162866030 no /app).
 *
 * É client component porque AnimatedNumber usa useState/useEffect.
 */

export function KpiCard({
  icon: Icon,
  label,
  value,
  format,
  badge,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  format?: (n: number) => string;
  badge?: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card className="bg-card/80 border-white/10 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
          <Icon className="size-4" />
        </div>
        {badge}
      </div>
      <div className="mt-3 text-2xl font-extrabold tracking-tight tabular-nums">
        <AnimatedNumber value={value} format={format} />
      </div>
      <div className="text-xs text-foreground/65">{label}</div>
      {hint && <div className="mt-2 text-[11px] text-foreground/55">{hint}</div>}
    </Card>
  );
}
