import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Check } from "lucide-react";
import { PLANS, formatBRL } from "@/lib/types/billing";
import { CheckoutClient } from "./checkout-client";

interface PageProps {
  searchParams: Promise<{ plan?: string; test?: string }>;
}

export default async function CheckoutPage({ searchParams }: PageProps) {
  const { plan: planId, test: testParam } = await searchParams;
  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[1];
  const testMode = testParam === "1" && process.env.ALLOW_TEST_CHECKOUT === "1";
  const amountCents = testMode ? 10 : Math.round(plan.priceMonthly * 100);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/5">
        <div className="mx-auto max-w-3xl px-6 h-16 flex items-center justify-between">
          <Link href="/app" className="font-extrabold">
            Viva <span className="text-primary">Fit</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="size-3.5" />
            Pagamento seguro
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <Badge className="bg-primary/15 text-primary border-primary/30">
            {plan.name}
          </Badge>
          {testMode && (
            <Badge className="ml-2 bg-yellow-500/15 text-yellow-500 border-yellow-500/30">
              MODO TESTE · R$ 0,10
            </Badge>
          )}
          <h1 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight">
            Bora começar.
          </h1>
          <p className="mt-2 text-muted-foreground">
            Paga com Pix, cartão ou boleto via Mercado Pago. Cancela em 1 clique.
          </p>

          {/* Plan switcher — chips que trocam o plano via ?plan= sem JS extra */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {PLANS.map((p) => {
              const active = p.id === plan.id;
              return (
                <Link
                  key={p.id}
                  href={`/app/checkout?plan=${p.id}`}
                  aria-pressed={active}
                  className={
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors " +
                    (active
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-white/10 bg-card text-foreground/80 hover:text-foreground hover:border-white/20")
                  }
                >
                  <span>{p.name}</span>
                  <span className={"num text-[11px] " + (active ? "text-primary/80" : "text-muted-foreground")}>
                    {formatBRL(p.priceMonthly)}/mês
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <Card className="bg-card border-white/5 p-6">
              <h2 className="font-bold">Resumo</h2>
              <div className="mt-4 flex items-baseline justify-between">
                <span>Plano {plan.name}</span>
                <span className="num font-bold text-lg">{formatBRL(plan.priceMonthly)}/mês</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between text-sm text-muted-foreground">
                <span>Taxa de adesão</span>
                <span className="num">grátis</span>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5 flex items-baseline justify-between">
                <span className="font-semibold">Total hoje</span>
                <span className="num font-extrabold text-2xl">
                  {formatBRL(plan.priceMonthly)}
                </span>
              </div>

              <ul className="mt-6 space-y-2 text-sm">
                {plan.features.slice(0, 4).map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="size-4 mt-0.5 text-primary shrink-0" />
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="bg-card border-white/5 p-6">
              <h2 className="font-bold">Forma de pagamento</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Mercado Pago — Pix, cartão e boleto no mesmo lugar
              </p>

              <CheckoutClient
                planId={plan.id}
                planName={plan.name}
                amountCents={amountCents}
                testMode={testMode}
              />
            </Card>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/app"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Voltar para o painel
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
