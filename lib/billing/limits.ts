import { createClient } from "@/lib/supabase/server";
import { PLANS, type PlanTier } from "@/lib/types/billing";

export type StudentLimitState = {
  planTier: PlanTier;
  limit: number | null; // null = ilimitado
  used: number;
  reached: boolean; // used >= limit
  remaining: number | null;
};

/**
 * Single source of truth do limite de alunos ativos por plano.
 * Start 15 · Pro 45 · Top ilimitado (ver PLANS).
 */
export async function getStudentLimitState(userId: string): Promise<StudentLimitState> {
  const supabase = await createClient();

  const { data: trainer } = await supabase
    .from("trainer_profiles")
    .select("plan_tier")
    .eq("user_id", userId)
    .maybeSingle();

  const planTier = ((trainer as { plan_tier?: PlanTier } | null)?.plan_tier ?? "start") as PlanTier;
  const limit = PLANS.find((p) => p.id === planTier)?.studentLimit ?? 15;

  const { count } = await supabase
    .from("student_profiles")
    .select("user_id", { count: "exact", head: true })
    .eq("trainer_id", userId)
    .eq("status", "active");

  const used = count ?? 0;
  return {
    planTier,
    limit,
    used,
    reached: limit != null && used >= limit,
    remaining: limit == null ? null : Math.max(0, limit - used),
  };
}
