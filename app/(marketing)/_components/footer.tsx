import Link from "next/link";
import { Logo } from "./logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 bg-card/60">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 py-12 sm:py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo />
            <p className="mt-4 text-sm text-foreground/75 max-w-xs leading-relaxed">
              A plataforma que organiza consultoria online de personal trainers no Brasil.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Produto</h4>
            <ul className="mt-4 space-y-2 text-sm text-foreground/70">
              <li><Link href="#funcionalidades" className="hover:text-foreground transition-colors">Funcionalidades</Link></li>
              <li><Link href="#planos" className="hover:text-foreground transition-colors">Planos</Link></li>
              <li><Link href="#faq" className="hover:text-foreground transition-colors">Dúvidas</Link></li>
              <li><Link href="/register" className="hover:text-foreground transition-colors">Testar grátis</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Conta</h4>
            <ul className="mt-4 space-y-2 text-sm text-foreground/70">
              <li><Link href="/entrar" className="hover:text-foreground transition-colors">Entrar</Link></li>
              <li><Link href="/register" className="hover:text-foreground transition-colors">Criar conta</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Legal</h4>
            <ul className="mt-4 space-y-2 text-sm text-foreground/70">
              <li><Link href="/privacidade" className="hover:text-foreground transition-colors">Privacidade</Link></li>
              <li><Link href="/termos" className="hover:text-foreground transition-colors">Termos de uso</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <p className="text-xs text-foreground/60">
            © {new Date().getFullYear()} Viva FIT APP · Todos os direitos reservados.
          </p>
          <p className="text-xs text-foreground/60">Feito pra personal trainer BR 🇧🇷</p>
        </div>
      </div>
    </footer>
  );
}