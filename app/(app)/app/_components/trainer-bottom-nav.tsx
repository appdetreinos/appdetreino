"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MoreTrainerTab } from "./more-trainer-tab";

const ITEMS = [
  { href: "/app", label: "Início", icon: LayoutDashboard, exact: true },
  { href: "/app/students", label: "Alunos", icon: Users, exact: false },
  { href: "/app/workouts", label: "Treinos", icon: Dumbbell, exact: false },
  { href: "/app/finance", label: "Caixa", icon: Wallet, exact: false },
];

/** Navegação inferior do trainer (só mobile, md+ usa sidebar). */
export function TrainerBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/5 bg-background/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map((it) => {
          const active = it.exact ? pathname === it.href : pathname.startsWith(it.href + "/") || pathname === it.href;
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-[11px] transition-colors",
                  active ? "text-primary font-bold" : "text-muted-foreground",
                )}
              >
                <it.icon className="size-5" />
                {it.label}
              </Link>
            </li>
          );
        })}
        <li>
          <MoreTrainerTab />
        </li>
      </ul>
    </nav>
  );
}
