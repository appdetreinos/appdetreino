"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check } from "lucide-react";
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
  const [rememberMe, setRememberMe] = useState(true);
  // Otimista: depois do signIn OK, mostramos "logado ✓" por ~150ms
  // enquanto o router.refresh() revalida server-side. Sensação de
  // velocidade sem mudar o tempo real.
  const [success, setSuccess] = useState(false);

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

    // Sucesso: mostra confirmação visual por um instante antes do redirect.
    setSuccess(true);
    // Pequeno delay pra dar tempo do cookie persistir e do server revalidar.
    setTimeout(() => {
      router.push(redirectTo);
      router.refresh();
    }, 220);
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {success ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="mt-8 flex flex-col items-center gap-3 py-12"
        >
          <span className="grid size-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
            <Check className="size-6" />
          </span>
          <p className="text-sm font-semibold">Logado! Entrando no painel…</p>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onSubmit={handleSubmit}
          className="mt-8 space-y-4"
        >
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

          {/* Lembrar-me — padrão ON. Desmarcar pra sessão "desta aba só". */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="size-4 rounded border-white/20 bg-background accent-primary"
            />
            <span className="text-sm text-foreground/85">Manter conectado por 30 dias</span>
          </label>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full font-semibold h-11 mt-2">
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Entrando…
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
