"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, X } from "lucide-react";
import { safeLog } from "@/lib/log/safe";
import { createClient } from "@/lib/supabase/client";

/**
 * Form de registro de medição.
 * Cliente Supabase com RLS — só insere se student_id = auth.uid().
 * Fotos (até 3) sobem pro bucket measurement-photos antes do POST.
 */
export function MeasurementForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const formEl = e.currentTarget;
    const formData = new FormData(formEl);

    const payload = {
      date: new Date().toISOString().split("T")[0],
      weight_kg: numOrNull(formData.get("weight_kg")),
      body_fat_pct: numOrNull(formData.get("body_fat_pct")),
      chest_cm: numOrNull(formData.get("chest_cm")),
      waist_cm: numOrNull(formData.get("waist_cm")),
      hip_cm: numOrNull(formData.get("hip_cm")),
      arm_cm: numOrNull(formData.get("arm_cm")),
      thigh_cm: numOrNull(formData.get("thigh_cm")),
      notes: stringOrNull(formData.get("notes")),
    };

    const files = (formEl.querySelector('input[name="photos"]') as HTMLInputElement | null)?.files;

    startTransition(async () => {
      try {
        // Upload das fotos primeiro (best-effort: sem foto não trava o resto)
        let photos_urls: string[] | null = null;
        if (files && files.length > 0) {
          setUploading(true);
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            const urls: string[] = [];
            for (const file of Array.from(files).slice(0, 3)) {
              const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
              const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
              const { error: upErr } = await supabase.storage
                .from("measurement-photos")
                .upload(path, file, { contentType: file.type || "image/jpeg" });
              if (!upErr) {
                const { data } = supabase.storage.from("measurement-photos").getPublicUrl(path);
                if (data?.publicUrl) urls.push(data.publicUrl);
              }
            }
            if (urls.length > 0) photos_urls = urls;
          }
          setUploading(false);
        }

        const res = await fetch("/api/me/measurements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, photos_urls }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          setError(body?.error ?? "Erro ao salvar");
          return;
        }
        setSuccess(true);
        setOpen(false);
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      } catch (e) {
        safeLog.error("[measurement-form] submit failed", e instanceof Error ? e.message : "unknown");
        setError("Falha de conexão");
        setUploading(false);
      }
    });
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
        <Plus className="size-4" />
        Nova medição
      </Button>
    );
  }

  return (
    <Card className="bg-card border-white/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Nova medição</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="size-4" />
        </button>
      </div>

      {error && <p className="text-sm text-destructive mb-3">{error}</p>}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field id="weight_kg" label="Peso (kg)" step="0.1" min={0} max={500} />
          <Field id="body_fat_pct" label="Gordura (%)" step="0.1" min={0} max={100} />
          <Field id="chest_cm" label="Peito (cm)" step="0.1" min={0} max={300} />
          <Field id="waist_cm" label="Cintura (cm)" step="0.1" min={0} max={300} />
          <Field id="hip_cm" label="Quadril (cm)" step="0.1" min={0} max={300} />
          <Field id="arm_cm" label="Braço (cm)" step="0.1" min={0} max={100} />
          <Field id="thigh_cm" label="Coxa (cm)" step="0.1" min={0} max={150} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notas (opcional)</Label>
          <Textarea
            id="notes"
            name="notes"
            maxLength={500}
            placeholder="Como você está se sentindo?"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="photos">Fotos de evolução (até 3)</Label>
          <Input id="photos" name="photos" type="file" accept="image/*" multiple />
          <p className="text-xs text-muted-foreground">Frente, lado e costas — pra comparar o antes/depois.</p>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending || uploading}>
            {pending || uploading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Field({
  id,
  label,
  ...props
}: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input id={id} name={id} type="number" inputMode="decimal" {...props} />
    </div>
  );
}

function numOrNull(v: FormDataEntryValue | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function stringOrNull(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}
