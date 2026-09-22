"use client";

import { motion } from "motion/react";
import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Painel financeiro — gestão de negócio.
 * Inspirado na seção "Gestão financeira · Você no controle do negócio" da Prime.
 *
 * Lado esquerdo: lista de renovações de hoje (cards com avatar + valor)
 * Lado direito: receita acumulada com mini-gráfico de linha
 *
 * Visual: cards grandes, números em destaque, contraste claro.
 */

const renovacoes = [
  { iniciais: "ML", nome: "Mariana Lopes", plano: "Plano trimestral", valor: 447, status: "pago" as const },
  { iniciais: "CE", nome: "Carlos Eduardo", plano: "Plano mensal", valor: 149, status: "hoje" as const },
  { iniciais: "AB", nome: "Ana Beatriz", plano: "Plano semestral", valor: 539, status: "pago" as const },
  { iniciais: "JP", nome: "João Pedro", plano: "Plano anual", valor: 1709, status: "pago" as const },
];

const receita12Meses = [
  { mes: "Jul", valor: 18 },
  { mes: "Ago", valor: 22 },
  { mes: "Set", valor: 19 },
  { mes: "Out", valor: 26 },
  { mes: "Nov", valor: 28 },
  { mes: "Dez", valor: 31 },
  { mes: "Jan", valor: 33 },
  { mes: "Fev", valor: 36 },
  { mes: "Mar", valor: 38 },
  { mes: "Abr", valor: 35 },
  { mes: "Mai", valor: 41 },
  { mes: "Jun", valor: 44 },
];

export function FinancePanel() {
  // Normaliza pra escala 0-100
  const max = Math.max(...receita12Meses.map((r) => r.valor));
  const pontos = receita12Meses
    .map((r, i) => {
      const x = (i / (receita12Meses.length - 1)) * 100;
      const y = 100 - (r.valor / max) * 80 - 10; // reserva 10% topo
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <section className="relative py-16 sm:py-20 md:py-28 overflow-hidden">
      {/* Glow sutil */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 50%, rgba(255,107,53,0.08), transparent 50%)",
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
            Gestão financeira
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]">
            Você no <span className="text-primary">controle do negócio</span>.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            A visão completa da sua consultoria: quanto entra, quanto renova e pra onde o negócio
            está indo.
          </p>
        </motion.div>

        {/* Painel split */}
        <div className="mt-10 sm:mt-14 grid lg:grid-cols-2 gap-5 sm:gap-6">
          {/* Renovações de hoje */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-white/10 bg-card p-5 sm:p-6"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Renovações de hoje
            </span>
            <ul className="mt-4 space-y-3">
              {renovacoes.map((r, i) => (
                <motion.li
                  key={r.nome}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-background/40 p-3"
                >
                  <div className="size-10 rounded-full bg-primary/15 grid place-items-center text-primary font-black text-xs shrink-0">
                    {r.iniciais}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{r.nome}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.plano}</div>
                  </div>
                  {r.status === "pago" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-xs font-bold text-emerald-500 num tabular-nums shrink-0">
                      <Check className="size-3" />
                      R$ {r.valor.toLocaleString("pt-BR")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-xs font-bold text-amber-500 shrink-0">
                      <Clock className="size-3" />
                      renova hoje
                    </span>
                  )}
                </motion.li>
              ))}
            </ul>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Nenhum Pix esquecido.
            </p>
          </motion.div>

          {/* Receita acumulada */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-white/10 bg-card p-5 sm:p-6"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Receita acumulada
            </span>
            <div className="mt-3">
              <div className="num text-4xl sm:text-5xl font-extrabold tabular-nums">
                R$ 335.248,90
              </div>
              <div className="text-xs text-muted-foreground mt-1">últimos 12 meses</div>
            </div>

            {/* Mini-gráfico */}
            <div className="mt-6 rounded-xl bg-background/40 border border-white/5 p-3">
              <svg viewBox="0 0 100 60" className="w-full h-32" preserveAspectRatio="none">
                {/* Grid linhas */}
                <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(255,255,255,0.05)" strokeWidth="0.2" />
                <line x1="0" y1="40" x2="100" y2="40" stroke="rgba(255,255,255,0.05)" strokeWidth="0.2" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.05)" strokeWidth="0.2" />

                {/* Linha */}
                <polyline
                  points={pontos}
                  fill="none"
                  stroke="rgb(255,107,53)"
                  strokeWidth="0.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Área sob a linha */}
                <polygon
                  points={`${pontos} 100,60 0,60`}
                  fill="url(#financeGrad)"
                  opacity="0.4"
                />

                {/* Pontos */}
                {receita12Meses.map((r, i) => {
                  const x = (i / (receita12Meses.length - 1)) * 100;
                  const y = 100 - (r.valor / max) * 80 - 10;
                  return (
                    <circle
                      key={r.mes}
                      cx={x}
                      cy={y}
                      r={i === receita12Meses.length - 1 ? 1.4 : 0.6}
                      fill={i === receita12Meses.length - 1 ? "rgb(255,107,53)" : "rgba(255,107,53,0.4)"}
                    />
                  );
                })}

                <defs>
                  <linearGradient id="financeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(255,107,53)" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="rgb(255,107,53)" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Labels eixo X */}
              <div className="mt-2 grid grid-cols-12 text-[8px] sm:text-[9px] text-muted-foreground">
                {receita12Meses.map((r) => (
                  <div key={r.mes} className="text-center">
                    {r.mes}
                  </div>
                ))}
              </div>
            </div>

            {/* Badges */}
            <div className="mt-5 flex flex-wrap gap-2">
              <BadgeCheck icon="↓" label="Menos cancelamento" />
              <BadgeCheck icon="↑" label="Mais renovação" />
              <BadgeCheck icon="$" label="Receita previsível" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function BadgeCheck({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-500">
      <span className="num">{icon}</span>
      <Check className="size-3" />
      {label}
    </span>
  );
}
