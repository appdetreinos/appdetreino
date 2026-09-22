import { createClient } from "@/lib/supabase/server";
import { TRIAL_DAYS } from "@/lib/types/billing";

/**
 * Server-side: status do trial e lockout do trainer.
 *
 * Regras (single source of truth — usada por layout, dashboard e settings):
 *  - inTrial = trial_ends_at existe E trial_ends_at > now()
 *  - hasPaid = existe ao menos 1 payment_links com description 'Plano %' e paid_at setado
 *  - locked  = trial expirou E nunca pagou → redirecionar pro /app/checkout
 *
 * `daysLeft` considera o "dia 1" como o dia do cadastro: se cadastrou hoje,
 * retorna 3 (mostrando "3 dias restantes"). Se expira hoje (último dia),
 * retorna 1.
 */

export type TrainerTrialState = {
  inTrial: boolean;
  trialEndsAt: string | null;
  daysLeft: number; // 0..TRIAL_DAYS, clamped
  hasPaid: boolean;
  locked: boolean;
};

export async function getTrainerTrialState(
  userId: string,
): Promise<TrainerTrialState> {
  const supabase = await createClient();

  const { data: trainer } = await supabase
    .from("trainer_profiles")
    .select("trial_ends_at")
    .eq("user_id", userId)
    .maybeSingle();

  const { count: paidCount } = await supabase
    .from("payment_links")
    .select("id", { count: "exact", head: true })
    .eq("trainer_id", userId)
    .like("description", "Plano %")
    .not("paid_at", "is", null);

  const hasPaid = (paidCount ?? 0) > 0;
  const trialEndsAt = trainer?.trial_ends_at ?? null;
  const inTrial = trialEndsAt ? new Date(trialEndsAt).getTime() > Date.now() : false;

  // daysLeft: ceil((trialEndsAt - now) / 1 dia). Se trial expirado, 0.
  const daysLeft = trialEndsAt
    ? Math.max(
        0,
        Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      )
    : 0;

  const locked = !hasPaid && !inTrial;

  return { inTrial, trialEndsAt, daysLeft, hasPaid, locked };
}
