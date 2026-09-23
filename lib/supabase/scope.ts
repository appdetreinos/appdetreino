import { createClient } from "@/lib/supabase/server";

/**
 * Escopo multi-colaborador: ids de trainer cujos dados o usuário
 * atual pode operar (próprio + owners onde é staff aceito).
 * Usa a RPC trainer_scope_ids() quando disponível; cai pro próprio id.
 */
export async function getTrainerScopeIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string[]> {
  try {
    const { data, error } = await supabase.rpc("trainer_scope_ids");
    if (!error && Array.isArray(data) && data.length > 0) {
      return data as string[];
    }
  } catch {
    // migration 0050 ainda não aplicada — escopo próprio
  }
  return [userId];
}
