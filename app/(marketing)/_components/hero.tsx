"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate, useInView } from "motion/react";
import { ButtonLink } from "@/components/ui/button-link";
import { ArrowRight, Flame, Activity, DollarSign, Users, CheckCircle2 } from "lucide-react";

/**
 * Hero "Viva FIT APP" — mobile-first, sem cara de IA.
 *
 * Mockup: "console do trainer" — não é WhatsApp do aluno.
 * Mostra widgets que animam em sequência, como se o sistema
 * estivesse trabalhando pelo trainer em tempo real.
 *
 * Princípios de movimento:
 *  - Widgets aparecem com stagger (não fade genérico)
 *  - Toasts "pingam" do topo (notificação real)
 *  - Counter de alunos ativos sobe de 0
 *  - Gráfico de receita desenha a linha
 */

const headlineParte1 = "Menos planilha.";
const headlineParte2 = "Mais aluno.";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Glow + textura sutil */}
      <div
        className="absolute inset-0 -z-10 opacity-50 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 20%, rgba(255,107,53,0.18), transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,107,53,0.08), transparent 50%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-5 pt-12 pb-16 sm:px-6 sm:pt-20 md:pt-28 md:pb-24">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Lado esquerdo */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-primary"
            >
              <motion.span
                animate={{ rotate: [0, -8, 8, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
              >
                <Flame className="size-3.5" />
              </motion.span>
              Feito pra personal trainer BR
            </motion.div>

            <h1 className="mt-5 sm:mt-6 font-extrabold leading-[1.05] tracking-tight">
              {/* Mobile: 1 linha */}
              <span className="block sm:hidden text-4xl">
                {palavrasAnimadas(headlineParte1, 0.02)}
                {palavrasAnimadas(headlineParte2, 0.18)}
              </span>

              {/* Desktop: CAIXA ALTA com palavra-chave laranja */}
              <span className="hidden sm:block text-5xl md:text-6xl lg:text-7xl">
                <span className="block text-foreground">MENOS PLANILHA.</span>
                <span className="block text-primary mt-1">MAIS ALUNO NA ACADEMIA.</span>
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="mt-5 sm:mt-6 text-base sm:text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed"
            >
              O <strong className="text-foreground">Viva FIT APP</strong> centraliza alunos,
              treinos, dietas e cobrança. E dispara tudo no WhatsApp — sem você digitar.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.65 }}
              className="mt-7 sm:mt-10 flex flex-col sm:flex-row gap-3"
            >
              <CTAButton href="/register" variant="default">
                Começar 3 dias grátis
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </CTAButton>
              <CTAButton href="#planos" variant="outline">
                Ver planos
              </CTAButton>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="mt-4 text-xs text-muted-foreground"
            >
              Sem cartão · Cancele quando quiser
            </motion.p>

            {/* Faixa mobile — substitui o mockup */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.95 }}
              className="lg:hidden mt-8 flex items-center gap-3 rounded-full border border-white/10 bg-card/60 px-4 py-2.5 text-xs"
            >
              <span className="grid size-7 place-items-center rounded-full bg-primary/15 text-primary">
                <Activity className="size-3.5" />
              </span>
              <span className="text-muted-foreground">
                <strong className="text-foreground">24 alunos ativos</strong> · R$ 7.240 no mês
                sem você cobrar ninguém
              </span>
            </motion.div>
          </div>

          {/* Lado direito — Console do Trainer (não WhatsApp) */}
          <motion.div
            initial={{ opacity: 0, y: 24, rotate: -1 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:block lg:col-span-5"
          >
            <TrainerConsole />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ---------- helpers ---------- */

function palavrasAnimadas(frase: string, delayInicial = 0) {
  const palavras = frase.split(" ");
  return palavras.map((p, i) => (
    <motion.span
      key={i}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.32,
        delay: delayInicial + i * 0.04,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="inline-block mr-2"
    >
      {p}
    </motion.span>
  ));
}

function CTAButton({
  href,
  variant,
  children,
}: {
  href: string;
  variant: "default" | "outline";
  children: React.ReactNode;
}) {
  const isDefault = variant === "default";
  return (
    <ButtonLink
      href={href}
      size="lg"
      variant={variant}
      className="group relative overflow-hidden text-base font-semibold h-12 px-6"
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 -left-full w-1/2 -skew-x-12 transition-all duration-700 group-hover:left-full ${
          isDefault ? "bg-white/20" : "bg-primary/20"
        }`}
      />
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </ButtonLink>
  );
}

/* ---------- Console do Trainer ---------- */

function TrainerConsole() {
  return (
    <div className="relative mx-auto max-w-md">
      <div
        className="absolute inset-0 -m-8 rounded-3xl opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(255,107,53,0.35), transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="relative rounded-2xl border border-white/10 bg-card p-4 shadow-2xl">
        {/* Header — janela fake */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-red-500/60" />
            <span className="size-2.5 rounded-full bg-yellow-500/60" />
            <span className="size-2.5 rounded-full bg-emerald-500/60" />
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">app.vivafit.com.br</span>
        </div>

        <div className="rounded-xl bg-background p-4 space-y-3 min-h-[400px]">
          {/* Toasts que "pingam" do topo em sequência */}
          <ToastStack />

          {/* Grid de widgets */}
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <WidgetAlunos />
            <WidgetReceita />
            <WidgetTreinosEnviados className="col-span-2" />
            <WidgetCobrancas className="col-span-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** 3 toasts que aparecem em sequência (sistema trabalhando). */
function ToastStack() {
  const toasts = [
    { tempo: 0.5, icone: Users, titulo: "+1 novo aluno", detalhe: "Pedro Lima aceitou convite" },
    { tempo: 2.0, icone: DollarSign, titulo: "Pagamento recebido", detalhe: "R$ 250,00 via Pix · Mariana O." },
    { tempo: 3.5, icone: CheckCircle2, titulo: "Treino concluído", detalhe: "Ana B. finalizou peito + tríceps" },
  ];

  return (
    <div className="space-y-2">
      {toasts.map((t, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: -16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.5,
            delay: t.tempo,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-card/60 px-3 py-2"
        >
          <div className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
            <t.icone className="size-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate">{t.titulo}</div>
            <div className="text-[10px] text-muted-foreground truncate">{t.detalhe}</div>
          </div>
          <span className="text-[9px] text-muted-foreground font-mono shrink-0">
            {t.tempo < 2 ? "agora" : t.tempo < 3 ? "1min" : "3min"}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

/** Widget: alunos ativos (com counter animado). */
function WidgetAlunos() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 5.0 }}
      className="rounded-lg border border-white/5 bg-card/60 p-3"
    >
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
        <Users className="size-3" />
        Alunos ativos
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <Counter valor={24} />
        <span className="text-[10px] text-emerald-500 font-semibold num tabular-nums">+4</span>
      </div>
    </motion.div>
  );
}

/** Widget: receita do mês (counter + delta). */
function WidgetReceita() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 5.3 }}
      className="rounded-lg border border-white/5 bg-card/60 p-3"
    >
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
        <DollarSign className="size-3" />
        Receita do mês
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="text-[10px] text-muted-foreground">R$</span>
        <CounterReais valor={7240} />
      </div>
      <div className="text-[10px] text-emerald-500 font-semibold mt-0.5">+18% vs mês passado</div>
    </motion.div>
  );
}

/** Widget: treinos enviados hoje (com mini-barra animada). */
function WidgetTreinosEnviados({ className = "" }: { className?: string }) {
  const total = 22;
  const enviados = 18;
  const pct = Math.round((enviados / total) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 5.6 }}
      className={`rounded-lg border border-white/5 bg-card/60 p-3 ${className}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
          <Activity className="size-3" />
          Treinos enviados hoje
        </div>
        <span className="text-xs font-bold num tabular-nums">
          {enviados}/{total}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, delay: 5.9, ease: "easeOut" }}
          className="h-full bg-primary rounded-full"
        />
      </div>
      <div className="text-[10px] text-muted-foreground mt-1">
        Faltam {total - enviados} pro dia terminar
      </div>
    </motion.div>
  );
}

