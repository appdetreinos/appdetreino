"use client";

import { useState, useTransition } from "react";
import { safeLog } from "@/lib/log/safe";

type Item = {
  id: string;
  food_name: string;
  total_grams: number;
  category: string | null;
  checked: boolean;
};

export function ShoppingItemRow({ item }: { item: Item }) {
  const [checked, setChecked] = useState(item.checked);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !checked;
    setChecked(next); // otimista
    startTransition(async () => {
      try {
        const res = await fetch(`/api/me/shopping-items/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checked: next }),
        });
        if (!res.ok) {
          setChecked(!next);
          safeLog.warn("[shopping-item] toggle failed", { status: res.status });
        }
      } catch (e) {
        setChecked(!next);
        safeLog.error("[shopping-item] error", e instanceof Error ? e.message : "unknown");
      }
    });
  }

  return (
    <label className="flex items-center gap-3 p-3 border-b border-white/5 last:border-0 cursor-pointer hover:bg-muted/20 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={toggle}
        disabled={pending}
        className="size-4 accent-primary shrink-0"
      />
      <span
        className={`flex-1 text-sm ${checked ? "line-through text-muted-foreground" : ""}`}
      >
        {item.food_name}
      </span>
      <span className="text-xs text-muted-foreground font-mono shrink-0">
        {Math.round(Number(item.total_grams))}g
      </span>
    </label>
  );
}
