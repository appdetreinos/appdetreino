"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeLog } from "@/lib/log/safe";

/**
 * Form de recuperação de senha.
 *
 * UX: sempre responde a mesma coisa ("Se o e-mail existir, enviaremos um link").
 * Anti-enumeração: nunca diz "e-mail não encontrado".
 */
export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });
        // Ignora erros específicos — sempre sucesso na UX
        if (!res.ok) {
          safeLog.warn("[forgot-password] non-2xx", { status: res.status });
        }
      } catch (e) {
        safeLog.error("[forgot-password] fetch failed", e instanceof Error ? e.message : "unknown");
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm">
        <p className="font-medium">Se o e-mail existir, enviaremos um link.</p>
        <p className="text-muted-foreground mt-1">
          Verifique sua caixa de entrada e o spam.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          disabled={pending}
        />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Enviando..." : "Enviar link"}
      </Button>
    </form>
  );
}
