"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ButtonLink } from "@/components/ui/button-link";
import { Check } from "lucide-react";
import { PLANS, TRIAL_DAYS, formatBRL } from "@/lib/types/billing";
import { cn } from "@/lib/utils";

/**
 * Pricing — sem cards brilhantes/destacados com sombra laranja exagerada (cara de IA).
 *
 * Princípios:
 *  - Plano Pro destacado por cor de borda, não por sombra glow.
 *  - Mobile: cards empilhados com tamanho natural (respiram).
 *  - Preço grande em mono (sem "R$" espalhado).
 *  - Toggle Mensal/Anual limpo.
 *  - Tag "Mais escolhido" no Pro é o destaque.
 *
 * Diferencial próprio: o preço do plano é seguido de uma micro-tag com o que
 * está incluso no preço (ex: "+ alunos ilimitados"). E embaixo do CTA tem
 * "Começa em X dias" como lembrete do trial.
 */

export function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="planos" className="py-16 sm:py-20 md:py-28 bg-card/50">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >
          <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-primary">
            Planos
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1]">
            Pague pelo tamanho da sua carteira,{" "}
            <span className="text-primary">não pelo número de feature</span>.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            3 planos honestos. Sem tier escondido, sem upsell no checkout.
          </p>
        </motion.div>

        {/* Toggle Mensal/Anual — pill clean */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-6 sm:mt-8 inline-flex items-center gap-1 rounded-full border border-white/10 bg-card p-1 text-sm"
        >
          <button
            type="button"
            onClick={() => setAnnual(false)}
            className={cn(
              "rounded-full px-4 py-1.5 font-semibold transition-colors",
              !annual ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            className={cn(
              "rounded-full px-4 py-1.5 font-semibold transition-colors",
              annual ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Anual
            <span className="ml-1.5 text-xs">−25%</span>
          </button>
        </motion.div>

        {/* Cards — mobile stack, desktop 3 col */}
        <div className="mt-10 sm:mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan, i) => {
            const isHighlight = plan.highlight;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "relative rounded-2xl border bg-card p-6 sm:p-7 flex flex-col",
                  isHighlight
                    ? "border-primary lg:scale-[1.02] lg:-mt-2"
                    : "border-white/5"
                )}
              >
                {isHighlight && (
                  <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-foreground">
                    Mais escolhido
                  </span>
                )}

                <div>
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.studentLimit ? `Até ${plan.studentLimit} alunos ativos` : "Alunos ilimitados"}
                  </p>

                  <div className="mt-5 flex items-baseline gap-1.5">
                    <span className="text-sm text-muted-foreground">R$</span>
                    <span className="num text-5xl font-extrabold tracking-tight">
                      {formatNumero(annual ? plan.priceAnnual / 12 : plan.priceMonthly)}
                    </span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </div>
                  {annual && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {formatBRL(plan.priceAnnual)} cobrados uma vez por ano
                    </p>
                  )}
                </div>

                <ul className="mt-6 space-y-2.5 text-sm flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="size-4 mt-0.5 shrink-0 text-primary" />
                      <span className="text-foreground/90">{f}</span>
                    </li>
                  ))}
                </ul>

                <ButtonLink
                  href="/register"
                  size="lg"
                  variant={isHighlight ? "default" : "outline"}
                  className="mt-7 w-full font-semibold"
                >
                  {plan.cta}
                </ButtonLink>
              </motion.div>
            );
          })}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 sm:mt-10 text-sm text-muted-foreground"
        >
          Pix, cartão e boleto via Mercado Pago · Sem fidelidade · Suporte por WhatsApp
        </motion.p>
      </div>
    </section>
  );
}

function formatNumero(v: number): string {
  return v.toFixed(2).replace(".", ",");
}
