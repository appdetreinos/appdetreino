"use client";

import { motion } from "motion/react";

/**
 * SocialProof — versão Prime (texto + avatares + avaliação por estrelas).
 *
 *  - 1 linha com a frase de prova social
 *  - Avatares que aparecem em stagger
 *  - Marquee horizontal com frases reais de uso
 */

const avatares = [
  "B.S", "M.O", "P.L", "C.S", "R.M", "A.B", "L.F", "J.C",
  "T.A", "D.M", "K.S", "V.H", "E.P", "G.O", "N.L", "Y.R",
];

export function SocialProof() {
  return (
    <section className="border-y border-white/10 bg-card/60 overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5 }}
            className="text-sm sm:text-base text-foreground/85"
          >
            <strong className="text-foreground">+1.200 personais, nutris e coaches</strong> já
            organizam tudo no Viva FIT APP.
          </motion.p>
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-2">
              {avatares.slice(0, 6).map((a, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.6, x: -8 }}
                  whileInView={{ opacity: 1, scale: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{
                    duration: 0.35,
                    delay: 0.15 + i * 0.06,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="size-7 sm:size-8 rounded-full bg-primary/15 border-2 border-background grid place-items-center text-[10px] font-bold text-primary"
                >
                  {a}
                </motion.span>
              ))}
            </div>
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: 0.55 }}
              className="text-xs text-foreground/70 ml-1 whitespace-nowrap"
            >
              ★★★★★ avaliação dos profissionais
            </motion.span>
          </div>
        </div>
      </div>

      {/* Marquee contínuo (frases curtas de uso real) */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 w-12 sm:w-24 bg-gradient-to-r from-card/60 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-12 sm:w-24 bg-gradient-to-l from-card/60 to-transparent z-10 pointer-events-none" />

        <div className="flex overflow-hidden py-3 border-t border-white/10">
          <motion.div
            className="flex gap-8 sm:gap-12 shrink-0 pr-8 sm:pr-12"
            animate={{ x: ["0%", "-50%"] }}
            transition={{
              duration: 30,
              ease: "linear",
              repeat: Infinity,
            }}
          >
            {[...frases, ...frases].map((f, i) => (
              <span
                key={i}
                className="text-xs sm:text-sm text-foreground/65 whitespace-nowrap"
              >
                {f}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

const frases = [
  "✓ Treino enviado às 6h todo dia",
  "✓ Inadimplência caiu 38% no 1º mês",
  "✓ 12 alunos novos por indicação",
  "✓ WhatsApp do coach liberou 2h/dia",
  "✓ Dieta automática todo domingo",
  "✓ Cobrança no Pix sem cobrar aluno",
  "✓ Treino recorrente em 1 clique",
  "✓ Feedback de treino por foto",
  "✓ Ranking semanal prendeu a turma",
];
