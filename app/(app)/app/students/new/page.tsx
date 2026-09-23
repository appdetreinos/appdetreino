"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Copy, MessageCircle, Check, Dumbbell } from "lucide-react";
import { csrfFetch } from "@/lib/security/client";

/**
 * Form de criação de aluno — gera invite_code e mostra link de convite
 * pro trainer compartilhar no WhatsApp.
 */
export default function NewStudentPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ code: string; fullName: string; phone: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const full_name = String(form.get("full_name") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim() || null;
    const goal = String(form.get("goal") ?? "").trim() || null;
    const notes = String(form.get("notes") ?? "").trim() || null;
    const amountRaw = String(form.get("monthly_amount") ?? "").replace(",", ".").trim();
    const monthly_amount = amountRaw ? Number(amountRaw) : null;
    const first_due_date = String(form.get("first_due_date") ?? "").trim() || null;

    if (!full_name) {
      setError("Nome é obrigatório.");
      setSubmitting(false);
      return;
    }
    if (monthly_amount != null && (!Number.isFinite(monthly_amount) || monthly_amount <= 0)) {
      setError("Valor da mensalidade inválido.");
      setSubmitting(false);
      return;
    }

    const res = await csrfFetch("/api/me/student-invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name, phone, goal, notes, monthly_amount, first_due_date }),
    });
    const json = (await res.json().catch(() => null)) as
      | { ok: boolean; code?: string; full_name?: string; phone?: string | null; error?: string }
      | null;

    if (!res.ok || !json?.ok || !json.code) {
      setError(json?.error ?? "Não deu pra criar o convite. Tenta de novo.");
      setSubmitting(false);
      return;
    }

    setResult({
      code: json.code,
      fullName: json.full_name ?? full_name,
      phone: json.phone ?? phone,
    });
    setSubmitting(false);
    startTransition(() => router.refresh());
  }

  const inviteUrl = result
    ? `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${result.code}`
    : "";

  const whatsappMessage = result
    ? encodeURIComponent(
        `Fala, ${result.fullName.split(" ")[0]}! Bora treinar junto no painel.\nAcessa aqui e cadastra: ${inviteUrl}`,
      )
    : "";

  if (result) {
    return (
      <div className="min-h-screen">
        <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
          <div className="px-6 h-16 flex items-center justify-between">
            <h1 className="text-xl font-bold">Convite criado</h1>
            <Link href="/app/students" className="text-foreground/70 hover:text-foreground text-sm font-semibold">
              Fechar ✕
            </Link>
          </div>
        </header>
        <main className="p-6 max-w-2xl mx-auto">
          <Card className="bg-card/80 border-white/10 p-8 text-center">
            <div className="grid size-14 place-items-center rounded-full bg-emerald-500/10 text-emerald-500 mx-auto">
              <Check className="size-7" />
            </div>
            <h2 className="mt-4 text-2xl font-bold">Pronto, {result.fullName.split(" ")[0]}!</h2>
            <p className="mt-2 text-foreground/65">
              Manda o convite no WhatsApp pra {result.fullName} entrar.
            </p>

            <div className="mt-6 rounded-xl border border-white/10 bg-background/60 p-4 text-left">
              <Label className="text-xs uppercase tracking-wider text-foreground/65">
                Código
              </Label>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 text-2xl font-extrabold tracking-widest num text-primary">
                  {result.code}
                </code>
                <button
                  type="button"
                  onClick={() => copy(inviteUrl, setCopied)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs hover:border-primary/40 transition-colors"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "Copiado" : "Copiar link"}
                </button>
              </div>
              <p className="mt-3 text-xs text-foreground/65 break-all">{inviteUrl}</p>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {result.phone && (
                <a
                  href={`https://wa.me/55${result.phone.replace(/\D/g, "")}?text=${whatsappMessage}`}
                  target="_blank"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
                >
                  <MessageCircle className="size-4" />
                  Mandar no WhatsApp
                </a>
              )}
              <ButtonLink href="/app/workouts/new" className="w-full font-semibold">
                <Dumbbell className="size-4" />
                Montar treino agora
              </ButtonLink>
              <div className="grid grid-cols-2 gap-3">
                <ButtonLink href="/app/students" variant="outline">
                  Ver alunos
                </ButtonLink>
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/10 px-4 py-3 text-sm font-semibold text-foreground/70 hover:border-primary/40 hover:text-foreground transition-colors"
                >
                  Convidar outro
                </button>
              </div>
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
          <Link href="/app/students" className="text-foreground/70 hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-xl font-bold">Novo aluno</h1>
        </div>
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        <Card className="bg-card/80 border-white/10 p-6 sm:p-8">
          <p className="text-sm text-foreground/65 mb-6">
            Cria o convite e manda o link no WhatsApp. Quando o aluno clicar, ele se cadastra e entra
            no painel sozinho.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="full_name">Nome completo</Label>
              <Input
                id="full_name"
                name="full_name"
                required
                placeholder="Ana Beatriz Silva"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="phone">WhatsApp (com DDD)</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="11999998888"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="goal">Objetivo principal</Label>
              <Input
                id="goal"
                name="goal"
                placeholder="Emagrecer, ganhar massa, performance…"
                className="mt-1.5"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="monthly_amount">Mensalidade (R$)</Label>
                <Input
                  id="monthly_amount"
                  name="monthly_amount"
                  inputMode="decimal"
                  placeholder="149,90"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="first_due_date">1º vencimento</Label>
                <Input
                  id="first_due_date"
                  name="first_due_date"
                  type="date"
                  className="mt-1.5"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Opcional: a primeira cobrança é criada sozinha quando o aluno aceitar o convite.
            </p>

            <div>
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Lesão, restrição, preferência de horário…"
                className="mt-1.5"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <ButtonLink href="/app/students" variant="outline">
                Cancelar
              </ButtonLink>
              <Button type="submit" disabled={submitting || pending} className="font-semibold">
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Criando…
                  </>
                ) : (
                  "Criar convite"
                )}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}

async function copy(text: string, onCopied: (v: boolean) => void) {
  try {
    await navigator.clipboard.writeText(text);
    onCopied(true);
    setTimeout(() => onCopied(false), 2000);
  } catch {
    // Fallback pra mobile/iframes
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      onCopied(true);
      setTimeout(() => onCopied(false), 2000);
    } catch {
      // ignore
    } finally {
      document.body.removeChild(ta);
    }
  }
}
