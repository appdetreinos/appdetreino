import Link from "next/link";
import { Clock, Sparkles } from "lucide-react";
import { TRIAL_DAYS } from "@/lib/types/billing";

/**
 * Banner de trial ativo. Aparece acima do header em qualquer rota /app/*
 * enquanto `daysLeft > 0`. Server component — não precisa de JS.
 *
 * Não mostra se `daysLeft === 0` (lockout faz o redirect antes disso).
 */

type Variant = "ongoing" | "ending";

function pickVariant(daysLeft: number): Variant {
  return daysLeft <= 1 ? "ending" : "ongoing";
}

export function TrialBanner({ daysLeft }: { daysLeft: number }) {
  if (daysLeft <= 0) return null;
  const variant = pickVariant(daysLeft);

  const styles =
    variant === "ending"
      ? {
          bg: "bg-rose-500/10",
          border: "border-rose-500/40",
          icon: "text-rose-500",
          title: "text-rose-500",
        }
      : {
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/30",
          icon: "text-emerald-500",
          title: "text-emerald-500",
        };

  const trialLabel =
    daysLeft === 1
      ? "Último dia de trial"
      : `${daysLeft} de ${TRIAL_DAYS} dias de trial`;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-between gap-3 border-b ${styles.border} ${styles.bg} px-4 py-2 text-sm`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {variant === "ending" ? (
          <Clock className={`size-4 ${styles.icon} shrink-0`} />
        ) : (
          <Sparkles className={`size-4 ${styles.icon} shrink-0`} />
        )}
        <span className={`font-bold ${styles.title} shrink-0`}>{trialLabel}</span>
        <span className="text-foreground/75 truncate">
          {variant === "ending"
            ? "Escolhe um plano pra continuar usando depois de hoje."
            : "Explore tudo. Sem cartão, sem cobrança."}
        </span>
      </div>
      <Link
        href="/app/settings/upgrade"
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
      >
        Escolher plano
      </Link>
    </div>
  );
}
