"use client";

import { motion } from "motion/react";
import {
  LayoutDashboard,
  LineChart,
  Salad,
  Dumbbell,
  Video,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "App do aluno" — 6 features numeradas, alternando texto/mockup.
 * Inspirado na seção "Tudo o que o seu aluno precisa, num único app" da Prime.
 *
 * Cada feature tem:
 *  - Número grande (01-06) como elemento gráfico
 *  - Mockup de celular SVG inline (sem depender de imagem externa)
 *  - Texto à esquerda OU direita (alterna)
 *
 * Visual: cards grandes com borda sutil, mockup dentro de "celular" estilizado.
 */

const features = [
  {
    n: "01",
    icon: LayoutDashboard,
    title: "Dashboard do aluno",
    description:
      "Tudo do dia numa tela só: treino, dieta, progresso e recados. O aluno abre o app e sabe exatamente o que fazer hoje — sem te mandar mensagem perguntando.",
    mockup: "dashboard",
  },
  {
    n: "02",
    icon: LineChart,
    title: "Acompanhamento com gráfico",
    description:
      "Peso, medidas e fotos comparadas com gráficos de evolução. Resultado visível é o que faz o aluno renovar — não promessa, mas prova.",
    mockup: "evolucao",
  },
  {
    n: "03",
    icon: Salad,
    title: "Plano alimentar",
    description:
      "Dieta completa dentro do app: refeições, horários, quantidades e lista de compras automática. Chega de PDF perdido na conversa do WhatsApp.",
    mockup: "dieta",
  },
  {
    n: "04",
    icon: Dumbbell,
    title: "Protocolo de treino",
    description:
      "Treino com séries, cargas e registro a cada execução. O aluno marca o que fez e você enxerga a adesão em tempo real, sem precisar perguntar.",
    mockup: "treino",
  },
  {
    n: "05",
    icon: Video,
    title: "Exercícios com vídeo",
    description:
      "Cada exercício com vídeo de execução e orientação de técnica. O aluno treina certo mesmo longe de você — e erra muito menos.",
    mockup: "video",
  },
  {
    n: "06",
    icon: Trophy,
    title: "Comunidade com ranking",
    description:
      "Feed, ranking semanal e desafios que mantêm o aluno engajado entre um check-in e outro. Quem se sente acompanhado não some: fica e evolui.",
    mockup: "comunidade",
  },
];

export function AppShowcase() {
  return (
    <section className="relative py-16 sm:py-20 md:py-28 overflow-hidden">
      {/* Glow azul/laranja sutil ao fundo */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 80% 20%, rgba(255,107,53,0.10), transparent 50%), radial-gradient(circle at 20% 80%, rgba(255,107,53,0.06), transparent 50%)",
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
            O app do aluno
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]">
            Tudo o que o seu aluno precisa,{" "}
            <span className="text-primary">num único app</span>.
          </h2>
        </motion.div>

        {/* Features alternadas */}
        <div className="mt-12 sm:mt-20 space-y-12 sm:space-y-20">
          {features.map((f, i) => {
            const reverse = i % 2 === 1;
            return (
              <motion.div
                key={f.n}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "grid lg:grid-cols-2 gap-8 lg:gap-16 items-center",
                  reverse && "lg:[&>div:first-child]:order-2"
                )}
              >
                {/* Texto */}
                <div>
                  <span className="num text-5xl sm:text-6xl font-extrabold text-primary/30 tabular-nums">
                    {f.n}
                  </span>
                  <h3 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {f.title}
                  </h3>
                  <p className="mt-3 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-md">
                    {f.description}
                  </p>
                </div>

                {/* Mockup */}
                <div className="flex justify-center lg:justify-end">
                  <PhoneMockup variant={f.mockup} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- Phone mockup (SVG inline, 6 variantes) ---------- */

function PhoneMockup({ variant }: { variant: string }) {
  return (
    <div className="relative w-[260px] sm:w-[300px] aspect-[9/19]">
      {/* Glow atrás */}
      <div
        aria-hidden
        className="absolute inset-0 -m-8 rounded-[2.5rem] blur-3xl opacity-50"
        style={{
          background:
            "radial-gradient(circle, rgba(255,107,53,0.35), transparent 70%)",
        }}
      />

      {/* Frame do celular */}
      <div className="relative h-full rounded-[2rem] border-[6px] border-foreground/15 bg-card shadow-2xl overflow-hidden">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 w-24 h-5 bg-foreground/15 rounded-b-2xl" />

        {/* Conteúdo do mockup */}
        <div className="absolute inset-0 pt-7 px-3 pb-3 bg-gradient-to-b from-card to-background">
          {variant === "dashboard" && <MockDashboard />}
          {variant === "evolucao" && <MockEvolucao />}
          {variant === "dieta" && <MockDieta />}
          {variant === "treino" && <MockTreino />}
          {variant === "video" && <MockVideo />}
          {variant === "comunidade" && <MockComunidade />}
        </div>
      </div>
    </div>
  );
}

function ScreenHeader({ title, time = "15:16" }: { title?: string; time?: string }) {
  return (
    <div className="flex items-center justify-between text-[8px] text-muted-foreground font-semibold mb-2">
      <span>{time}</span>
      <span className="flex items-center gap-1">
        <span className="size-1 rounded-full bg-foreground/60" />
        <span className="size-1 rounded-full bg-foreground/60" />
        <span className="size-1 rounded-full bg-foreground/60" />
      </span>
    </div>
  );
}

function MockDashboard() {
  return (
    <div className="h-full flex flex-col">
      <ScreenHeader />
      {/* Saudação */}
      <div className="rounded-lg bg-primary/10 border border-primary/20 p-2 mb-2">
        <div className="flex items-center gap-1.5">
          <div className="size-5 rounded-full bg-primary/30" />
          <div>
            <div className="text-[8px] font-bold">Olá, João!</div>
            <div className="text-[7px] text-muted-foreground">5 dias de sequência</div>
          </div>
        </div>
      </div>
      {/* Dia semana */}
      <div className="grid grid-cols-7 gap-0.5 mb-2">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
          <div
            key={i}
            className={cn(
              "size-5 grid place-items-center rounded text-[7px] font-bold",
              i === 4
                ? "bg-primary text-primary-foreground"
                : "bg-white/5 text-muted-foreground"
            )}
          >
            {d}
          </div>
        ))}
      </div>
      {/* Card treino do dia */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 flex-1">
        <div className="text-[7px] uppercase tracking-wider text-primary font-bold">
          Hoje · Treino A
        </div>
        <div className="text-[10px] font-extrabold mt-0.5">TREINO DE PERNA</div>
        <div className="text-[7px] text-muted-foreground">7 exercícios</div>
        <div className="mt-2 rounded-md bg-primary text-primary-foreground text-center py-1.5 text-[8px] font-bold">
          Ver treino →
        </div>
      </div>
      {/* Mini progresso */}
      <div className="mt-2 rounded-lg bg-white/5 border border-white/5 p-2 flex items-center justify-between">
        <div>
          <div className="text-[7px] text-muted-foreground">Peso</div>
          <div className="num text-[10px] font-extrabold">76 kg</div>
        </div>
        <div className="text-[7px] text-emerald-500 font-bold">-2kg</div>
      </div>
    </div>
  );
}

function MockEvolucao() {
  return (
    <div className="h-full flex flex-col">
      <ScreenHeader title="Evolução" />
      <div className="text-[9px] font-bold mb-1">Evolução</div>
      {/* Card peso */}
      <div className="rounded-lg bg-primary/10 border border-primary/20 p-2 mb-2">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[7px] text-muted-foreground">Peso</div>
            <div className="num text-base font-extrabold">76kg</div>
          </div>
          <div className="text-[7px] text-emerald-500 font-bold">-2kg</div>
        </div>
      </div>
      {/* Gráfico simples */}
      <div className="flex-1 rounded-lg bg-white/5 border border-white/5 p-2">
        <div className="text-[7px] text-muted-foreground mb-1">Últimos 30 dias</div>
        <svg viewBox="0 0 100 40" className="w-full h-20">
          <path
            d="M0,20 L15,18 L30,22 L45,15 L60,17 L75,10 L90,12 L100,8"
            stroke="rgb(255,107,53)"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M0,20 L15,18 L30,22 L45,15 L60,17 L75,10 L90,12 L100,8 L100,40 L0,40 Z"
            fill="url(#grad)"
            opacity="0.3"
          />
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(255,107,53)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {/* Medidas */}
      <div className="mt-2 grid grid-cols-3 gap-1">
        {["Cintura", "Quadril", "Peito"].map((m) => (
          <div key={m} className="rounded bg-white/5 p-1 text-center">
            <div className="text-[6px] text-muted-foreground">{m}</div>
            <div className="num text-[8px] font-bold">82cm</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockDieta() {
  const refeicoes = [
    { hora: "07:00", nome: "Café da manhã", check: true },
    { hora: "10:00", nome: "Lanche", check: false },
    { hora: "12:30", nome: "Almoço", check: false },
    { hora: "16:00", nome: "Lanche", check: false },
    { hora: "19:00", nome: "Jantar", check: false },
  ];
  return (
    <div className="h-full flex flex-col">
      <ScreenHeader title="Plano Alimentar" />
      <div className="text-[9px] font-bold mb-1">Minhas refeições</div>
      <div className="space-y-1 flex-1">
        {refeicoes.map((r, i) => (
          <div
            key={i}
            className={cn(
              "rounded-md border p-1.5 flex items-center gap-1.5",
              r.check ? "border-primary/40 bg-primary/10" : "border-white/10 bg-white/5"
            )}
          >
            <div
              className={cn(
                "size-3 rounded-full border-2 grid place-items-center",
                r.check ? "border-primary bg-primary" : "border-white/20"
              )}
            >
              {r.check && <span className="text-[5px] text-primary-foreground">✓</span>}
            </div>
            <div className="flex-1">
              <div className="text-[7px] font-bold">{r.nome}</div>
              <div className="text-[6px] text-muted-foreground">{r.hora} · 500kcal</div>
            </div>
          </div>
        ))}
      </div>
      {/* Lista compras */}
      <div className="mt-1 rounded bg-white/5 border border-white/5 p-1.5 text-center">
        <div className="text-[6px] uppercase text-primary font-bold">Lista de compras</div>
        <div className="text-[7px] text-muted-foreground">12 itens · 4 categorias</div>
      </div>
    </div>
  );
}

function MockTreino() {
  const exercicios = [
    { nome: "Agachamento", sets: "4×10", carga: "60kg" },
    { nome: "Leg press", sets: "3×12", carga: "120kg" },
    { nome: "Cadeira extensora", sets: "3×15", carga: "40kg" },
  ];
  return (
    <div className="h-full flex flex-col">
      <ScreenHeader title="Treino A — Perna" />
      <div className="flex items-center justify-between mb-1">
        <div className="text-[8px] font-bold">TREINO A</div>
        <div className="text-[7px] text-muted-foreground">7 exercícios</div>
      </div>
      <div className="flex-1 space-y-1">
        {exercicios.map((e, i) => (
          <div key={i} className="rounded border border-white/10 bg-white/5 p-1.5">
            <div className="flex justify-between items-center">
              <div className="text-[7px] font-bold">{e.nome}</div>
              <div className="text-[6px] text-primary font-bold">{e.carga}</div>
            </div>
            <div className="text-[6px] text-muted-foreground">{e.sets}</div>
            {/* Mini checkbox grid séries */}
            <div className="flex gap-0.5 mt-1">
              {Array.from({ length: 4 }).map((_, j) => (
                <div
                  key={j}
                  className={cn(
                    "size-2 rounded-sm",
                    j < (i === 0 ? 4 : i === 1 ? 3 : 1)
                      ? "bg-primary"
                      : "bg-white/10"
                  )}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockVideo() {
  return (
    <div className="h-full flex flex-col">
      <ScreenHeader title="Agachamento livre" />
      {/* Player de vídeo simulado */}
      <div className="rounded-lg aspect-video bg-gradient-to-br from-primary/30 to-primary/5 border border-primary/30 grid place-items-center relative overflow-hidden">
        <div className="size-8 rounded-full bg-primary/90 grid place-items-center backdrop-blur-sm">
          <div className="w-0 h-0 border-l-[6px] border-l-primary-foreground border-y-[4px] border-y-transparent ml-0.5" />
        </div>
        <div className="absolute bottom-1 left-1 right-1 h-0.5 bg-white/20 rounded-full">
          <div className="h-full w-1/3 bg-primary rounded-full" />
        </div>
      </div>
      {/* Info */}
      <div className="mt-2">
        <div className="text-[9px] font-bold">Agachamento livre</div>
        <div className="text-[7px] text-muted-foreground">
          Músculos: quadríceps, glúteos, posteriores
        </div>
      </div>
      {/* Notas técnicas */}
      <div className="mt-1.5 space-y-1">
        {["Joelho alinhado com pé", "Coluna neutra", "Descer até 90°"].map((t, i) => (
          <div key={i} className="flex items-start gap-1">
            <div className="size-1 rounded-full bg-primary mt-0.5 shrink-0" />
            <div className="text-[7px] text-foreground/85">{t}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockComunidade() {
  return (
    <div className="h-full flex flex-col">
      <ScreenHeader title="Comunidade" />
      {/* Ranking */}
      <div className="rounded-lg bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/20 p-2 mb-2">
        <div className="text-[7px] uppercase text-primary font-bold mb-1">Ranking semanal</div>
        {[
          { pos: 1, nome: "Ana B.", xp: "2840" },
          { pos: 2, nome: "João P.", xp: "2410" },
          { pos: 3, nome: "Mari O.", xp: "1980" },
        ].map((u) => (
          <div key={u.pos} className="flex items-center gap-1.5 py-0.5">
            <div
              className={cn(
                "size-3 rounded-full grid place-items-center text-[6px] font-black",
                u.pos === 1
                  ? "bg-yellow-500 text-yellow-900"
                  : u.pos === 2
                    ? "bg-zinc-400 text-zinc-900"
                    : "bg-amber-700 text-amber-100"
              )}
            >
              {u.pos}
            </div>
            <div className="flex-1 text-[7px] font-bold">{u.nome}</div>
            <div className="text-[6px] text-muted-foreground">{u.xp} XP</div>
          </div>
        ))}
      </div>
      {/* Posts feed */}
      <div className="space-y-1 flex-1">
        <div className="rounded border border-white/10 bg-white/5 p-1.5">
          <div className="flex items-center gap-1">
            <div className="size-3 rounded-full bg-primary/30" />
            <div className="text-[6px] font-bold">Pedro L.</div>
          </div>
          <div className="text-[6px] text-muted-foreground mt-0.5">
            Completei 5 treinos seguidos! 💪
          </div>
          <div className="flex gap-1 mt-1 text-[6px] text-muted-foreground">
            <span>♥ 12</span>
            <span>💬 3</span>
          </div>
        </div>
        <div className="rounded border border-white/10 bg-white/5 p-1.5">
          <div className="flex items-center gap-1">
            <div className="size-3 rounded-full bg-emerald-500/30" />
            <div className="text-[6px] font-bold">Lucas F.</div>
          </div>
          <div className="text-[6px] text-muted-foreground mt-0.5">
            Bati PR no supino! 80kg ✓
          </div>
        </div>
      </div>
    </div>
  );
}
