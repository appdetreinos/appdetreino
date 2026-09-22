"use client";

import { motion } from "motion/react";
import { TrendingUp } from "lucide-react";

/**
 * Depoimentos — marquee horizontal contínuo.
 * Inspirado na seção "A plataforma das consultorias que mais crescem" da Prime.
 *
 * 2 fileiras de cards rolando em direções opostas.
 * Cada card tem: avatar (iniciais), função, frase curta, métrica de resultado em laranja.
 */

type Depoimento = {
  iniciais: string;
  nome: string;
  handle: string;
  funcao: string;
  cidade: string;
  resultado: string;
  frase: string;
};

const fileira1: Depoimento[] = [
  {
    iniciais: "RM",
    nome: "Ray Milet",
    handle: "@raymilet",
    funcao: "Pro Coach",
    cidade: "SP",
    resultado: "+R$ 500 mil",
    frase: "Em 1 ano com a consultoria organizada, equipe e clientes recorrentes.",
  },
  {
    iniciais: "DB",
    nome: "Diogo Basaglia",
    handle: "@basa",
    funcao: "IFBB PRO",
    cidade: "RS",
    resultado: "+1M seguidores",
    frase: "App virou meu canal principal de venda de consultoria online.",
  },
  {
    iniciais: "FF",
    nome: "Felipe Franco",
    handle: "@fefranco",
    funcao: "Atleta",
    cidade: "RJ",
    resultado: "+4M seguidores",
    frase: "Gestão de alunos em escala sem perder o acompanhamento humano.",
  },
  {
    iniciais: "VC",
    nome: "Vitor Capial",
    handle: "@vitorcapial",
    funcao: "Treinador",
    cidade: "MG",
    resultado: "+R$ 1 milhão",
    frase: "Em 1 ano. Antes era planilha, WhatsApp e cobrança manual.",
  },
  {
    iniciais: "GF",
    nome: "Gabriel Franciscon",
    handle: "@gafranciscon",
    funcao: "Coach",
    cidade: "PR",
    resultado: "+R$ 100 mil",
    frase: "Em 3 meses. A comunidade segurou a retenção dos alunos.",
  },
  {
    iniciais: "MR",
    nome: "Marco Rebucci",
    handle: "@marcorebucci",
    funcao: "Coach",
    cidade: "BA",
    resultado: "+R$ 3 milhões",
    frase: "Em 12 meses. Escalar com sistema é outro nível de jogo.",
  },
];

const fileira2: Depoimento[] = [
  {
    iniciais: "TB",
    nome: "Tiago Balestrero",
    handle: "@balestreronutribjj",
    funcao: "Nutricionista",
    cidade: "RJ",
    resultado: "+R$ 400 mil",
    frase: "Em 5 meses. Atendo em 51 países sem sair do consultório.",
  },
  {
    iniciais: "BA",
    nome: "Breno Aceti",
    handle: "@breno.aceti",
    funcao: "Coach",
    cidade: "SC",
    resultado: "+R$ 250 mil",
    frase: "Em 3 meses. Treino e dieta sem frescura, com resultado real.",
  },
  {
    iniciais: "PK",
    nome: "PK Gonzaga",
    handle: "@pk.gonzaga",
    funcao: "Mentor",
    cidade: "SP",
    resultado: "+R$ 250 mil",
    frase: "Em 5 meses. Founder da PK Coaching, escalou a operação.",
  },
  {
    iniciais: "VZ",
    nome: "Vitor Zanelato",
    handle: "@zanelato.vitor",
    funcao: "Atleta",
    cidade: "PR",
    resultado: "+R$ 500 mil",
    frase: "Em 1 ano. Consultoria com base científica e tecnologia.",
  },
  {
    iniciais: "EP",
    nome: "Elisa Pecini",
    handle: "@isapecini",
    funcao: "Atleta",
    cidade: "SP",
    resultado: "150 alunos",
    frase: "Ativos. Miss Olympia. O app segura o que a agenda não aguenta.",
  },
  {
    iniciais: "FR",
    nome: "Fernando Ramos",
    handle: "@superman.oficial",
    funcao: "Atleta",
    cidade: "RJ",
    resultado: "+200 mil",
    frase: "Inscritos no YouTube. Comunidade do app virou produto.",
  },
];

export function Testimonials() {
  return (
    <section className="relative py-16 sm:py-20 md:py-28 overflow-hidden border-y border-white/5">
      {/* Glow ao fundo */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-40 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 50%, rgba(255,107,53,0.08), transparent 60%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        {/* Cabeçalho + KPIs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-2xl mx-auto"
        >
          <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-primary">
            Resultados
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]">
            A plataforma das consultorias que mais crescem.
          </h2>
        </motion.div>

        {/* KPIs centralizados */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8 sm:mt-10 grid grid-cols-3 gap-4 sm:gap-6 max-w-2xl mx-auto"
        >
          <KPI valor="+1.200" label="personais na plataforma" />
          <KPI valor="+15 mil" label="alunos acompanhados" />
          <KPI valor="4,9★" label="nota média" />
        </motion.div>
      </div>

      {/* Marquee fileira 1 — esquerda */}
      <div className="relative mt-12 sm:mt-16">
        <div className="absolute inset-y-0 left-0 w-12 sm:w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-12 sm:w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <motion.div
          className="flex gap-4 w-max"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 45, ease: "linear", repeat: Infinity }}
        >
          {[...fileira1, ...fileira1].map((d, i) => (
            <DepoimentoCard key={`a-${i}`} d={d} />
          ))}
        </motion.div>
      </div>

      {/* Marquee fileira 2 — direita */}
      <div className="relative mt-4">
        <div className="absolute inset-y-0 left-0 w-12 sm:w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-12 sm:w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <motion.div
          className="flex gap-4 w-max"
          initial={{ x: "-50%" }}
          animate={{ x: ["-50%", "0%"] }}
          transition={{ duration: 50, ease: "linear", repeat: Infinity }}
        >
          {[...fileira2, ...fileira2].map((d, i) => (
            <DepoimentoCard key={`b-${i}`} d={d} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function KPI({ valor, label }: { valor: string; label: string }) {
  return (
    <div className="text-center">
      <div className="num text-3xl sm:text-4xl md:text-5xl font-extrabold text-primary tabular-nums">
        {valor}
      </div>
      <div className="mt-1 text-xs sm:text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function DepoimentoCard({ d }: { d: Depoimento }) {
  return (
    <div className="shrink-0 w-[300px] sm:w-[340px] rounded-2xl border border-white/10 bg-card p-5 hover:border-primary/40 transition-colors">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="size-12 rounded-full bg-primary/15 border-2 border-background grid place-items-center text-primary font-black text-sm shrink-0">
          {d.iniciais}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">{d.nome}</div>
          <div className="text-xs text-muted-foreground truncate">{d.handle}</div>
          <div className="mt-1 flex gap-1.5 items-center">
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/85">
              {d.funcao}
            </span>
            <span className="text-[10px] text-muted-foreground">{d.cidade}</span>
          </div>
        </div>
      </div>

      {/* Frase */}
      <p className="mt-4 text-sm text-foreground/90 leading-relaxed">{d.frase}</p>

      {/* Métrica destacada */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-1.5">
        <TrendingUp className="size-3.5 text-emerald-500" />
        <span className="num text-sm font-extrabold text-emerald-500 tabular-nums">
          {d.resultado}
        </span>
      </div>
    </div>
  );
}
