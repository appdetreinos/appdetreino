"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Briefcase,
  User,
  ChevronRight,
  X,
  LogIn,
} from "lucide-react";
import { Logo } from "../_components/logo";
import { ButtonLink } from "@/components/ui/button-link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Client da página /entrar.
 *
 * Detecta sessão ativa via Supabase:
 *  - Se tiver user logado, mostra modal perguntando "Continuar aqui?" /
 *    "Entrar com outra conta" (logout) ANTES de prosseguir.
 *  - Resolve o bug: clicar "Sou aluno" enquanto logado como trainer
 *    não vai direto pra /aluno (que daria conflito) — força o usuário
 *    a decidir.
 */

type Role = "trainer" | "student" | "admin";

export function EntrarClient() {
  const router = useRouter();
  const [loadingSession, setLoadingSession] = useState(true);
  const [currentSession, setCurrentSession] = useState<{
    role: Role;
    name: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelado || !user) {
          setLoadingSession(false);
          return;
        }
        // Busca role + nome do profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelado) return;
        setCurrentSession({
          role: (profile?.role as Role) ?? "trainer",
          name: profile?.full_name?.split(" ")[0] ?? user.email ?? "você",
          email: user.email ?? "",
        });
      } finally {
        if (!cancelado) setLoadingSession(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  async function handleContinue() {
    // Continuar com a sessão atual → vai pro dashboard do role
    if (!currentSession) return;
    const destino =
      currentSession.role === "student"
        ? "/aluno"
        : currentSession.role === "admin"
          ? "/admin"
          : "/app";
    router.push(destino);
    router.refresh();
  }

  async function handleSwitch() {
    // Trocar de conta → logout e volta pra essa tela (sem destino selecionado)
    const supabase = createClient();
    await supabase.auth.signOut();
    setCurrentSession(null);
    router.refresh();
  }

  const card1Href = "/login";
  const card2Href = "/aluno";

  return (
    <main className="relative min-h-dvh overflow-hidden bg-background">
      {/* Glow de fundo */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 0%, rgba(255,107,53,0.18), transparent 45%), radial-gradient(circle at 100% 100%, rgba(255,107,53,0.08), transparent 50%)",
        }}
      />

      {/* Modal de sessão ativa */}
      <AnimatePresence>
        {currentSession && (
          <SessionModal
            session={currentSession}
            onContinue={handleContinue}
            onSwitch={handleSwitch}
          />
        )}
      </AnimatePresence>

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

        <div className="mt-10 sm:mt-12 grid w-full gap-4 sm:grid-cols-2 sm:gap-5">
          <RoleCard
            href={card1Href}
            icon={<Briefcase className="size-5" strokeWidth={2.4} />}
            iconClassName="bg-primary/15 text-primary"
            title="Sou profissional"
            description="Personal, nutricionista ou coach que gerencia alunos, treinos, dietas e cobranças num só painel."
            cta="Entrar no painel de gestão"
            highlighted
          />
          <RoleCard
            href={card2Href}
            icon={<User className="size-5" strokeWidth={2.4} />}
            iconClassName="bg-foreground/10 text-foreground border border-white/10"
            title="Sou aluno"
            description="Aluno acompanhado por um profissional no Viva FIT APP — aqui você abre treino, dieta e agenda."
            cta="Abrir meu app"
          />
        </div>

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

/* ============================================================
 * Role card
 * ============================================================ */

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
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 sm:p-7",
        highlighted
          ? "border-primary/40 hover:border-primary hover:shadow-[0_20px_50px_-25px_rgba(255,107,53,0.45)]"
          : "border-white/10 hover:border-white/20 hover:shadow-[0_20px_50px_-25px_rgba(0,0,0,0.5)]"
      )}
    >
      {highlighted && (
        <div
          className="pointer-events-none absolute -top-24 -right-24 size-48 rounded-full bg-primary/20 blur-3xl"
          aria-hidden="true"
        />
      )}

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <span
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-xl",
              iconClassName
            )}
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

        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-background/40 text-foreground/70 transition-all duration-300 group-hover:translate-x-1 group-hover:border-primary/40 group-hover:text-primary">
          <ChevronRight className="size-4" strokeWidth={2.5} />
        </span>
      </div>

      <span className="sr-only">{cta}</span>
    </Link>
  );
}

/* ============================================================
 * Modal: sessão ativa detectada
 * ============================================================ */

function SessionModal({
  session,
  onContinue,
  onSwitch,
}: {
  session: { role: Role; name: string; email: string };
  onContinue: () => void;
  onSwitch: () => void;
}) {
  const roleLabel =
    session.role === "trainer"
      ? "profissional"
      : session.role === "admin"
        ? "admin"
        : "aluno";

  const destino =
    session.role === "student"
      ? "/aluno"
      : session.role === "admin"
        ? "/admin"
        : "/app";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop bloqueia cliques por trás */}
      <div className="absolute inset-0 bg-background/85 backdrop-blur-md" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-card p-6 shadow-2xl sm:p-7"
      >
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/15 text-primary">
          <LogIn className="size-5" />
        </span>

        <h2
          id="session-modal-title"
          className="mt-4 text-center text-xl font-extrabold tracking-tight"
        >
          Você já tá logado(a)
        </h2>

        <p className="mt-2 text-center text-sm text-muted-foreground">
          Detectamos uma sessão ativa. O que você quer fazer?
        </p>

        {/* Info da sessão atual */}
        <div className="mt-5 rounded-xl border border-white/10 bg-background/40 p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary text-sm font-bold">
              {session.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold truncate">
                {session.name} · {roleLabel}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {session.email}
              </div>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-5 space-y-2.5">
          <ButtonLink
            href={destino}
            variant="default"
            className="w-full font-semibold"
          >
            Continuar como {session.name}
          </ButtonLink>
          <button
            type="button"
            onClick={onSwitch}
            className="w-full rounded-md border border-white/15 bg-background/40 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-white/5"
          >
            Entrar com outra conta
          </button>
        </div>

        <button
          type="button"
          onClick={onSwitch}
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-md text-foreground/60 transition-colors hover:bg-white/5 hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="size-4" />
        </button>
      </motion.div>
    </div>
  );
}
