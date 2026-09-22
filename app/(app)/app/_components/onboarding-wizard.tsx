"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Users,
  DollarSign,
  CreditCard,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Onboarding wizard pós-login do profissional.
 *
 * Inspirado no flow da Prime (4 etapas + modal fullscreen), mas com:
 *  - Tom próprio (Viva FIT APP) e sem chat de help flutuante
 *  - Steps 1-3 coletam perfil (atuação, volume, faturamento)
 *  - Step 4 é a oferta de plano com toggle Mensal/Anual e CTAs
 *    "Testar grátis" / "Assinar agora" (cartão)
 *  - Persiste em trainer_profiles (actuation, client_volume,
 *    monthly_revenue, onboarding_step, onboarding_completed_at)
 *  - Pode ser pulado a qualquer momento ("Pular por agora")
 *  - Não pode ser fechado pelo ESC ou clique-fora — bloqueia o
 *    dashboard até terminar (igual Prime) — mas tem botão X pra
 *    fechar quando terminar
 */

type Actuation = "personal" | "nutri" | "ambos" | "coach";
type ClientVolume = "ate_25" | "26_50" | "51_100" | "mais_100";
type Revenue = "ate_5k" | "5k_10k" | "10k_30k" | "acima_30k";

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [actuation, setActuation] = useState<Actuation | null>(null);
  const [clientVolume, setClientVolume] = useState<ClientVolume | null>(null);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [annual, setAnnual] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Defesa em profundidade: se nesta sessão o user já fechou/pulou,
  // nem renderiza o modal. A persistência real vem do
  // `onboarding_completed_at` no banco (controlado pelo servidor em /app).
  const [initiallyDismissed, setInitiallyDismissed] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem("onboarding_dismissed") === "1") {
        setInitiallyDismissed(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const totalSteps = 4;

  // Bloqueia scroll do body enquanto o wizard tá aberto + ESC fecha
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Fecha o wizard quando o user termina (step 5 = fechamento)
  // OU quando pula — em ambos os casos gravamos flag no sessionStorage
  // pra que mesmo se o update do banco falhe (ex: trainer_profiles
  // faltando), o modal não reapareça NA MESMA SESSÃO.
  // A persistência cross-session vem do `onboarding_completed_at` no banco.
  function markDismissedLocally() {
    try {
      sessionStorage.setItem("onboarding_dismissed", "1");
    } catch {
      // ignore
    }
  }
  const [done, setDone] = useState(false);

  async function saveAndAdvance() {
    setSaving(true);
    setErrorMsg(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const patch: Record<string, unknown> = { onboarding_step: step + 1 };
      if (step === 1 && actuation) patch.actuation = actuation;
      if (step === 2 && clientVolume) patch.client_volume = clientVolume;
      if (step === 3 && revenue) patch.monthly_revenue = revenue;
      if (step === 4) {
        patch.onboarding_completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("trainer_profiles")
        .update(patch)
        .eq("user_id", user.id);

      if (error) {
        console.error("[onboarding] save error", error);
        setErrorMsg(
          "Não consegui salvar teu progresso. Verifica tua conexão e tenta de novo. " +
            "Se persistir, dá um F5 que a gente segue.",
        );
        // Continua mesmo assim — UX não trava
      }

      if (step === 4) {
        markDismissedLocally();
        setDone(true);
        router.refresh();
        return;
      }

      setStep((s) => s + 1);
    } finally {
      setSaving(false);
    }
  }

  async function skip() {
    setSaving(true);
    setErrorMsg(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Tenta persistir, mas mesmo se falhar, fecha o modal
        // e grava cookie pra não voltar. (Defesa em profundidade.)
        await supabase
          .from("trainer_profiles")
          .update({ onboarding_completed_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .then(({ error }) => {
            if (error) console.warn("[onboarding] skip save warn", error.message);
          });
      }
      markDismissedLocally();
      setDone(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function back() {
    if (step > 1) setStep((s) => s - 1);
  }

  // Calcula plano sugerido baseado no volume + faturamento
  const suggestedPlan = suggestPlan(clientVolume, revenue);

  if (done || initiallyDismissed) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop com blur */}
      <div className="absolute inset-0 bg-background/85 backdrop-blur-md" />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-card p-6 shadow-2xl sm:p-8 animate-fade-in-up"
      >
        {/* Header: barra de progresso + step counter + X */}
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                s <= step ? "bg-primary" : "bg-white/10"
              )}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Etapa {step} de {totalSteps}
          </span>
          <button
            type="button"
            onClick={skip}
            disabled={saving}
            className="grid size-7 place-items-center rounded-md text-foreground/60 transition-colors hover:bg-white/5 hover:text-foreground"
            aria-label="Pular por agora"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Conteúdo da etapa */}
        <div className="mt-6 min-h-[300px]">
          {step === 1 && (
            <Step1
              key="1"
              value={actuation}
              onChange={(v) => setActuation(v)}
            />
          )}
          {step === 2 && (
            <Step2
              key="2"
              value={clientVolume}
              onChange={(v) => setClientVolume(v)}
            />
          )}
          {step === 3 && (
            <Step3
              key="3"
              value={revenue}
              onChange={(v) => setRevenue(v)}
            />
          )}
          {step === 4 && (
            <Step4
              key="4"
              annual={annual}
              onAnnualChange={setAnnual}
              suggested={suggestedPlan}
              volume={clientVolume}
              revenue={revenue}
            />
          )}
        </div>

        {/* Footer: navegação */}
        <div className="mt-8 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={back}
              disabled={saving}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground/70 transition-colors hover:text-foreground disabled:opacity-50"
            >
              <ChevronLeft className="size-4" />
              Voltar
            </button>
          ) : (
            <button
              type="button"
              onClick={skip}
              disabled={saving}
              className="text-sm font-semibold text-foreground/60 transition-colors hover:text-foreground disabled:opacity-50"
            >
              Pular por agora
            </button>
          )}

          <button
            type="button"
            onClick={saveAndAdvance}
            disabled={
              saving ||
              (step === 1 && !actuation) ||
              (step === 2 && !clientVolume) ||
              (step === 3 && !revenue)
            }
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {step === 4 ? "Começar agora" : "Continuar"}
            <ChevronRight className="size-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * Etapas
 * ============================================================ */

function StepHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/15 text-primary">
        <Icon className="size-5" />
      </span>
      <h2
        id="onboarding-title"
        className="mt-4 text-xl font-extrabold tracking-tight sm:text-2xl"
      >
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

function OptionCard({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center justify-between rounded-xl border bg-background/40 px-4 py-3.5 text-left transition-all active:scale-[0.98]",
        active
          ? "border-primary bg-primary/[0.06] shadow-[0_0_0_1px_rgba(255,107,53,0.4)]"
          : "border-white/10 hover:border-white/20 hover:bg-white/[0.03]"
      )}
    >
      <span
        className={cn(
          "text-sm font-bold transition-colors",
          active ? "text-foreground" : "text-foreground/85"
        )}
      >
        {children}
      </span>
      <span
        className={cn(
          "grid size-8 place-items-center rounded-full transition-all",
          active
            ? "bg-primary text-primary-foreground"
            : "border border-white/10 text-foreground/40 group-hover:border-white/20"
        )}
      >
        {active ? (
          <Check className="size-4" strokeWidth={3} />
        ) : (
          <ChevronRight className="size-4" />
        )}
      </span>
    </button>
  );
}

function StepShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="animate-fade-in">{children}</div>;
}

/* ---------- Etapa 1: Como você atua ---------- */
function Step1({
  value,
  onChange,
}: {
  value: Actuation | null;
  onChange: (v: Actuation) => void;
}) {
  const opcoes: { value: Actuation; label: string; emoji: string }[] = [
    { value: "personal", label: "Personal Trainer", emoji: "💪" },
    { value: "nutri", label: "Nutricionista", emoji: "🥗" },
    { value: "ambos", label: "Personal e Nutricionista", emoji: "⚡" },
    { value: "coach", label: "Fitness Coach", emoji: "🎯" },
  ];
  return (
    <StepShell>
      <StepHeader
        icon={Briefcase}
        title="Como você atua?"
        subtitle="Pra gente montar o painel do jeito que faz sentido pro seu trabalho"
      />
      <div className="mt-6 space-y-2.5">
        {opcoes.map((o) => (
          <OptionCard
            key={o.value}
            active={value === o.value}
            onClick={() => onChange(o.value)}
          >
            <span className="inline-flex items-center gap-2.5">
              <span aria-hidden>{o.emoji}</span>
              {o.label}
            </span>
          </OptionCard>
        ))}
      </div>
    </StepShell>
  );
}

/* ---------- Etapa 2: Quantos alunos ativos ---------- */
function Step2({
  value,
  onChange,
}: {
  value: ClientVolume | null;
  onChange: (v: ClientVolume) => void;
}) {
  const opcoes: { value: ClientVolume; label: string }[] = [
    { value: "ate_25", label: "Até 25 alunos" },
    { value: "26_50", label: "26 a 50 alunos" },
    { value: "51_100", label: "51 a 100 alunos" },
    { value: "mais_100", label: "Mais de 100 alunos" },
  ];
  return (
    <StepShell>
      <StepHeader
        icon={Users}
        title="Quantos alunos ativos você atende hoje?"
        subtitle="Isso ajuda a recomendar o plano certo pra você"
      />
      <div className="mt-6 space-y-2.5">
        {opcoes.map((o) => (
          <OptionCard
            key={o.value}
            active={value === o.value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </OptionCard>
        ))}
      </div>
    </StepShell>
  );
}

/* ---------- Etapa 3: Faturamento ---------- */
function Step3({
  value,
  onChange,
}: {
  value: Revenue | null;
  onChange: (v: Revenue) => void;
}) {
  const opcoes: { value: Revenue; label: string }[] = [
    { value: "ate_5k", label: "Até R$ 5.000" },
    { value: "5k_10k", label: "De R$ 5.000 a R$ 10.000" },
    { value: "10k_30k", label: "De R$ 10.000 a R$ 30.000" },
    { value: "acima_30k", label: "Acima de R$ 30.000" },
  ];
  return (
    <StepShell>
      <StepHeader
        icon={DollarSign}
        title="Qual seu faturamento médio mensal?"
        subtitle="Sem julgamento, é só pra escolhermos o plano certo"
      />
      <div className="mt-6 space-y-2.5">
        {opcoes.map((o) => (
          <OptionCard
            key={o.value}
            active={value === o.value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </OptionCard>
        ))}
      </div>
    </StepShell>
  );
}

/* ---------- Etapa 4: Escolha do plano ---------- */
function Step4({
  annual,
  onAnnualChange,
  suggested,
  volume,
  revenue,
}: {
  annual: boolean;
  onAnnualChange: (v: boolean) => void;
  suggested: "start" | "pro" | "top";
  volume: ClientVolume | null;
  revenue: Revenue | null;
}) {
  const plans = [
    {
      id: "start" as const,
      label: "Standard",
      capacidade: "Até 25 alunos",
      precoMes: 59.9,
      precoAno: 718.8, // 59.9 * 12
      itens: ["Gestão completa de alunos", "Treinos e dietas", "Cobrança recorrente"],
    },
    {
      id: "pro" as const,
      label: "Premium",
      capacidade: "Até 50 alunos",
      precoMes: 99.9,
      precoAno: 1198.8,
      itens: ["Tudo do Standard", "IA gerando treinos", "Comunidade e ranking"],
    },
    {
      id: "top" as const,
      label: "Pro",
      capacidade: "Alunos ilimitados",
      precoMes: 189.9,
      precoAno: 2278.8,
      itens: ["Tudo do Premium", "WhatsApp integrado", "Marca personalizada"],
    },
  ];

  return (
    <StepShell>
      <div className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/15 text-primary">
          <Sparkles className="size-5" />
        </span>
        <h2 className="mt-4 text-xl font-extrabold tracking-tight sm:text-2xl">
          Escolha seu plano
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Comece sua jornada conosco — pode mudar quando quiser
        </p>
      </div>

      {/* Toggle mensal/anual */}
      <div className="mt-5 mx-auto inline-flex w-full items-center justify-center gap-1 rounded-full border border-white/10 bg-background/40 p-1 text-sm">
        <button
          type="button"
          onClick={() => onAnnualChange(false)}
          className={cn(
            "rounded-full px-4 py-1.5 font-semibold transition-colors",
            !annual
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Mensal
        </button>
        <button
          type="button"
          onClick={() => onAnnualChange(true)}
          className={cn(
            "rounded-full px-4 py-1.5 font-semibold transition-colors transition-all",
            annual
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Anual <span className="text-[11px] font-bold text-emerald-500 ml-1">−25%</span>
        </button>
      </div>

      {/* Planos */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {plans.map((p) => {
          const isSuggested = p.id === suggested;
          const preco = annual ? (p.precoAno / 12).toFixed(2).replace(".", ",") : p.precoMes.toFixed(2).replace(".", ",");
          return (
            <div
              key={p.id}
              className={cn(
                "relative rounded-xl border p-3.5",
                isSuggested
                  ? "border-primary bg-primary/[0.04]"
                  : "border-white/10 bg-background/40"
              )}
            >
              {isSuggested && (
                <span className="absolute -top-2.5 left-3 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                  Recomendado
                </span>
              )}
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {p.capacidade}
              </div>
              <div className="mt-1 font-extrabold">{p.label}</div>
              <div className="mt-2 flex items-baseline gap-0.5">
                <span className="text-[10px] text-muted-foreground">R$</span>
                <span className="num text-2xl font-extrabold tracking-tight tabular-nums">
                  {preco}
                </span>
                <span className="text-[11px] text-muted-foreground">/mês</span>
              </div>
              <ul className="mt-2.5 space-y-1">
                {p.itens.slice(0, 2).map((it) => (
                  <li
                    key={it}
                    className="flex items-start gap-1.5 text-[11px] text-foreground/80"
                  >
                    <Check className="size-3 mt-0.5 shrink-0 text-primary" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* CTAs */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <a
            href="/register?trial=1"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-white/15 bg-background/40 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-white/5 sm:flex-none"
          >
            Testar grátis por 10 dias
          </a>
          <a
            href="/app/checkout"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 sm:flex-none"
          >
            <CreditCard className="size-4" />
            Assinar agora
          </a>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Sem cartão agora · cancela quando quiser
        </p>
      </div>

      {/* Sugestão badge embaixo (de onde veio a recomendação) */}
      <div className="mt-5 rounded-lg border border-white/5 bg-background/30 px-3 py-2 text-center text-[11px] text-muted-foreground">
        Sugerimos o <strong className="text-foreground">{plans.find((p) => p.id === suggested)?.label}</strong>
        {volume && (
          <>
            {" "}pelo seu volume de {labelVolume(volume)}
          </>
        )}
        {revenue && (
          <>
            {volume ? " e" : " pelo"} faturamento de {labelRevenue(revenue)}
          </>
        )}
        .
      </div>
    </StepShell>
  );
}

/* ============================================================
 * Helpers
 * ============================================================ */

function suggestPlan(
  volume: ClientVolume | null,
  revenue: Revenue | null
): "start" | "pro" | "top" {
  // Volume é o sinal mais forte
  if (volume === "mais_100" || revenue === "acima_30k" || revenue === "10k_30k") return "top";
  if (volume === "51_100" || volume === "26_50") return "pro";
  return "start";
}

function labelVolume(v: ClientVolume): string {
  return (
    {
      ate_25: "até 25 alunos",
      "26_50": "26 a 50 alunos",
      "51_100": "51 a 100 alunos",
      mais_100: "mais de 100 alunos",
    } as const
  )[v];
}

function labelRevenue(r: Revenue): string {
  return (
    {
      ate_5k: "até R$ 5.000",
      "5k_10k": "R$ 5.000 a R$ 10.000",
      "10k_30k": "R$ 10.000 a R$ 30.000",
      acima_30k: "acima de R$ 30.000",
    } as const
  )[r];
}
