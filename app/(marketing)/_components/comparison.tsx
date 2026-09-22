"use client";

import { motion } from "motion/react";
import { Check, X, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { cn } from "@/lib/utils";

/**
 * Comparativo "Antes / Depois" — split 2 colunas.
 * Estrutura split clássica de landing B2B BR.
 *
 * Eyebrow próprio: "Onde a bagunça começa"
 * Headline próprio: "Você tá montando, ou tá rodando?"
 *
 * 5 pares X cinza (lado bagunçado) vs ✓ laranja (lado com sistema).
 * Não usa a palavra "Eles" / "Você" — usa "Hoje" / "Com o Viva FIT APP".
 */

const comparativo = [
  {
    hoje: "Anamnese respondida no WhatsApp às 23h",
    app: "Anamnese via formulário no app, salva no perfil do aluno",
  },
  {
    hoje: "Treino montado no Excel e enviado como foto",
    app: "Editor visual com vídeos, cargas e repetições no app do aluno",
  },
  {
    hoje: "Dieta em PDF que o aluno perde na conversa",
    app: "Plano alimentar + lista de compras automática no celular",
  },
  {
    hoje: "Cobrança manual: você lembra, manda msg, espera Pix",
    app: "Pix recorrente automático, baixa e confirmação no painel",
  },
  {
    hoje: "Planilha + Google Drive + WhatsApp + Notion",
    app: "Um painel só — alunos, treinos, finanças e agenda",
  },
];

export function Comparison() {
  return (
    <section className="relative py-16 sm:py-20 md:py-28 overflow-hidden">
      {/* Glow laranja sutil ao fundo */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-40 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, rgba(255,107,53,0.10), transparent 60%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-primary">
            Onde a bagunça começa
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-3 text-center text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]"
        >
          Você tá <span className="text-primary">montando</span>, ou tá{" "}
          <span className="text-primary">rodando</span>?
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-4 text-center text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto"
        >
          5 pontos onde o personal trainer que atende 30+ alunos começa a perceber que
          planilha não escala.
        </motion.p>

        {/* Split 2 colunas */}
        <div className="mt-10 sm:mt-14 grid md:grid-cols-2 gap-4 sm:gap-6">
          {/* Lado "Hoje" — bagunçado */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-white/5 bg-card/40 p-5 sm:p-6"
          >
            <div className="flex items-center gap-2 pb-4 border-b border-white/5">
              <span className="text-sm font-bold text-foreground/80">Hoje</span>
              <span className="text-xs text-muted-foreground">— como você resolve</span>
            </div>
            <ul className="mt-4 space-y-3">
              {comparativo.map((c, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="flex items-start gap-3"
                >
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/5 text-muted-foreground/60 mt-0.5">
                    <X className="size-3" strokeWidth={2.5} />
                  </span>
                  <span className="text-sm sm:text-base text-foreground/60 leading-snug">
                    {c.hoje}
                  </span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Lado "Com o Viva FIT APP" */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative rounded-2xl border border-primary/40 bg-primary/[0.03] p-5 sm:p-6",
              "shadow-[0_0_0_1px_rgba(255,107,53,0.08)]"
            )}
          >
            {/* Badge */}
            <div className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
              <Sparkles className="size-3" />
              Com o Viva FIT APP
            </div>

            <div className="flex items-center gap-2 pb-4 border-b border-primary/20">
              <span className="text-sm font-bold text-primary">Rodando</span>
              <span className="text-xs text-muted-foreground">— o que muda</span>
            </div>
            <ul className="mt-4 space-y-3">
              {comparativo.map((c, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.06 }}
                  className="flex items-start gap-3"
                >
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground mt-0.5">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  <span className="text-sm sm:text-base text-foreground font-medium leading-snug">
                    {c.app}
                  </span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Frase de virada */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 sm:mt-14 text-center text-base sm:text-lg text-foreground/85 max-w-2xl mx-auto"
        >
          Não é sobre trabalhar mais. É sobre <strong className="text-primary">parar de remar contra a maré</strong> e
          deixar a ferramenta cuidar do resto.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 flex justify-center"
        >
          <ButtonLink href="/register" size="lg" className="font-semibold">
            Testar 3 dias grátis
          </ButtonLink>
        </motion.div>
      </div>
    </section>
  );
}
