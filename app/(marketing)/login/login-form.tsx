"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  return (
    <Suspense fallback={null}>
      <LoginFormInner />
    </Suspense>
  );
}

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/app";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (!email || !password) {
      setError("Preencha e-mail e senha.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Mensagens em PT-BR sem vazar detalhes técnicos
      const msg = signInError.message.toLowerCase();
      if (msg.includes("invalid login credentials")) {
        setError("E-mail ou senha incorretos.");
      } else if (msg.includes("email not confirmed")) {
        setError("Confere teu e-mail antes de entrar (link de confirmação).");
      } else if (msg.includes("rate limit")) {
        setError("Muitas tentativas. Espera um minutinho e tenta de novo.");
      } else {
        setError("Não deu pra entrar. Tenta de novo.");
      }
      setLoading(false);
      return;
    }

    // Força o server a reavaliar a sessão antes do redirect
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1.5"
          placeholder="voce@seudominio.com"
        />
      </div>
      <div>
        <div className="flex justify-between items-center">
          <Label htmlFor="password">Senha</Label>
          <Link href="/recuperar" className="text-xs text-primary hover:underline">
            Esqueci
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1.5"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full font-semibold h-11 mt-2">
        {loading ? <Loader2 className="size-4 animate-spin" /> : "Entrar"}
      </Button>
    </form>
  );
}
