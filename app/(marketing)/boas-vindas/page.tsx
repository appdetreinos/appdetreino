import Link from "next/link";
import { MailCheck, ArrowRight, Sparkles } from "lucide-react";
import { Logo } from "../_components/logo";

/**
 * Página "Boas-vindas" — exibida após cadastro bem-sucedido.
 *
 * Funciona como "e-mail de boas-vindas" sem precisar de SMTP:
 *  - Mostra o nome do usuário recém-cadastrado
 *  - Mostra o e-mail cadastrado (pra ele não esquecer)
 *  - Botão "Acessar plataforma" → /login
 *  - Texto humanizado (tom próprio, não copia da Prime)
 *
 * Rota pública (acessível sem login). Recebe dados via query string:
 *   /boas-vindas?name=Nicolas&email=nicolas@x.com
 *
 * Se não receber nada, mostra fallback genérico.
 */

export const metadata = {
  title: "Boas-vindas · Viva FIT APP",
  description: "Sua conta foi criada com sucesso. Acesse a plataforma agora.",
};

type SearchParams = Promise<{
  name?: string;
  email?: string;
}>;

export default async function BoasVindasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const name = (params.name ?? "").trim();
  const email = (params.email ?? "").trim();

  const firstName = name ? name.split(" ")[0] : "";

  return (
    <main className="relative min-h-dvh overflow-hidden bg-background">
      {/* Glow de fundo (igual ao /entrar pra coerência) */}
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
      </div>

      {/* Card central */}
      <div className="mx-auto flex max-w-xl flex-col items-center px-5 pt-12 pb-16 sm:px-6 sm:pt-20">
        <div
          className="text-center"
          style={{ animation: "fade-up 0.6s ease-out 0s both" }}
        >
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
            <MailCheck className="size-6" />
          </span>

          <h1 className="mt-5 font-extrabold leading-[1.05] tracking-tight text-3xl sm:text-4xl">
            Conta criada{firstName ? `, ${firstName}` : ""}! 🎉
          </h1>

          <p className="mt-3 text-base text-muted-foreground">
            Teu acesso já tá liberado — pode entrar agora.
          </p>
        </div>

        {/* Card com dados de acesso */}
        <div
          className="mt-8 w-full rounded-2xl border border-white/10 bg-card p-6 sm:p-7"
          style={{ animation: "fade-up 0.6s ease-out 0.1s both" }}
        >
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="size-3 text-primary" />
            Dados de acesso
          </div>

          <dl className="mt-4 space-y-3">
            {email && (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  E-mail
                </dt>
                <dd className="mt-0.5 break-all font-mono text-sm font-semibold">
                  {email}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Senha
              </dt>
              <dd className="mt-0.5 text-sm text-foreground/85">
                A senha que você definiu agora. Guarde ela em algum lugar seguro. Se
                esquecer, dá pra redefinir em <span className="font-mono">/recuperar</span>.
              </dd>
            </div>
          </dl>

          {/* CTA único — foco em entrar */}
          <Link
            href="/login"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90"
          >
            Acessar plataforma
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {/* Próximos passos */}
        <div
          className="mt-6 w-full rounded-2xl border border-primary/20 bg-primary/[0.03] p-5"
          style={{ animation: "fade-up 0.6s ease-out 0.2s both" }}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-primary">
            E agora?
          </div>
          <ol className="mt-3 space-y-2 text-sm text-foreground/85">
            <li className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                1
              </span>
              <span>
                <strong>Entra no painel</strong> com teu e-mail e senha.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                2
              </span>
              <span>
                <strong>Convida teu primeiro aluno</strong> pelo link de convite — ele
                já entra com tudo configurado.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                3
              </span>
              <span>
                <strong>Manda treino e dieta</strong> direto pelo painel — ele recebe
                no app na hora.
              </span>
            </li>
          </ol>
        </div>

        {/* Help */}
        <p
          className="mt-8 text-center text-xs text-muted-foreground"
          style={{ animation: "fade-up 0.6s ease-out 0.3s both" }}
        >
          Precisa de ajuda?{" "}
          <a
            href="mailto:suporte@vivafit.com.br"
            className="font-semibold text-primary hover:underline"
          >
            Falar com o suporte
          </a>
        </p>
      </div>

      {/* CSS das animações — escopado pela página */}
      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
