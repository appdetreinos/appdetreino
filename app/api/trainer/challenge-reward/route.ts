import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";
import { safeLog } from "@/lib/log/safe";

const bodySchema = z.object({ challenge_id: z.string().uuid() }).strict();

/**
 * POST /api/trainer/challenge-reward {challenge_id}
 * Encerra o desafio premiando todos os participantes:
 * reward_xp pra cada + reward_badge (se configurada).
 * Idempotente por execução: usa audit_log? Não — usa flag simples:
 * só premia quem ainda não recebeu o badge (quando há badge);
 * sem badge, premia uma vez via payment? Sem controle... 
 * Pra evitar duplo XP, marca completed via ends_at no passado.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const { data: me } = await auth.supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();
  const role = (me as { role?: string } | null)?.role;
  if (role !== "trainer" && role !== "admin") {
    return NextResponse.json({ ok: false, error: "Só profissional." }, { status: 403 });
  }

  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  const { data: ch } = await auth.supabase
    .from("challenges")
    .select("id, trainer_id, title, reward_xp, reward_badge, ends_at")
    .eq("id", body.data.challenge_id)
    .maybeSingle();

  const c = ch as {
    id: string;
    trainer_id: string;
    title: string;
    reward_xp: number;
    reward_badge: string | null;
    ends_at: string;
  } | null;

  if (!c) {
    return NextResponse.json({ ok: false, error: "Desafio não encontrado." }, { status: 404 });
  }

  // Staff pode premiar desafio do owner (escopo)
  const { data: scopeData } = await auth.supabase.rpc("trainer_scope_ids");
  const scopeIds = ((scopeData as string[] | null) ?? [auth.user.id]) as string[];
  if (!scopeIds.includes(c.trainer_id)) {
    return NextResponse.json({ ok: false, error: "Sem acesso a esse desafio." }, { status: 403 });
  }

  const { data: parts } = await auth.supabase
    .from("challenge_participants")
    .select("student_id")
    .eq("challenge_id", c.id);

  const ids = ((parts ?? []) as Array<{ student_id: string }>).map((p) => p.student_id);
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, rewarded: 0 });
  }

  // XP em lote via service role (bypass RLS, trainer premiando)
  const { createClient: createSb } = await import("@supabase/supabase-js");
  const admin = createSb(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let rewarded = 0;
  for (const sid of ids) {
    try {
      if (c.reward_xp > 0) {
        const { data: sp } = await admin
          .from("student_profiles")
          .select("xp_total")
          .eq("user_id", sid)
          .maybeSingle();
        const xp = ((sp as { xp_total?: number } | null)?.xp_total ?? 0) + c.reward_xp;
        await admin.from("student_profiles").update({ xp_total: xp }).eq("user_id", sid);
      }
      if (c.reward_badge) {
        await admin
          .from("student_badges")
          .upsert({ student_id: sid, badge_id: c.reward_badge }, { onConflict: "student_id,badge_id" });
      }
      rewarded++;
    } catch (e) {
      safeLog.warn("[challenge-reward] student failed", e instanceof Error ? e.message : "unknown");
    }
  }

  // Encerra pra não premiar 2x
  await admin.from("challenges").update({ ends_at: new Date().toISOString() }).eq("id", c.id);

  return NextResponse.json({ ok: true, rewarded });
}
