"use client";

import { useState, useTransition } from "react";
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

export default function NewWodPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<"amrap" | "for_time">("amrap");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim() || null;
    const scheduledFor = String(form.get("scheduled_for") ?? "").trim();

    if (!title || !scheduledFor) {
      setError("Título e data são obrigatórios.");
      setSubmitting(false);
      return;
    }

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("wods")
      .insert({
        title,
        description,
        scheduled_for: scheduledFor,
      })
      .select("id")
      .single();

    if (insertError || !data) {
      const raw = (insertError?.message ?? "").toLowerCase();
      let friendly = "Não deu pra criar o WOD. Tenta de novo.";
      if (raw.includes("duplicate") && raw.includes("wods_trainer_id_scheduled_for")) {
        friendly = "Já existe um WOD pra essa data. Apaga o antigo ou escolhe outra data.";
      } else if (raw.includes("foreign key")) {
        friendly = "Tua conta não tá totalmente configurada ainda. Sai e entra de novo.";
      }
      setError(friendly);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    startTransition(() => {
      router.push("/app/wod");
      router.refresh();
    });
  }

  // Default = hoje no fuso BR
  const todayBR = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center gap-3">
          <Link href="/app/wod" className="text-foreground/70 hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-xl font-bold">Novo WOD</h1>
        </div>
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        <Card className="bg-card/80 border-white/10 p-6 sm:p-8">
          <p className="text-sm text-foreground/65 mb-6">
            Cria um desafio pra turma treinar junto. O ranking sai no WhatsApp e o aluno registra o resultado direto no app.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label>Tipo</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType("amrap")}
                  className={`rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                    type === "amrap"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  AMRAP
                </button>
                <button
                  type="button"
                  onClick={() => setType("for_time")}
                  className={`rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                    type === "for_time"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  For Time
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                name="title"
                required
                placeholder={type === "amrap" ? "AMRAP 20 — Burpees" : "Franco 21-15-9"}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="scheduled_for">Data</Label>
              <Input
                id="scheduled_for"
                name="scheduled_for"
                type="date"
                required
                defaultValue={todayBR}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                name="description"
                rows={4}
                placeholder="Ex: 20 min AMRAP de: 10 burpees, 10 box jumps, 200m run…"
                className="mt-1.5"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <ButtonLink href="/app/wod" variant="outline">
                Cancelar
              </ButtonLink>
              <Button type="submit" disabled={submitting || pending} className="font-semibold">
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Criando…
                  </>
                ) : (
                  "Criar WOD"
                )}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
