"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MessagesSquare,
  CheckSquare,
  Calendar,
  ShoppingBasket,
  Wallet,
  ClipboardList,
  LineChart,
  History,
  LayoutGrid,
  X,
} from "lucide-react";

const MORE = [
  { href: "/aluno/treinos", label: "Treinos", icon: LayoutGrid },
  { href: "/aluno/mensagens", label: "Mensagens", icon: MessagesSquare },
  { href: "/aluno/habitos", label: "Hábitos", icon: CheckSquare },
  { href: "/aluno/agenda", label: "Agenda", icon: Calendar },
  { href: "/aluno/compras", label: "Compras", icon: ShoppingBasket },
  { href: "/aluno/pagamentos", label: "Pagar", icon: Wallet },
  { href: "/aluno/anamnese", label: "Anamnese", icon: ClipboardList },
  { href: "/aluno/progresso", label: "Progresso", icon: LineChart },
  { href: "/aluno/historico", label: "Histórico", icon: History },
];

/** Aba "Mais": gaveta inferior com todos os destinos do aluno. */
export function MoreTab() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        className="flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-xs text-muted-foreground hover:text-primary"
      >
        <LayoutGrid className="size-5" />
        Mais
      </button>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Mais destinos">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60"
          />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-white/10 bg-card p-4 animate-fade-in-up"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="font-bold">Tudo do app</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="grid size-9 place-items-center rounded-full hover:bg-white/5"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MORE.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/5 bg-background/60 p-4 text-xs font-medium hover:border-primary/40"
                >
                  <m.icon className="size-5 text-primary" />
                  {m.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
