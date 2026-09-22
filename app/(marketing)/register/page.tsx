import Link from "next/link";
import { RegisterForm } from "./register-form";
import { Logo } from "../_components/logo";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/5">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center">
          <Logo />
        </div>
      </header>

      <main className="flex-1 grid lg:grid-cols-2">
        {/* Formulário */}
        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            {/* Badge que deixa claro que é conta de profissional */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
              <span className="size-1.5 rounded-full bg-primary" />
              Conta de profissional
            </span>

            <h1 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight">
              Cria sua conta grátis.
            </h1>
            <p className="mt-2 text-muted-foreground">
              Sem cartão, sem taxa. Você responde um quiz rápido e a gente te ajuda a escolher o plano certo.
            </p>

            <RegisterForm />

            <p className="mt-6 text-sm text-muted-foreground text-center">
              Já tem conta?{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Entrar
              </Link>
            </p>

            {/* Nota: alunos entram pelo link de convite */}
            <div className="mt-6 rounded-lg border border-white/5 bg-background/40 px-4 py-3 text-xs text-muted-foreground">
              <strong className="text-foreground/85">Você é aluno?</strong> Você não cria conta por aqui.{" "}
              <span className="text-foreground/75">
                Seu personal te envia um link de convite — abre ele pra começar.
              </span>
            </div>
          </div>
        </section>

        {/* Lado direito: prova + benefícios */}
        <aside className="hidden lg:flex items-center justify-center border-l border-white/5 bg-card/40 px-12 py-12">
          <div className="max-w-md">
            <h2 className="text-3xl font-extrabold tracking-tight">
              Por dentro do Viva FIT APP você vai:
            </h2>
            <ul className="mt-8 space-y-4 text-base">
              {[
                "Mandar treino e dieta direto no WhatsApp do aluno",
                "Cobrar mensalidade recorrente sem dar ruim",
                "Ver quem sumiu na 3ª semana antes de perder cliente",
                "Subir plano na hora sem mexer em planilha",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-primary text-xs font-bold">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-10 rounded-xl border border-white/5 bg-card p-5">
              <div className="flex items-center gap-1">
                {"★★★★★".split("").map((s, i) => (
                  <span key={i} className="text-primary text-lg">{s}</span>
                ))}
              </div>
              <p className="mt-3 text-sm leading-relaxed">
                "Antes eu perdia 6h por semana só mandando treino. Hoje eu mando 40 alunos em 4 minutos."
              </p>
              <p className="mt-3 text-xs text-muted-foreground">— Bruno, personal em SP</p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}