"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { safeLog } from "@/lib/log/safe";

/**
 * Botão "Check-in" do exercício do dia.
 * Insere em workout_sessions (uma sessão por workout + date).
 */
export function CheckInButton({ workoutId, itemId }: { workoutId: string; itemId: string }) {
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/me/workout-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workout_id: workoutId }),
        });
        if (!res.ok) {
          safeLog.warn("[check-in] failed", { status: res.status });
          return;
        }
        setDone(true);
      } catch (e) {
        safeLog.error("[check-in] error", e instanceof Error ? e.message : "unknown");
      }
    });
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500">
        <Check className="size-4" />
        Feito
      </span>
    );
  }

  return (
    <Button
      onClick={onClick}
      disabled={pending}
      size="sm"
      variant="outline"
      className="shrink-0"
    >
      {pending ? "..." : "Check-in"}
    </Button>
  );
}
