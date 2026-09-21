"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import { Logo } from "./logo";

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
          <Link href="#funcionalidades" className="hover:text-foreground transition-colors">Funcionalidades</Link>
          <Link href="#planos" className="hover:text-foreground transition-colors">Planos</Link>
          <Link href="#faq" className="hover:text-foreground transition-colors">Dúvidas</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
            Entrar
          </ButtonLink>
          <ButtonLink href="/register" size="sm" className="font-semibold">
            Testar 3 dias grátis
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}