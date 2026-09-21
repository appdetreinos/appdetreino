import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Check } from "lucide-react";
import { PLANS, formatBRL } from "@/lib/types/billing";
import { CheckoutClient } from "./checkout-client";

interface PageProps {
  searchParams: Promise<{ plan?: string }>;
}

export default async function CheckoutPage({ searchParams }: PageProps) {
  const { plan: planId } = await searchParams;
  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[1];
  const amountCents = Math.round(plan.priceMonthly * 100);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/5">
        <div className="mx-auto max-w-3xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-extrabold">
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
          <h1 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight">
            Bora começar.
          </h1>
          <p className="mt-2 text-muted-foreground">
            Paga com Pix, cartão ou boleto via Mercado Pago. Cancela em 1 clique.
          </p>

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

              <div className="mt-6 grid grid-cols-3 gap-2">
                {["Pix", "Cartão", "Boleto"].map((m) => (
                  <div
                    key={m}
                    className="rounded-lg border border-white/10 bg-background/40 px-3 py-3 text-sm font-semibold text-center"
                  >
                    {m}
                  </div>
                ))}
              </div>

              <CheckoutClient
                planId={plan.id}
                planName={plan.name}
                amountCents={amountCents}
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
