import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = {
  title: "Recuperar senha — Viva FIT",
  description: "Receba um link pra redefinir sua senha.",
};

export default function RecuperarPage() {
  return (
    <main className="min-h-svh flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="bg-primary text-primary-foreground px-2 py-0.5 text-xs font-bold rounded">
              APP
            </span>
            <span className="text-xl font-semibold tracking-tight">Viva FIT</span>
          </Link>
        </div>

        <h1 className="text-2xl font-semibold mb-2">Esqueceu a senha?</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Se o e-mail estiver cadastrado, você receberá um link pra redefinir a senha.
        </p>

        <ForgotPasswordForm />

        <p className="text-center text-sm text-muted-foreground mt-6">
          Lembrou?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Voltar pro login
          </Link>
        </p>
      </div>
    </main>
  );
}
