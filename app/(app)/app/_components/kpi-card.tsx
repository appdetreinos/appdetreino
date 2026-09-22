"use client";

import { Card } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/stagger";

/**
 * KPI com count-up animado (CSS + requestAnimationFrame, sem motion).
 * Migrado pra não usar motion/react (motion v13.4.0 quebra com Next 16
 * + React 19 — ref 3162866030 no /app).
 *
 * É client component porque AnimatedNumber usa useState/useEffect.
 *
 * IMPORTANTE: Server→Client boundary do App Router rejeita functions como
 * props. Por isso NÃO aceitamos `format: (n) => string`. Pra formatar
 * moeda/porcentagem, use `formatKind: "currency" | "percent"` (string
 * enum serializável). Pra texto custom, passe `prefix` + `suffix`.
 */

const FORMATS = {
  raw: (n: number) => Math.round(n).toString(),
  currency: (n: number) =>
    n.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }),
  percent: (n: number) => `${Math.round(n)}%`,
} as const;

export function KpiCard({
  icon: Icon,
  label,
  value,
  formatKind = "raw",
  prefix,
  suffix,
  badge,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  formatKind?: keyof typeof FORMATS;
  prefix?: string;
  suffix?: string;
  badge?: React.ReactNode;
  hint?: string;
}) {
  const format = FORMATS[formatKind];
  return (
    <Card className="bg-card/80 border-white/10 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
          <Icon className="size-4" />
        </div>
        {badge}
      </div>
      <div className="mt-3 text-2xl font-extrabold tracking-tight tabular-nums">
        {prefix && <span>{prefix}</span>}
        <AnimatedNumber value={value} format={format} />
        {suffix && <span className="ml-1 text-base font-semibold">{suffix}</span>}
      </div>
      <div className="text-xs text-foreground/65">{label}</div>
      {hint && <div className="mt-2 text-[11px] text-foreground/55">{hint}</div>}
    </Card>
  );
}
