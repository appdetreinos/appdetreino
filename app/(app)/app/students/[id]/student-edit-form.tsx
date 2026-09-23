"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Pencil, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type StudentEditInitial = {
  fullName: string;
  phone: string;
  goal: string;
  status: string;
};

/**
 * Edição dos dados do aluno (nome, WhatsApp, objetivo, status).
 * RLS: trainer edita perfis dos próprios alunos (0055 + trainer_modify).
 */
export function StudentEditForm({
  studentId,
  initial,
}: {
  studentId: string;
  initial: StudentEditInitial;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const full_name = String(form.get("full_name") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim() || null;
    const goal = String(form.get("goal") ?? "").trim() || null;
    const status = String(form.get("status") ?? "active");

    if (full_name.length < 2) {
      setError("Nome muito curto.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase.from("profiles").update({ full_name, phone }).eq("id", studentId),
        supabase
          .from("student_profiles")
          .update({ full_name, phone, goal, status })
          .eq("user_id", studentId),
      ]);
      if (e1 || e2) {
        setError("Não deu pra salvar. Tenta de novo.");
      } else {
        setOpen(false);
        router.refresh();
      }
    } catch {
      setError("Falha de conexão.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="font-semibold">
        <Pencil className="size-4" />
        Editar dados
      </Button>
    );
  }

  return (
    <Card className="bg-card border-white/10 p-5 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Editar dados</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Fechar edição"
        >
          <X className="size-4" />
        </button>
      </div>
      <form onSubmit={save} className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="edit-name">Nome completo</Label>
          <Input id="edit-name" name="full_name" defaultValue={initial.fullName} required className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="edit-phone">WhatsApp</Label>
          <Input id="edit-phone" name="phone" defaultValue={initial.phone} placeholder="11999998888" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="edit-goal">Objetivo</Label>
          <Input id="edit-goal" name="goal" defaultValue={initial.goal} placeholder="Emagrecer, hipertrofia…" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="edit-status">Status</Label>
          <select
            id="edit-status"
            name="status"
            defaultValue={initial.status}
            className="mt-1.5 w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm"
          >
            <option value="active">Ativo</option>
            <option value="paused">Pausado</option>
            <option value="inactive">Inativo</option>
          </select>
        </div>
        {error && (
          <p className="sm:col-span-2 text-sm text-destructive">{error}</p>
        )}
        <div className="sm:col-span-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving} className="font-semibold">
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
