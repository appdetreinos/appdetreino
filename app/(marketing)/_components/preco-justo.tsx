"use client";

import { motion } from "motion/react";
import { ButtonLink } from "@/components/ui/button-link";

/**
 * "Sem letras miúdas" — tríade numerada de onboarding → preço → teto.
 * Estrutura em 3 colunas (inspirada no padrão de páginas de pricing BR),
 * mas com copy próprio da Viva FIT APP.
 *
 * Eyebrow: "Sem letras miúdas"
 * Headline: "Sem surpresa. Sem taxa escondida. Sem fidelidade."
 *
 * 3 colunas numeradas:
 *  1. Teste 3 dias — entrada sem atrito.
 *  2. A partir de R$ 59,90/mês — plano completo.
 *  3. Teto em R$ 189,90/mês — IA + alunos ilimitados.
 */

const tríade = [
  {
    n: "1",
    titulo: "3 dias de teste, sem cartão",
    descricao:
      "Entra, cadastra um aluno, monta um treino. Se não fizer sentido pra você, a conta não cobra nada. Sem precisar lembrar de cancelar.",
  },
  {
    n: "2",
    titulo: "A partir de R$ 59,90 por mês",
    descricao:
      "O primeiro plano já vem com treino, dieta, agenda, cobrança no Pix e suporte por WhatsApp. Não precisa de upgrade pra rodar.",
  },
  {
    n: "3",
    titulo: "Teto em R$ 189,90 por mês",
    descricao:
      "Se você quiser IA gerando treino, alunos ilimitados e relatórios avançados, esse é o valor. Acima disso não tem — não existe plano Enterprise.",
  },
];

export function PrecoJusto() {
  return (
    <section className="relative py-16 sm:py-20 md:py-28 overflow-hidden">
      {/* Glow sutil */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 50%, rgba(255,107,53,0.06), transparent 60%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl bg-card border border-white/10 p-6 sm:p-10 md:p-14"
        >
          {/* Eyebrow + headline */}
          <div className="text-center">
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5 }}
              className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-primary"
            >
              Sem letras miúdas
            </motion.span>

            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="mt-3 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1]"
            >
              Sem surpresa. Sem taxa escondida.{" "}
              <span className="text-primary">Sem fidelidade.</span>
            </motion.h2>
          </div>

          {/* 3 colunas numeradas */}
          <div className="mt-10 sm:mt-12 grid sm:grid-cols-3 gap-4 sm:gap-6">
            {tríade.map((t, i) => (
              <motion.div
                key={t.n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.1 }}
                className="rounded-xl bg-background/60 border border-white/5 p-5 sm:p-6"
              >
                <div className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground num text-sm font-black tabular-nums">
                  {t.n}
                </div>
                <h3 className="mt-4 text-lg sm:text-xl font-bold tracking-tight">
                  {t.titulo}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {t.descricao}
                </p>
              </motion.div>
            ))}
          </div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 justify-center"
          >
            <ButtonLink href="/register" size="lg" className="font-semibold">
              Começar 3 dias grátis
            </ButtonLink>
            <ButtonLink href="#planos" size="lg" variant="outline" className="font-semibold">
              Ver os planos
            </ButtonLink>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
