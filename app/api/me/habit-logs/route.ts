import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { safeLog } from "@/lib/log/safe";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";
import { todayBR } from "@/lib/utils/date";

const bodySchema = z
  .object({
    habit_id: z.string().uuid(),
    count: z.number().nonnegative().max(1000),
  })
  .strict();

/**
 * POST /api/me/habit-logs
 *
 * Upsert do log de hoje do hábito. UNIQUE (habit_id, logged_at) garante
 * idempotência. RLS garante que habit_id pertece ao student logado.
 * Guard: CSRF + auth.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  const today = todayBR();

  // Conta anterior de hoje (pra premiar só ao BATER a meta, não a cada clique)
  const [{ data: habit }, { data: prevLog }] = await Promise.all([
    auth.supabase
      .from("habits")
      .select("target_count")
      .eq("id", body.data.habit_id)
      .eq("student_id", auth.user.id)
      .maybeSingle(),
    auth.supabase
      .from("habit_logs")
      .select("count")
      .eq("habit_id", body.data.habit_id)
      .eq("logged_at", today)
      .maybeSingle(),
  ]);

  const { error } = await auth.supabase
    .from("habit_logs")
    .upsert(
      {
        habit_id: body.data.habit_id,
        student_id: auth.user.id,
        logged_at: today,
        count: body.data.count,
      },
      { onConflict: "habit_id,logged_at" },
    );

  if (error) {
    safeLog.error("[habit-logs] upsert failed", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // +5 XP ao bater a meta do dia (só na virada)
  try {
    const target = (habit as { target_count?: number } | null)?.target_count ?? 1;
    const before = (prevLog as { count?: number } | null)?.count ?? 0;
    if (before < target && body.data.count >= target) {
      const { data: sp } = await auth.supabase
        .from("student_profiles")
        .select("xp_total")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      const xp = (sp as { xp_total?: number } | null)?.xp_total ?? 0;
      await auth.supabase
        .from("student_profiles")
        .update({ xp_total: xp + 5 })
        .eq("user_id", auth.user.id);
    }
  } catch (e) {
    safeLog.error("[habit-logs] xp failed", e instanceof Error ? e.message : "unknown");
  }

  return NextResponse.json({ ok: true });
}
