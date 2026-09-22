"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { csrfFetch } from "@/lib/security/client";

/**
 * Form de inserir medição pelo trainer.
 * Trainer pode inserir peso, % gordura, cintura, peito, quadril, braço, coxa.
 */
export function MeasurementForm({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      student_id: studentId,
      date: form.get("date") || new Date().toISOString().split("T")[0],
    };
    for (const field of ["weight_kg", "body_fat_pct", "waist_cm", "chest_cm", "hip_cm", "arm_cm", "thigh_cm"]) {
      const v = form.get(field);
      if (v !== null && v !== "") body[field] = Number(v);
    }
    const notes = form.get("notes");
    if (notes) body.notes = String(notes);

    try {
      const res = await csrfFetch("/api/me/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Erro ao salvar medição.");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      setOpen(false);
      startTransition(() => router.refresh());
    } catch {
      setError("Erro de rede.");
      setSubmitting(false);
    }
  }

  const todayBR = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="font-semibold"
      >
        <Plus className="size-4" />
        Nova medição
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 rounded-lg border border-white/10 bg-background/40 p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <Label htmlFor="m-date" className="text-xs">Data</Label>
          <Input id="m-date" name="date" type="date" defaultValue={todayBR} className="mt-1 num" />
        </div>
        <div>
          <Label htmlFor="m-weight" className="text-xs">Peso (kg)</Label>
          <Input id="m-weight" name="weight_kg" type="number" step="0.1" min="20" max="300" placeholder="75.5" className="mt-1 num" />
        </div>
        <div>
          <Label htmlFor="m-fat" className="text-xs">% Gordura</Label>
          <Input id="m-fat" name="body_fat_pct" type="number" step="0.1" min="1" max="60" placeholder="18.0" className="mt-1 num" />
        </div>
        <div>
          <Label htmlFor="m-waist" className="text-xs">Cintura (cm)</Label>
          <Input id="m-waist" name="waist_cm" type="number" step="0.1" min="40" max="200" placeholder="82" className="mt-1 num" />
        </div>
        <div>
          <Label htmlFor="m-chest" className="text-xs">Peito (cm)</Label>
          <Input id="m-chest" name="chest_cm" type="number" step="0.1" min="40" max="200" className="mt-1 num" />
        </div>
        <div>
          <Label htmlFor="m-hip" className="text-xs">Quadril (cm)</Label>
          <Input id="m-hip" name="hip_cm" type="number" step="0.1" min="40" max="200" className="mt-1 num" />
        </div>
        <div>
          <Label htmlFor="m-arm" className="text-xs">Braço (cm)</Label>
          <Input id="m-arm" name="arm_cm" type="number" step="0.1" min="15" max="80" className="mt-1 num" />
        </div>
        <div>
          <Label htmlFor="m-thigh" className="text-xs">Coxa (cm)</Label>
          <Input id="m-thigh" name="thigh_cm" type="number" step="0.1" min="25" max="100" className="mt-1 num" />
        </div>
      </div>
      <div>
        <Label htmlFor="m-notes" className="text-xs">Observações</Label>
        <Input id="m-notes" name="notes" maxLength={300} placeholder="Alguma nota…" className="mt-1" />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={submitting || pending} className="font-semibold">
          {submitting || pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Salvando…
            </>
          ) : (
            "Salvar medição"
          )}
        </Button>
      </div>
    </form>
  );
}
