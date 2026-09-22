"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Check, Mail, UserPlus, RefreshCw } from "lucide-react";
import { csrfFetch } from "@/lib/security/client";

/**
 * Card de recuperação — aparece quando o trainer tem convite parado.
 * Oferece 2 ações:
 *   1. "Re-sincronizar agora" — chama /api/trainer/resync-invites pra
 *      varrer todos os invites pending e casar por email. Cria
 *      student_profile automaticamente se encontrar match.
 *   2. "Vincular manualmente" — form pra trainer digitar email do aluno
 *      e vincular diretamente.
 */
export function ClaimStudentForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resyncing, setResyncing] = useState(false);
  const [resyncMsg, setResyncMsg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleResync() {
    setResyncing(true);
    setResyncMsg(null);
    try {
      const res = await csrfFetch("/api/trainer/resync-invites", { method: "POST" });
      const json = (await res.json().catch(() => null)) as
        | { ok: boolean; error?: string; synced?: number; message?: string }
        | null;
      if (!res.ok || !json?.ok) {
        setResyncMsg(json?.error ?? "Falha ao re-sincronizar.");
      } else {
        setResyncMsg(json.message ?? `${json.synced ?? 0} sincronizado(s).`);
        startTransition(() => router.refresh());
      }
    } catch (e) {
      setResyncMsg(`Erro: ${String(e)}`);
    } finally {
      setResyncing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const full_name = String(form.get("full_name") ?? "").trim();

    if (!email || !full_name) {
      setError("Preencha e-mail e nome.");
      setSubmitting(false);
      return;
    }

    const res = await csrfFetch("/api/trainer/claim-student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, full_name }),
    });
    const json = (await res.json().catch(() => null)) as
      | { ok: boolean; error?: string; full_name?: string; email?: string }
      | null;

    if (!res.ok || !json?.ok) {
      setError(json?.error ?? "Não deu pra vincular. Tenta de novo.");
      setSubmitting(false);
      return;
    }

    setSuccess(`${json.full_name ?? full_name} vinculado(a) com sucesso!`);
    setSubmitting(false);
    startTransition(() => {
      router.refresh();
      setTimeout(() => setOpen(false), 1500);
    });
  }

  if (!open) {
    return (
      <Card className="bg-amber-500/5 border-amber-500/30 p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-amber-500/15 text-amber-500 shrink-0">
            <AlertCircle className="size-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-foreground">Convite parado?</h3>
            <p className="mt-1 text-sm text-foreground/70">
              Teve algum problema na hora do aluno aceitar? Tenta re-sincronizar —
              o sistema vai casar o e-mail dos convites pendentes com os alunos
              que já se cadastraram.
            </p>
            {resyncMsg && (
              <p className="mt-2 text-xs text-foreground/65 rounded-md bg-background/40 px-2 py-1.5">
                {resyncMsg}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Button
              variant="default"
              size="sm"
              onClick={handleResync}
              disabled={resyncing || pending}
              className="font-semibold"
            >
              {resyncing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Re-sincronizar agora
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(true)}
              className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
            >
              <UserPlus className="size-4" />
              Vincular manualmente
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-amber-500/5 border-amber-500/30 p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="grid size-10 place-items-center rounded-xl bg-amber-500/15 text-amber-500 shrink-0">
          <Mail className="size-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-foreground">Vincular aluno manualmente</h3>
          <p className="mt-1 text-sm text-foreground/70">
            Pede pro aluno te mandar o e-mail que ele usou no cadastro. Depois preenche aqui:
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="shrink-0">
          Cancelar
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="claim-email">E-mail do aluno</Label>
          <Input
            id="claim-email"
            name="email"
            type="email"
            required
            placeholder="aluno@email.com"
            className="mt-1.5"
            autoComplete="off"
          />
        </div>
        <div>
          <Label htmlFor="claim-name">Nome que vai aparecer pro aluno</Label>
          <Input
            id="claim-name"
            name="full_name"
            type="text"
            required
            placeholder="Como o aluno quer ser chamado"
            className="mt-1.5"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-500 flex items-center gap-2">
            <Check className="size-4" />
            {success}
          </div>
        )}

        <Button type="submit" disabled={submitting || pending} className="font-semibold">
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Vinculando…
            </>
          ) : (
            <>
              <UserPlus className="size-4" />
              Vincular aluno
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}
