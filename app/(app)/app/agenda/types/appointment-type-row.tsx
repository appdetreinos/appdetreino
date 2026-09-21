"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Power } from "lucide-react";
import { safeLog } from "@/lib/log/safe";
import { csrfFetch } from "@/lib/security/client";

type AppointmentType = {
  id: string;
  name: string;
  duration_minutes: number;
  type: string;
  price_cents: number | null;
  color: string;
  active: boolean;
};

export function AppointmentTypeRow({ type }: { type: AppointmentType }) {
  const [active, setActive] = useState(type.active);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !active;
    setActive(next); // otimista
    startTransition(async () => {
      try {
        const res = await csrfFetch(`/api/me/appointment-types/${type.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: next }),
        });
        if (!res.ok) {
          setActive(!next); // reverte
          safeLog.warn("[appointment-type] toggle failed", { status: res.status });
        }
      } catch (e) {
        setActive(!next);
        safeLog.error("[appointment-type] toggle error", e instanceof Error ? e.message : "unknown");
      }
    });
  }

  const priceLabel =
    type.price_cents == null
      ? "Grátis"
      : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
          type.price_cents / 100,
        );

  return (
    <Card className="bg-card border-white/5 p-4 flex items-center gap-3">
      <span
        className="size-3 rounded-full shrink-0"
        style={{ backgroundColor: type.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold truncate">{type.name}</span>
          <Badge variant="outline" className="text-xs shrink-0">
            {type.type}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {type.duration_minutes} min · {priceLabel}
        </div>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-label={active ? "Desativar" : "Ativar"}
        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
          active ? "bg-emerald-500" : "bg-zinc-700"
        }`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white transition-transform ${
            active ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </Card>
  );
}
