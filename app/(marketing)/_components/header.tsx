"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import { Logo } from "./logo";
import { ChevronDown, Dumbbell, User } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Header da landing.
 *
 * Botão "Entrar" vira dropdown com 2 opções:
 *  - Sou profissional (personal / nutri / coach) → /login
 *  - Sou aluno → /aluno
 *
 * Design: trigger neutro, dropdown com bg-card + borda, ícones
 * distintos (Dumbbell laranja / User cinza) pra deixar a escolha óbvia.
 */

export function MarketingHeader() {
  const [scrollou, setScrollou] = useState(false);
  const [loginAberto, setLoginAberto] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrollou(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    if (!loginAberto) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-login-dropdown]")) {
        setLoginAberto(false);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [loginAberto]);

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b transition-all duration-300 backdrop-blur-md ${
        scrollou
          ? "border-white/10 bg-background/85 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.6)]"
          : "border-transparent bg-background/60"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
        <Logo />
        <nav className="hidden md:flex items-center gap-7 text-sm text-foreground/75">
          <Link href="#funcionalidades" className="hover:text-foreground transition-colors">
            Funcionalidades
          </Link>
          <Link href="#planos" className="hover:text-foreground transition-colors">
            Planos
          </Link>
          <Link href="#faq" className="hover:text-foreground transition-colors">
            Dúvidas
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {/* Dropdown Entrar */}
          <div className="relative" data-login-dropdown>
            <button
              type="button"
              onClick={() => setLoginAberto((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                "text-foreground/85 hover:text-foreground hover:bg-white/5",
                loginAberto && "bg-white/5 text-foreground"
              )}
              aria-expanded={loginAberto}
              aria-haspopup="menu"
            >
              Entrar
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform duration-200",
                  loginAberto && "rotate-180"
                )}
              />
            </button>

            {loginAberto && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-white/10 bg-card p-2 shadow-2xl shadow-black/40"
              >
                <div className="px-2 pt-1.5 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Entrar como…
                </div>

                {/* Opção 1 — Profissional */}
                <Link
                  href="/login"
                  role="menuitem"
                  onClick={() => setLoginAberto(false)}
                  className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-white/5 transition-colors group"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                    <Dumbbell className="size-4" strokeWidth={2.5} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-foreground">
                      Sou profissional
                    </span>
                    <span className="block text-xs text-muted-foreground leading-snug">
                      Personal, nutri ou coach — entra no painel de gestão
                    </span>
                  </span>
                </Link>

                {/* Opção 2 — Aluno */}
                <Link
                  href="/aluno"
                  role="menuitem"
                  onClick={() => setLoginAberto(false)}
                  className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-white/5 transition-colors group"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-foreground/10 text-foreground border border-white/10">
                    <User className="size-4" strokeWidth={2.5} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-foreground">
                      Sou aluno
                    </span>
                    <span className="block text-xs text-muted-foreground leading-snug">
                      Abrir meu treino, dieta e agenda no app
                    </span>
                  </span>
                </Link>
              </div>
            )}
          </div>

          <ButtonLink href="/register" size="sm" className="font-semibold">
            Testar 3 dias grátis
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
