"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ButtonLink } from "@/components/ui/button-link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Option = { id: string; name: string };
type StudentOption = { id: string; name: string };

export default function NewAppointmentPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [types, setTypes] = useState<Option[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: scopeData } = await supabase.rpc("trainer_scope_ids");
      const scopeIds = ((scopeData as string[] | null) ?? [user.id]) as string[];
      const [{ data: t }, { data: s }] = await Promise.all([
        supabase
          .from("appointment_types")
          .select("id, name")
          .in("trainer_id", scopeIds)
          .eq("active", true)
          .order("name"),
        supabase
          .from("student_profiles")
          .select("user_id, full_name")
          .in("trainer_id", scopeIds)
          .eq("status", "active")
          .order("full_name"),
      ]);
      setTypes((t ?? []).map((x) => ({ id: x.id as string, name: x.name as string })));
      setStudents(
        (s ?? []).map((x) => ({ id: x.user_id as string, name: (x.full_name as string) ?? "Aluno" })),
      );
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const starts_at = String(form.get("starts_at") ?? "").trim();
    const ends_at = String(form.get("ends_at") ?? "").trim();
    const appointment_type_id = String(form.get("appointment_type_id") ?? "").trim() || null;
    const student_id = String(form.get("student_id") ?? "").trim() || null;
    const location = String(form.get("location") ?? "").trim() || null;
    const notes = String(form.get("notes") ?? "").trim() || null;

    if (!title || !starts_at || !ends_at) {
      setError("Título, início e fim são obrigatórios.");
      setSubmitting(false);
      return;
    }
    if (new Date(ends_at) <= new Date(starts_at)) {
      setError("O fim precisa ser depois do início.");
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
    const { error: insertError } = await supabase.from("appointments").insert({
      trainer_id: user.id,
      title,
      starts_at: new Date(starts_at).toISOString(),
      ends_at: new Date(ends_at).toISOString(),
      appointment_type_id,
      student_id,
      location,
      notes,
    });

    if (insertError) {
      setError("Não deu pra criar o agendamento. Tenta de novo.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    startTransition(() => {
      router.push("/app/agenda");
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center gap-3">
          <Link href="/app/agenda" className="text-foreground/70 hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-xl font-bold">Novo agendamento</h1>
        </div>
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        <Card className="bg-card/80 border-white/10 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="title">Título</Label>
              <Input id="title" name="title" required placeholder="Ex: Avaliação inicial" className="mt-1.5" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="starts_at">Início</Label>
                <Input id="starts_at" name="starts_at" type="datetime-local" required className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="ends_at">Fim</Label>
                <Input id="ends_at" name="ends_at" type="datetime-local" required className="mt-1.5" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="appointment_type_id">Tipo (opcional)</Label>
                <select
                  id="appointment_type_id"
                  name="appointment_type_id"
                  className="mt-1.5 w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm"
                >
                  <option value="">Sem tipo…</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="student_id">Aluno (opcional)</Label>
                <select
                  id="student_id"
                  name="student_id"
                  className="mt-1.5 w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm"
                >
                  <option value="">Sem aluno…</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="location">Local / link (opcional)</Label>
              <Input id="location" name="location" placeholder="Studio, meet link…" className="mt-1.5" />
            </div>

            <div>
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea id="notes" name="notes" rows={3} className="mt-1.5" />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <ButtonLink href="/app/agenda" variant="outline">
                Cancelar
              </ButtonLink>
              <Button type="submit" disabled={submitting || pending} className="font-semibold">
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Criando…
                  </>
                ) : (
                  "Criar agendamento"
                )}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
