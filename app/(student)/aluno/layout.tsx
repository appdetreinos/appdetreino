import Link from "next/link";
import { MoreTab } from "./more-tab";
import {
  Home,
  Salad,
  TrendingUp,
  MessageCircle,
  Trophy,
  Wallet,
} from "lucide-react";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="md:pl-64">
        {/* Sidebar mobile-first (bottom tab no celular) */}
        <aside className="hidden md:block fixed inset-y-0 left-0 w-64 border-r border-white/5 bg-card/40">
          <div className="px-5 py-5 border-b border-white/5">
            <Link href="/aluno" className="font-extrabold">
              Viva <span className="text-primary">Fit</span>
            </Link>
          </div>
          <nav className="px-3 py-4 space-y-1">
            <NavItem href="/aluno" icon={Home} label="Hoje" />
            <NavItem href="/aluno/dieta" icon={Salad} label="Dieta" />
            <NavItem href="/aluno/progresso" icon={TrendingUp} label="Progresso" />
            <NavItem href="/aluno/mensagens" icon={MessageCircle} label="Mensagens" />
            <NavItem href="/aluno/comunidade" icon={Trophy} label="Comunidade" />
            <NavItem href="/aluno/pagamentos" icon={Wallet} label="Pagamentos" />
          </nav>
        </aside>

        {/* Tab bar mobile (fixed bottom) */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-white/5 bg-background/95 backdrop-blur-md" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="grid grid-cols-6">
            <NavItemMobile href="/aluno" icon={Home} label="Hoje" />
            <NavItemMobile href="/aluno/dieta" icon={Salad} label="Dieta" />
            <NavItemMobile href="/aluno/progresso" icon={TrendingUp} label="Evolução" />
            <NavItemMobile href="/aluno/comunidade" icon={Trophy} label="Turma" />
            <NavItemMobile href="/aluno/pagamentos" icon={Wallet} label="Pagar" />
            <MoreTab />
          </div>
        </nav>

        {children}
      </div>
    </div>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground"
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

function NavItemMobile({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-1 py-3 text-xs text-muted-foreground hover:text-primary"
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );
}