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
import { ArrowLeft, Loader2, Copy, MessageCircle, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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

    if (!full_name) {
      setError("Nome é obrigatório.");
      setSubmitting(false);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessão expirou. Faz login de novo.");
      setSubmitting(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("student_invites")
      .insert({
        trainer_id: user.id,
        full_name,
        phone,
        goal,
        notes,
        status: "pending",
      })
      .select("code, full_name, phone")
      .single();

    if (insertError || !data) {
      // Mensagens em PT-BR pros erros mais comuns — sem expor detalhes técnicos
      const raw = (insertError?.message ?? "").toLowerCase();
      let friendly: string;
      if (raw.includes("foreign key") && raw.includes("trainer_profiles")) {
        friendly =
          "Tua conta de profissional não tá totalmente configurada ainda. Sai e entra de novo, ou fala com o suporte se persistir.";
      } else if (raw.includes("foreign key")) {
        friendly = "Não deu pra criar o convite. Verifica se teu perfil tá completo.";
      } else if (raw.includes("duplicate")) {
        friendly = "Já existe um convite com esses dados.";
      } else {
        friendly = "Não deu pra criar o convite. Tenta de novo.";
      }
      setError(friendly);
      setSubmitting(false);
      return;
    }

    setResult({ code: data.code, fullName: data.full_name, phone: data.phone });
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
          <div className="px-6 h-16 flex items-center">
            <h1 className="text-xl font-bold">Convite criado</h1>
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
              <button
                type="button"
                onClick={() => setResult(null)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/10 px-4 py-3 text-sm font-semibold text-foreground/70 hover:border-primary/40 hover:text-foreground transition-colors"
              >
                Convidar outro
              </button>
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
