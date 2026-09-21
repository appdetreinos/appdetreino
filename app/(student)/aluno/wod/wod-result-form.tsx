"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { safeLog } from "@/lib/log/safe";

export function WodResultForm({ wodId }: { wodId: string }) {
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"time" | "rounds">("time");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    let result_time_seconds: number | null = null;
    let result_rounds: number | null = null;

    if (mode === "time") {
      const min = Number(formData.get("minutes") ?? 0);
      const sec = Number(formData.get("seconds") ?? 0);
      if (!Number.isFinite(min) || !Number.isFinite(sec) || min < 0 || sec < 0 || sec >= 60) {
        setError("Tempo inválido");
        return;
      }
      result_time_seconds = min * 60 + sec;
    } else {
      const rounds = Number(formData.get("rounds") ?? 0);
      if (!Number.isFinite(rounds) || rounds < 0 || rounds > 10000) {
        setError("Rounds inválido");
        return;
      }
      result_rounds = rounds;
    }

    const notes = (formData.get("notes") as string | null)?.trim() || null;

    startTransition(async () => {
      try {
        const res = await fetch("/api/me/wod-result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wod_id: wodId,
            result_time_seconds,
            result_rounds,
            result_notes: notes,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          setError(body?.error ?? "Erro ao salvar");
          return;
        }
        if (typeof window !== "undefined") window.location.reload();
      } catch (e) {
        safeLog.error("[wod-result] submit failed", e instanceof Error ? e.message : "unknown");
        setError("Falha de conexão");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("time")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "time" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          For Time
        </button>
        <button
          type="button"
          onClick={() => setMode("rounds")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "rounds" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          AMRAP
        </button>
      </div>

      {mode === "time" ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="minutes" className="text-xs">Minutos</Label>
            <Input id="minutes" name="minutes" type="number" min={0} max={999} defaultValue={5} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="seconds" className="text-xs">Segundos</Label>
            <Input id="seconds" name="seconds" type="number" min={0} max={59} defaultValue={0} />
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <Label htmlFor="rounds" className="text-xs">Rounds completados</Label>
          <Input id="rounds" name="rounds" type="number" min={0} max={10000} defaultValue={0} />
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="notes" className="text-xs">Notas (opcional)</Label>
        <Textarea
          id="notes"
          name="notes"
          maxLength={500}
          placeholder="Como foi?"
          rows={2}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Salvando..." : "Registrar resultado"}
      </Button>
    </form>
  );
}
