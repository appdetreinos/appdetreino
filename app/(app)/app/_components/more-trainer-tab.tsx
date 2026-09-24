"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Dumbbell,
  History,
  Salad,
  Flame,
  CheckSquare,
  ClipboardList,
  FileText,
  Wallet,
  MessageCircle,
  Trophy,
  Briefcase,
  Store,
  CreditCard,
  Settings,
  LayoutGrid,
  X,
} from "lucide-react";

const ALL = [
  { href: "/app", label: "Visão geral", icon: LayoutDashboard },
  { href: "/app/agenda", label: "Agenda", icon: Calendar },
  { href: "/app/students", label: "Alunos", icon: Users },
  { href: "/app/workouts", label: "Treinos", icon: Dumbbell },
  { href: "/app/workouts/historico", label: "Histórico", icon: History },
  { href: "/app/diets", label: "Dietas", icon: Salad },
  { href: "/app/wod", label: "WOD", icon: Flame },
  { href: "/app/habitos", label: "Hábitos", icon: CheckSquare },
  { href: "/app/evaluations", label: "Avaliações", icon: ClipboardList },
  { href: "/app/anamnese", label: "Anamnese", icon: FileText },
  { href: "/app/finance", label: "Financeiro", icon: Wallet },
  { href: "/app/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/app/community", label: "Comunidade", icon: Trophy },
  { href: "/app/equipe", label: "Equipe", icon: Briefcase },
  { href: "/app/marketplace", label: "Vitrine", icon: Store },
  { href: "/app/settings/upgrade", label: "Planos", icon: CreditCard },
  { href: "/app/settings", label: "Configurações", icon: Settings },
];

/** Aba "Mais": todos os menus do trainer em gaveta inferior. */
export function MoreTrainerTab() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        className="flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-[11px] text-muted-foreground hover:text-primary"
      >
        <LayoutGrid className="size-5" />
        Mais
      </button>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Todos os menus">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60"
          />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[75dvh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-card p-4 animate-fade-in-up"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="font-bold">Todos os menus</span>
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
              {ALL.map((m) => (
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
