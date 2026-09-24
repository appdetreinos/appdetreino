import Link from "next/link";
import { LoginForm } from "./login-form";
import { Logo } from "../_components/logo";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/5">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center">
          <Logo />
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-extrabold tracking-tight">Entrar na conta</h1>
          <p className="mt-2 text-muted-foreground">Acesse teu painel de consultoria.</p>
          <LoginForm />
          <p className="mt-6 text-sm text-muted-foreground text-center">
            Ainda não tem conta?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Criar grátis
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
