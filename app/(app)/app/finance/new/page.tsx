"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Student {
  id: string;
  full_name: string;
}

export default function NewChargePage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoadingStudents(false);
        return;
      }
      // FILTRA por trainer_id — sem isso, trainer vê alunos de outros treinadores (privacy leak)
      const { data } = await supabase
        .from("student_profiles")
        .select("user_id, full_name")
        .eq("trainer_id", user.id)
        .eq("status", "active")
        .order("full_name");
      setStudents(
        (data ?? []).map((s) => ({ id: s.user_id, full_name: s.full_name ?? "Aluno" })),
      );
      setLoadingStudents(false);
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const studentId = String(form.get("student_id") ?? "");
    const amount = Number(form.get("amount") ?? 0);
    const dueDate = String(form.get("due_date") ?? "");
    const description = String(form.get("description") ?? "").trim() || null;

    if (!studentId || !amount || amount <= 0 || !dueDate) {
      setError("Preencha aluno, valor e vencimento.");
      setSubmitting(false);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessão expirou.");
      setSubmitting(false);
      return;
    }

    const { error: insErr } = await supabase.from("payments").insert({
      trainer_id: user.id,
      student_id: studentId,
      amount,
      due_date: dueDate,
      status: "pending",
      description,
      gateway: "pix_direto",
      billing_type: "PIX",
    });

    if (insErr) {
      setError(insErr.message);
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setSubmitting(false);
    startTransition(() => router.refresh());
  }

  if (success) {
    return (
      <div className="min-h-screen">
        <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
          <div className="px-6 h-16 flex items-center">
            <h1 className="text-xl font-bold">Cobrança criada</h1>
          </div>
        </header>
        <main className="p-6 max-w-md mx-auto">
          <Card className="bg-card/80 border-white/10 p-8 text-center">
            <div className="grid size-14 place-items-center rounded-full bg-emerald-500/10 text-emerald-500 mx-auto">
              <Check className="size-7" />
            </div>
            <h2 className="mt-4 text-xl font-bold">Pronto!</h2>
            <p className="mt-2 text-sm text-foreground/65">
              A cobrança foi criada. Vai em <strong className="text-foreground">Financeiro</strong>{" "}
              e clica em "Cobrar" pra disparar a mensagem no WhatsApp.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <ButtonLink href="/app/finance" className="font-semibold">
                Ir pro Financeiro
              </ButtonLink>
              <ButtonLink href="/app/finance/new" variant="outline">
                Criar outra
              </ButtonLink>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center gap-3">
          <Link href="/app/finance" className="text-foreground/70 hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-xl font-bold">Nova cobrança</h1>
        </div>
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        <Card className="bg-card/80 border-white/10 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="student_id">Aluno</Label>
              {loadingStudents ? (
                <div className="mt-1.5 flex items-center gap-2 text-sm text-foreground/65">
                  <Loader2 className="size-4 animate-spin" /> Carregando alunos…
                </div>
              ) : students.length === 0 ? (
                <p className="mt-1.5 text-sm text-foreground/65">
                  Você ainda não tem alunos ativos.{" "}
                  <Link href="/app/students/new" className="text-primary hover:underline">
                    Adiciona um aqui
                  </Link>
                  .
                </p>
              ) : (
                <select
                  id="student_id"
                  name="student_id"
                  required
                  className="mt-1.5 w-full h-11 rounded-md border border-white/10 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Seleciona um aluno</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="297.00"
                  required
                  className="mt-1.5 num"
                />
              </div>
              <div>
                <Label htmlFor="due_date">Vencimento</Label>
                <Input
                  id="due_date"
                  name="due_date"
                  type="date"
                  required
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Input
                id="description"
                name="description"
                placeholder="Mensalidade setembro"
                className="mt-1.5"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <ButtonLink href="/app/finance" variant="outline">
                Cancelar
              </ButtonLink>
              <Button type="submit" disabled={submitting || pending || students.length === 0} className="font-semibold">
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Criando…
                  </>
                ) : (
                  "Criar cobrança"
                )}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
