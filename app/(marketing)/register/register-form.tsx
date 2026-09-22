"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function RegisterForm() {
  return (
    <Suspense fallback={null}>
      <RegisterFormInner />
    </Suspense>
  );
}

function RegisterFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const inviteParam = searchParams.get("invite")?.toUpperCase() ?? null;

  // Convite de aluno: pré-preenche o nome (se vier do invite) e a role
  const inviteNameHint = searchParams.get("name") ?? "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingEmailConfirm, setAwaitingEmailConfirm] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const fullName = String(form.get("fullName") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (!fullName || !email || password.length < 6) {
      setError("Preencha tudo. Senha precisa ter pelo menos 6 caracteres.");
      setLoading(false);
      return;
    }

    // role — "trainer" (padrão, vindo da LP) ou "student" (via ?invite=)
    const role: "trainer" | "student" = roleParam === "student" ? "student" : "trainer";

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });

    if (signUpError) {
      const msg = signUpError.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("user already")) {
        setError("Esse e-mail já tem conta. Tenta entrar.");
      } else if (msg.includes("password") && msg.includes("6")) {
        setError("Senha precisa ter pelo menos 6 caracteres.");
      } else if (msg.includes("rate limit")) {
        setError("Muitas tentativas. Espera um minutinho.");
      } else {
        setError("Não deu pra criar a conta. Tenta de novo.");
      }
      setLoading(false);
      return;
    }

    if (data.user && !data.session) {
      setAwaitingEmailConfirm(true);
      setLoading(false);
      return;
    }

    // Se for aluno com convite aceito, vincula ao trainer via RPC
    if (role === "student" && inviteParam) {
      const { error: rpcError } = await supabase.rpc("accept_invite", {
        invite_code: inviteParam,
      });
      if (rpcError) {
        // Não bloqueia — usuário entra, mas sem vínculo. Mostra erro leve.
        console.error("accept_invite error:", rpcError);
      }
      router.push(
        `/boas-vindas?name=${encodeURIComponent(fullName)}&email=${encodeURIComponent(email)}&role=student`
      );
      router.refresh();
      return;
    }

    // Trainer novo → tela de boas-vindas com credenciais + CTA pro painel
    router.push(
      `/boas-vindas?name=${encodeURIComponent(fullName)}&email=${encodeURIComponent(email)}&role=trainer`
    );
    router.refresh();
  }

  if (awaitingEmailConfirm) {
    return (
      <div className="mt-8 rounded-xl border border-white/10 bg-card/60 p-6 text-center">
        <MailCheck className="mx-auto size-10 text-primary" />
        <h3 className="mt-4 text-lg font-bold">Confere teu e-mail</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Mandamos um link de confirmação pra você. Clica nele pra ativar a conta e depois
          volta aqui pra entrar.
        </p>
        <Button
          variant="outline"
          className="mt-5"
          onClick={() => router.push("/login")}
        >
          Ir pra tela de entrar
        </Button>
      </div>
    );
  }

  const isStudentInvite = roleParam === "student" && inviteParam;

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      {isStudentInvite && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
          Você foi convidado(a). Confirma teu nome e cria tua senha.
        </div>
      )}

      <div>
        <Label htmlFor="fullName">Seu nome</Label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          placeholder="Bruno Silva"
          defaultValue={inviteNameHint}
          required
          className="mt-1.5"
        />
      </div>
      <div>
        <Label htmlFor="email">E-mail profissional</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@seudominio.com"
          required
          className="mt-1.5"
        />
      </div>
      <div>
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="mín. 6 caracteres"
          required
          minLength={6}
          className="mt-1.5"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full font-semibold h-11 mt-2">
        {loading ? <Loader2 className="size-4 animate-spin" /> : "Criar conta grátis"}
      </Button>

      {!isStudentInvite && (
        <p className="text-xs text-muted-foreground text-center pt-2">
          3 dias grátis. Não pedimos cartão.
        </p>
      )}
    </form>
  );
}
