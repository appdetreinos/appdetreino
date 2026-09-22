"use client";

import { motion } from "motion/react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "Antes vs depois" — comparativo split 2 colunas.
 * Inspirado na seção "O custo invisível do amadorismo" da Prime Coaching.
 *
 * Lado esquerdo: amadorismo (X cinza)
 * Lado direito: Viva FIT APP (✓ laranja, destacado)
 *
 * Cada linha tem um par (X vs ✓) que aparece em scroll.
 */

const comparativo = [
  {
    amador: "Anamnese pelo WhatsApp às 23h",
    app: "Anamnese via formulário dentro do app",
  },
  {
    amador: "Treino em PDF anexo no e-mail",
    app: "Treino no app, com vídeo de execução",
  },
  {
    amador: "Dieta em PDF perdido na conversa",
    app: "Plano alimentar com refeições e lista de compras",
  },
  {
    amador: "Cobrança manual e atrasada",
    app: "Cobrança recorrente e automática no Pix",
  },
  {
    amador: "Entrega por 5 apps diferentes",
    app: "Tudo centralizado num app só",
  },
  {
    amador: "Decisões no achismo, sem dados",
    app: "Métricas e adesão em tempo real",
  },
];

export function Comparison() {
  return (
    <section className="relative py-16 sm:py-20 md:py-28 overflow-hidden">
      {/* Glow sutil laranja ao fundo */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-40 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, rgba(255,107,53,0.12), transparent 60%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        {/* Cabeçalho */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-2xl mx-auto"
        >
          <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-primary">
            O custo invisível do amadorismo
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]">
            Sua consultoria{" "}
            <span className="text-primary">não cabe mais em planilha</span>.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            Você tá atendendo 30 alunos do mesmo jeito que atendia 5. O sistema te segurou — até agora.
          </p>
        </motion.div>

        {/* Comparativo split */}
        <div className="mt-10 sm:mt-14 grid md:grid-cols-2 gap-4 sm:gap-6">
          {/* Lado "amador" */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-white/5 bg-card/40 p-5 sm:p-6"
          >
            <div className="flex items-center gap-2 pb-4 border-b border-white/5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Como você faz hoje
              </span>
            </div>
            <ul className="mt-4 space-y-3">
              {comparativo.map((c, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="flex items-start gap-3"
                >
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/5 text-muted-foreground/60">
                    <X className="size-3" strokeWidth={2.5} />
                  </span>
                  <span className="text-sm sm:text-base text-foreground/60 leading-snug">
                    {c.amador}
                  </span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Lado "Viva FIT APP" */}
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
            {/* Badge "você aqui" */}
            <div className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
              Com o Viva FIT APP
            </div>

            <div className="flex items-center gap-2 pb-4 border-b border-primary/20">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Como você faz aqui
              </span>
            </div>
            <ul className="mt-4 space-y-3">
              {comparativo.map((c, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
                  className="flex items-start gap-3"
                >
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
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
          className="mt-10 sm:mt-12 text-center text-base sm:text-lg text-foreground/85 max-w-2xl mx-auto"
        >
          Migre pro lado que{" "}
          <strong className="text-primary">cresce e escala</strong>. É como centralizar todos os
          seus problemas num único solucionador.
        </motion.p>
      </div>
    </section>
  );
}
