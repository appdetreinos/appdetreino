// Tipos centrais do Viva FIT APP — fonte única de verdade

export type Role = "trainer" | "student" | "admin";

export type PlanTier = "start" | "pro" | "top";

export interface Plan {
  id: PlanTier;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  studentLimit: number | null; // null = ilimitado
  features: string[];
  highlight?: boolean;
  cta: string;
}

export const PLANS: Plan[] = [
  {
    id: "start",
    name: "Start",
    priceMonthly: 1.0,
    priceAnnual: 9.0,
    studentLimit: 15,
    features: [
      "Até 15 alunos ativos",
      "Editor de treino e dieta",
      "Cobrança automática via Pix (mensagem WhatsApp)",
      "Disparo de mensagens por WhatsApp",
      "Suporte por e-mail",
    ],
    cta: "Começar com Start",
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 1.0,
    priceAnnual: 9.0,
    studentLimit: 45,
    features: [
      "Até 45 alunos ativos",
      "Tudo do Start",
      "Avaliação física com fotos e medidas",
      "Comunidade com feed e ranking",
      "Desafios e gamificação com XP",
      "Templates prontos de mensagem",
    ],
    highlight: true,
    cta: "Quero o Pro",
  },
  {
    id: "top",
    name: "Top",
    priceMonthly: 1.0,
    priceAnnual: 9.0,
    studentLimit: null,
    features: [
      "Alunos ilimitados",
      "Tudo do Pro",
      "Multi-colaborador (time inteiro)",
      "Onboarding assistido por vídeo",
      "White-label na landing do aluno",
      "Suporte prioritário via WhatsApp",
    ],
    cta: "Quero sem limites",
  },
];

export const TRIAL_DAYS = 3;

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

/** Converte reais (59.9) → centavos (5990). Usado na cobrança. */
export function formatCents(real: number): number {
  return Math.round(real * 100);
}