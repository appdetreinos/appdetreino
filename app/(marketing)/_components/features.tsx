"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import {
  Dumbbell,
  Salad,
  Calendar,
  Flame,
  CheckSquare,
  ShoppingBasket,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/**
 * Features — carrossel horizontal interativo (drag pra passar).
 *
 * 6 features selecionadas (não 12, não 4 — o número que faz sentido ler).
 * No mobile: scroll horizontal nativo (snappy).
 * No desktop: drag com mouse + setas + indicador de posição.
 *
 * Cada card é grande e destaca 1 benefício principal.
 */

const features = [
  {
    icon: Dumbbell,
    eyebrow: "Treino",
    title: "Editor de treino em 3 cliques",
    big: "Arrasta. Salva. Manda no WhatsApp.",
    description:
      "Biblioteca com 100+ exercícios, ajuste de carga por aluno, templates reutilizáveis. Atribui pra 1 aluno ou turma inteira.",
  },
  {
    icon: Salad,
    eyebrow: "Dieta",
    title: "Plano alimentar com lista de compras",
    big: "Calcula macros. Gera lista. Aluno vai no mercado.",
    description:
      "Calculadora automática de macros por objetivo. Lista de compras semanal sai direto pro aluno — agrupada por categoria.",
  },
  {
    icon: Calendar,
    eyebrow: "Agenda",
    title: "Agendamento com self-booking",
    big: "Você libera horário. Aluno reserva.",
    description:
      "Você define os slots livres, aluno reserva em 1 clique. Sessão presencial, online, avaliação — tudo organizado num calendário só.",
  },
  {
    icon: Flame,
    eyebrow: "WOD",
    title: "Desafio do dia com ranking da turma",
    big: "Cria o WOD. A turma compete. O ranking sai.",
    description:
      "Franco, AMRAP, Cindy… você escolhe. Alunos marcam tempo ou rounds. Ranking em tempo real no app e no WhatsApp.",
  },
  {
    icon: CheckSquare,
    eyebrow: "Hábitos",
    title: "Hábitos que prendem o aluno",
    big: "Água, sono, passos, refeições — você prescreve.",
    description:
      "Atribui hábitos por aluno. Ele marca todo dia no app. Você vê o compliance semanal e ajusta o que precisar.",
  },
  {
    icon: ShoppingBasket,
    eyebrow: "Compras",
    title: "Lista de compras automática",
    big: "Da dieta pra geladeira — sem planilha.",
    description:
      "Gerada direto do plano alimentar, com gramas e categoria. Aluno marca no app enquanto passa no mercado.",
  },
];

export function Features() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [posicao, setPosicao] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const tituloY = useTransform(scrollYProgress, [0, 1], [30, -30]);

  function scroll(direcao: "esq" | "dir") {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector("[data-card]") as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : 320;
    el.scrollBy({ left: direcao === "dir" ? step : -step, behavior: "smooth" });
  }

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / (el.scrollWidth / features.length));
    setPosicao(Math.min(idx, features.length - 1));
  }

  return (
    <section
      ref={sectionRef}
      id="funcionalidades"
      className="relative py-16 sm:py-20 md:py-28 bg-card/50 overflow-hidden"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        {/* Cabeçalho com scroll-reveal parallax */}
        <motion.div style={{ y: tituloY }} className="max-w-2xl">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-primary"
          >
            Funcionalidades
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mt-3 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]"
          >
            Tudo que você faz hoje,{" "}
            <span className="text-primary">num único painel</span>.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl"
          >
            Arrasta pro lado pra ver tudo. 6 coisas que fazem você atender 3× mais alunos.
          </motion.p>
        </motion.div>
      </div>

      {/* Carrossel */}
      <div className="mt-10 sm:mt-14 relative">
        {/* Setas desktop */}
        <div className="hidden md:block absolute inset-y-0 left-2 lg:left-6 z-10 pointer-events-none">
          <button
            onClick={() => scroll("esq")}
            className="pointer-events-auto size-10 grid place-items-center rounded-full bg-background/80 border border-white/10 backdrop-blur hover:border-primary/40 transition-colors mt-[140px]"
            aria-label="Anterior"
          >
            <ChevronLeft className="size-5" />
          </button>
        </div>
        <div className="hidden md:block absolute inset-y-0 right-2 lg:right-6 z-10 pointer-events-none">
          <button
            onClick={() => scroll("dir")}
            className="pointer-events-auto size-10 grid place-items-center rounded-full bg-background/80 border border-white/10 backdrop-blur hover:border-primary/40 transition-colors mt-[140px]"
            aria-label="Próximo"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        {/* Fade nas bordas */}
        <div className="absolute inset-y-0 left-0 w-8 sm:w-16 bg-gradient-to-r from-background/80 to-transparent z-[5] pointer-events-none md:hidden" />
        <div className="absolute inset-y-0 right-0 w-8 sm:w-16 bg-gradient-to-l from-card/30 to-transparent z-[5] pointer-events-none md:hidden" />

        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="flex overflow-x-auto gap-4 px-5 sm:px-6 md:px-16 lg:px-20 snap-x snap-mandatory scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              data-card
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.5,
                delay: i * 0.06,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="snap-center shrink-0 w-[280px] sm:w-[340px] rounded-2xl border border-white/5 bg-background/60 p-6 hover:border-primary/40 transition-colors"
            >
              {/* Ícone grande */}
              <div className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
                <f.icon className="size-6" />
              </div>

              <span className="block mt-5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                {f.eyebrow}
              </span>
              <h3 className="mt-1 text-lg font-extrabold tracking-tight leading-tight">
                {f.title}
              </h3>
              <p className="mt-3 text-sm font-bold text-primary leading-snug">
                {f.big}
              </p>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {f.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Indicador de posição */}
        <div className="mt-6 flex justify-center gap-1.5">
          {features.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                const el = scrollerRef.current;
                if (!el) return;
                const card = el.querySelector("[data-card]") as HTMLElement | null;
                const step = card ? card.offsetWidth + 16 : 320;
                el.scrollTo({ left: i * step, behavior: "smooth" });
              }}
              className={`h-1.5 rounded-full transition-all ${
                posicao === i ? "w-8 bg-primary" : "w-1.5 bg-white/15 hover:bg-white/30"
              }`}
              aria-label={`Ir pra feature ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
