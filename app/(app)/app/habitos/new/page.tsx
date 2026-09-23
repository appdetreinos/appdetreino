"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ButtonLink } from "@/components/ui/button-link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type StudentOption = { id: string; name: string };

export default function NewHabitPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentOption[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("student_profiles")
        .select("user_id, full_name")
        .eq("trainer_id", user.id)
        .eq("status", "active")
        .order("full_name");
      setStudents(
        (data ?? []).map((s) => ({
          id: s.user_id as string,
          name: (s.full_name as string) ?? "Aluno",
        })),
      );
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const student_id = String(form.get("student_id") ?? "").trim();
    const target_count = Number(form.get("target_count") ?? 1) || 1;
    const unit = String(form.get("unit") ?? "").trim() || null;
    const icon = String(form.get("icon") ?? "").trim() || null;

    if (!name || !student_id) {
      setError("Nome do hábito e aluno são obrigatórios.");
      setSubmitting(false);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessão expirada. Entra de novo.");
      setSubmitting(false);
      return;
    }
    const { error: insertError } = await supabase.from("habits").insert({
      trainer_id: user.id,
      name,
      student_id,
      target_count,
      unit,
      icon,
    });

    if (insertError) {
      setError("Não deu pra criar o hábito. Tenta de novo.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    startTransition(() => {
      router.push("/app/habitos");
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center gap-3">
          <Link href="/app/habitos" className="text-foreground/70 hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-xl font-bold">Novo hábito</h1>
        </div>
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        <Card className="bg-card/80 border-white/10 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="student_id">Aluno</Label>
              <select
                id="student_id"
                name="student_id"
                required
                className="mt-1.5 w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm"
              >
                <option value="">Seleciona o aluno…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="name">Nome do hábito</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="Ex: Beber 3L de água, Dormir 8h"
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="target_count">Meta diária</Label>
                <Input
                  id="target_count"
                  name="target_count"
                  type="number"
                  min={1}
                  defaultValue={1}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="unit">Unidade (opcional)</Label>
                <Input id="unit" name="unit" placeholder="L, h, passos" className="mt-1.5" />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <ButtonLink href="/app/habitos" variant="outline">
                Cancelar
              </ButtonLink>
              <Button type="submit" disabled={submitting || pending} className="font-semibold">
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Criando…
                  </>
                ) : (
                  "Criar hábito"
                )}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
