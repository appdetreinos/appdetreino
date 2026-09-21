"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

/**
 * "O problema" — narrativa humana, não lista numerada.
 *
 * Estrutura:
 *  - Pergunta provocativa (cabeça)
 *  - 3 mini-cenas narrativas (coração) — cada uma é uma "história" de
 *    personal trainer, com a frustração em 1 linha + o número da pessoa.
 *  - Frase de virada (rodapé) com borda laranja.
 *
 * Cada cena aparece conforme o usuário rola a tela (scroll-reveal).
 */

const cenas = [
  {
    hora: "21:47",
    titulo: "Você tá fazendo o treino de domingo, 3 da manhã",
    detalhe:
      "Abre Excel de 2019, copia treino, cola em Word, converte em PDF, manda no WhatsApp de 32 alunos. Quando termina, já é quarta.",
  },
  {
    hora: "06:12",
    titulo: "Você manda mensagem pro João pedindo a mensalidade",
    detalhe:
      "Ele visualiza, não responde. Você fica 3 dias sem mandar de novo porque dá vergonha. Quando cobra, ele some.",
  },
  {
    hora: "14:30",
    titulo: "Você abre a lista e tem 4 alunos que sumiram",
    detalhe:
      "Sem aviso, sem feedback, sem plano. Só a fatura do cartão chegando todo mês sem ninguém treinar.",
  },
];

export function Problem() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  // Parallax sutil do background glow
  const glowY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <section ref={ref} id="problema" className="relative py-16 sm:py-20 md:py-28 overflow-hidden">
      {/* Glow laranja sutil no fundo, parallax */}
      <motion.div
        aria-hidden
        style={{ y: glowY }}
        className="absolute -top-20 -right-20 size-80 rounded-full bg-primary/10 blur-3xl pointer-events-none"
      />

      <div className="mx-auto max-w-4xl px-5 sm:px-6 relative">
        {/* Cabeça — pergunta provocativa */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-primary">
            O problema
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]">
            <span className="text-foreground">Você vira </span>
            <span className="text-primary">assistente administrativo</span>
            <span className="text-foreground"> à noite</span>
            <br />
            <span className="text-foreground/70">— em vez de personal trainer de dia.</span>
          </h2>
          <p className="mt-5 text-base sm:text-lg text-foreground/80 max-w-2xl leading-relaxed">
            Cada aluno vira 4 controles diferentes. Treino num lugar, dieta em outro, cobrança em
            conversa de WhatsApp, agenda na cabeça. Vira{" "}
            <strong className="text-foreground">caos</strong>. E aí você trabalha até meia-noite,
            acha que tá ferrado, e acorda pra fazer tudo de novo.
          </p>
        </motion.div>

        {/* 3 cenas narrativas — scroll reveal progressivo */}
        <div className="mt-12 sm:mt-16 space-y-10 sm:space-y-14">
          {cenas.map((c, i) => (
            <motion.div
              key={c.hora}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.7,
                delay: 0.05,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="grid grid-cols-[auto_1fr] gap-5 sm:gap-7 items-start"
            >
              {/* Hora grande */}
              <div className="text-left shrink-0">
                <div className="num text-4xl sm:text-5xl font-extrabold text-primary tabular-nums leading-none">
                  {c.hora}
                </div>
                <div className="mt-2 w-12 h-0.5 bg-primary/30" />
              </div>

              {/* Texto */}
              <div>
                <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight">
                  {c.titulo}
                </h3>
                <p className="mt-3 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
                  {c.detalhe}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Frase de virada */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16 sm:mt-20 max-w-2xl border-l-2 border-primary pl-5 sm:pl-6 py-2"
        >
          <p className="text-lg sm:text-xl leading-relaxed">
            <span className="text-foreground">O problema não é trabalhar.</span>{" "}
            <span className="text-muted-foreground">É trabalhar </span>
            <strong className="text-foreground">sem sistema</strong>
            <span className="text-muted-foreground">
              . Quem atende 10 vira caos. Quem atende 40 vira emprego sem fim. Quem usa o{" "}
            </span>
            <strong className="text-primary">Viva FIT APP</strong>
            <span className="text-muted-foreground">
              {" "}
              atende 40 e vai pra casa às 19h.
            </span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
