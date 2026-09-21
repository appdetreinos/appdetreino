import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp, rateLimitKey } from "@/lib/security/rate-limit";
import { auditLog } from "@/lib/audit/log";

/**
 * GET /api/me/export-data
 *
 * LGPD art. 18, II — direito de acesso. Exporta todos os dados do usuário
 * logado em JSON. Rate-limited a 1x/dia por usuário.
 */

const TABLES_TO_EXPORT = [
  "profiles",
  "trainer_profiles",
  "student_profiles",
  "workouts",
  "workout_sessions",
  "diets",
  "measurements",
  "payments",
  "habits",
  "habit_logs",
  "wod_participants",
  "community_posts",
  "community_likes",
  "community_comments",
  "student_badges",
  "appointments",
  "anamnesis",
  "payment_messages",
  "trainer_settings",
] as const;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  // Rate limit: 1x/dia por user
  const ip = getClientIp(request.headers);
  const limit = await checkRateLimit({
    key: rateLimitKey("export_data", ip, user.id),
    maxAttempts: 1,
    windowMs: 24 * 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limit_exceeded", resetAt: limit.resetAt.toISOString() },
      { status: 429 },
    );
  }

  // Coleta tudo
  const exportData: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    user_id: user.id,
    email: user.email,
    profile: null as unknown,
  };

  for (const table of TABLES_TO_EXPORT) {
    // Cada tabela tem coluna de user diferente — heurística simples
    const candidates = [
      `user_id=eq.${user.id}`,
      `trainer_id=eq.${user.id}`,
      `student_id=eq.${user.id}`,
      `author_id=eq.${user.id}`,
      `id=eq.${user.id}`,
    ];
    const found: unknown[] = [];
    for (const filter of candidates) {
      // query com count pra ver se tem
      const { data } = await supabase.from(table).select("*").or(filter).limit(1000);
      if (data && data.length > 0) {
        found.push(...data);
      }
    }
    exportData[table] = found;
  }

  // Audit
  await auditLog({
    userId: user.id,
    action: "data_export",
    resourceType: "user",
    resourceId: user.id,
    metadata: { tables: TABLES_TO_EXPORT.length },
    ip,
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json(exportData, {
    status: 200,
    headers: {
      "Content-Disposition": `attachment; filename="meus-dados-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}
