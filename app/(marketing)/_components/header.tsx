"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import { Logo } from "./logo";

/**
 * Header da landing.
 *
 * Botão "Entrar" → /entrar (página dedicada com segmentação
 * profissional / aluno — ver app/(marketing)/entrar/page.tsx).
 *
 * Não usar dropdown aqui: a segmentação merece tela cheia, com
 * cópia explicativa e os 2 cards lado a lado.
 */

export function MarketingHeader() {
  const [scrollou, setScrollou] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrollou(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
          <Link
            href="/entrar"
            className="inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold text-foreground/85 transition-colors hover:bg-white/5 hover:text-foreground"
          >
            Entrar
          </Link>
          <ButtonLink href="/register" size="sm" className="font-semibold">
            Testar 3 dias grátis
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
