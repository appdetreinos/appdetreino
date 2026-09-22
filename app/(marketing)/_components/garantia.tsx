"use client";

import { motion } from "motion/react";
import { Check, ShieldCheck, RotateCcw } from "lucide-react";

/**
 * "Pode respirar" — fechamento antes do footer.
 * Estrutura: 3 colunas com check verde + frase curta de garantia.
 *
 * Tom: reforçar que cancelar é fácil, não tem custo pra começar,
 * e que o produto foi feito pra personal trainer BR.
 */

const garantias = [
  {
    icone: Check,
    titulo: "Começa sem cartão",
    descricao: "Você entra, usa o app de verdade e só decide pagar se fizer sentido.",
  },
  {
    icone: ShieldCheck,
    titulo: "Sem pegadinha no contrato",
    descricao: "Mensalidade fixa. Sem percentual sobre a cobrança dos alunos.",
  },
  {
    icone: RotateCcw,
    titulo: "Cancela quando quiser",
    descricao: "1 clique no painel. Sem ligar, sem negociar, sem reter.",
  },
];

export function Garantia() {
  return (
    <section className="relative py-16 sm:py-20 md:py-24 overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl border border-white/10 bg-card p-6 sm:p-10"
        >
          {/* Cabeçalho */}
          <div className="text-center max-w-2xl mx-auto">
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5 }}
              className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-primary"
            >
              Pode respirar
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-3 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]"
            >
              Você não tá <span className="text-primary">preso a nada</span>.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed"
            >
              A gente entende que ninguém quer ficar preso a ferramenta que não entrega. Por isso:
            </motion.p>
          </div>

          {/* 3 garantias */}
          <div className="mt-10 sm:mt-12 grid sm:grid-cols-3 gap-4 sm:gap-6">
            {garantias.map((g, i) => (
              <motion.div
                key={g.titulo}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
                className="flex flex-col items-center text-center sm:items-start sm:text-left"
              >
                <span className="grid size-10 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
                  <g.icone className="size-5" strokeWidth={2.5} />
                </span>
                <h3 className="mt-3 text-base sm:text-lg font-bold tracking-tight">
                  {g.titulo}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                  {g.descricao}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
