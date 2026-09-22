import Link from "next/link";
import { ArrowLeft, Briefcase, User, ChevronRight } from "lucide-react";
import { Logo } from "../_components/logo";

/**
 * Página "Entrar" — segmentação profissional / aluno.
 *
 * Inspirada na Prime (estrutura de seleção), mas com tom próprio:
 *  - Saudação "Boas-vindas à Viva FIT APP" (não "à Prime")
 *  - Subtítulo com promessa dupla: pro profissional + pro aluno
 *  - Cards com chevron `>` no canto (igual Prime), mas com micro-animação
 *    de slide no hover
 *  - Glow laranja sutil no card do profissional (a "porta de entrada"
 *    principal do produto)
 *  - Botão de voltar pra landing
 *
 * Estrutura:
 *  - Header minimal: só Logo + Voltar
 *  - Saudação grande
 *  - 2 cards empilhados (mobile) / lado a lado (>=sm)
 *  - Footnote com trial
 */

export const metadata = {
  title: "Entrar · Viva FIT APP",
  description:
    "Escolha como você quer acessar a plataforma Viva FIT APP — como profissional ou como aluno.",
};

export default function EntrarPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-background">
      {/* Glow de fundo (mesma vibe do hero, mais sutil) */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 0%, rgba(255,107,53,0.18), transparent 45%), radial-gradient(circle at 100% 100%, rgba(255,107,53,0.08), transparent 50%)",
        }}
      />

      {/* Header minimal */}
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
        <Logo />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground/80 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>
      </div>

      {/* Conteúdo */}
      <div className="mx-auto flex max-w-3xl flex-col items-center px-5 pt-10 pb-16 sm:px-6 sm:pt-16 md:pt-20">
        {/* Saudação */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-card/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            Bem-vindo
          </span>
          <h1 className="mt-5 font-extrabold leading-[1.05] tracking-tight text-3xl sm:text-4xl md:text-5xl">
            Boas-vindas ao <span className="text-primary">Viva FIT APP</span>
          </h1>
          <p className="mt-3 text-base sm:text-lg text-muted-foreground">
            Selecione como você quer acessar a plataforma
          </p>
        </div>

        {/* Cards de escolha */}
        <div className="mt-10 sm:mt-12 grid w-full gap-4 sm:grid-cols-2 sm:gap-5">
          {/* Card 1 — Profissional */}
          <RoleCard
            href="/login"
            icon={<Briefcase className="size-5" strokeWidth={2.4} />}
            iconClassName="bg-primary/15 text-primary"
            title="Sou profissional"
            description="Personal, nutricionista ou coach que gerencia alunos, treinos, dietas e cobranças num só painel."
            cta="Entrar no painel de gestão"
            highlighted
          />

          {/* Card 2 — Aluno */}
          <RoleCard
            href="/aluno"
            icon={<User className="size-5" strokeWidth={2.4} />}
            iconClassName="bg-foreground/10 text-foreground border border-white/10"
            title="Sou aluno"
            description="Aluno acompanhado por um profissional no Viva FIT APP — aqui você abre treino, dieta e agenda."
            cta="Abrir meu app"
          />
        </div>

        {/* Footnote */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link
            href="/register"
            className="font-semibold text-primary transition-opacity hover:opacity-80"
          >
            Comece 3 dias grátis
          </Link>
          . Sem cartão pra começar.
        </p>
      </div>
    </main>
  );
}

/* ---------- Role card ---------- */

function RoleCard({
  href,
  icon,
  iconClassName,
  title,
  description,
  cta,
  highlighted = false,
}: {
  href: string;
  icon: React.ReactNode;
  iconClassName: string;
  title: string;
  description: string;
  cta: string;
  highlighted?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        highlighted
          ? "group relative overflow-hidden rounded-2xl border border-primary/40 bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_20px_50px_-25px_rgba(255,107,53,0.45)] sm:p-7"
          : "group relative overflow-hidden rounded-2xl border border-white/10 bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_20px_50px_-25px_rgba(0,0,0,0.5)] sm:p-7"
      }
    >
      {/* Glow laranja sutil só no card destacado */}
      {highlighted && (
        <div
          className="pointer-events-none absolute -top-24 -right-24 size-48 rounded-full bg-primary/20 blur-3xl"
          aria-hidden="true"
        />
      )}

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <span
            className={
              "grid size-11 shrink-0 place-items-center rounded-xl " + iconClassName
            }
          >
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground sm:text-xl">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground leading-snug">
              {description}
            </p>
          </div>
        </div>

        {/* Chevron que desliza no hover */}
        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-background/40 text-foreground/70 transition-all duration-300 group-hover:translate-x-1 group-hover:border-primary/40 group-hover:text-primary">
          <ChevronRight className="size-4" strokeWidth={2.5} />
        </span>
      </div>

      {/* CTA invisível pra acessibilidade */}
      <span className="sr-only">{cta}</span>
    </Link>
  );
}