/** Widget: cobranças que entraram hoje (lista que cresce). */
function WidgetCobrancas({ className = "" }: { className?: string }) {
  const cobrancas = [
    { aluno: "Mariana O.", valor: 250, delay: 6.2 },
    { aluno: "Pedro L.", valor: 300, delay: 6.6 },
    { aluno: "Ana B.", valor: 280, delay: 7.0 },
    { aluno: "Lucas F.", valor: 290, delay: 7.4 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 5.9 }}
      className={`rounded-lg border border-white/5 bg-card/60 p-3 ${className}`}
    >
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
        <DollarSign className="size-3" />
        Cobranças de hoje
      </div>
      <div className="space-y-1">
        {cobrancas.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: c.delay }}
            className="flex items-center justify-between text-xs"
          >
            <span className="truncate">{c.aluno}</span>
            <span className="font-bold text-emerald-500 num tabular-nums shrink-0">
              R$ {c.valor}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ---------- Counters animados ---------- */

function Counter({ valor }: { valor: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toString());
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, valor, { duration: 1.5, ease: "easeOut" });
    return controls.stop;
  }, [inView, count, valor]);

  return (
    <motion.span ref={ref} className="num text-2xl font-extrabold tabular-nums">
      {rounded}
    </motion.span>
  );
}

function CounterReais({ valor }: { valor: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) =>
    Math.round(v).toLocaleString("pt-BR")
  );
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, valor, { duration: 1.8, ease: "easeOut" });
    return controls.stop;
  }, [inView, count, valor]);

  return (
    <motion.span ref={ref} className="num text-xl font-extrabold tabular-nums">
      {rounded}
    </motion.span>
  );
}
