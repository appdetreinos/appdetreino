import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp, rateLimitKey } from "@/lib/security/rate-limit";
import { ensureCsrf } from "@/lib/security/csrf-helpers";
import { auditLog } from "@/lib/audit/log";

/**
 * POST /api/me/delete-account
 *
 * LGPD art. 18, VI — direito de eliminação.
 *
 * Soft delete: marca `profiles.deleted_at = now()` + revoga sessão.
 * Job CRON (a definir) purga fisicamente após 30 dias.
 *
 * Importante: NÃO deleta o `auth.users` (Supabase gerencia isso após
 * o soft delete ser confirmado).
 * Guard: CSRF + auth + rate-limit.
 */
export async function POST(request: NextRequest) {
  const csrf = await ensureCsrf(request);
  if (!csrf.ok) return csrf.response;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  // Rate limit: 3x/dia (anti-bot fazendo delete acidental)
  const ip = getClientIp(request.headers);
  const limit = await checkRateLimit({
    key: rateLimitKey("delete_account", ip, user.id),
    maxAttempts: 3,
    windowMs: 24 * 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limit_exceeded" },
      { status: 429 },
    );
  }

  // Body com confirmação textual
  const body = await request.json().catch(() => null);
  if (!body || body.confirmation !== "DELETE_MY_ACCOUNT") {
    return NextResponse.json(
      { ok: false, error: "confirmation_required", message: "Envie { confirmation: 'DELETE_MY_ACCOUNT' }" },
      { status: 400 },
    );
  }

  // 1) Soft delete
  const { error: softErr } = await supabase
    .from("profiles")
    .update({
      deleted_at: new Date().toISOString(),
      // Limpar PII crítico
      full_name: "[deleted]",
      phone: null,
      avatar_url: null,
      cref: null,
    })
    .eq("id", user.id);

  if (softErr) {
    return NextResponse.json({ ok: false, error: softErr.message }, { status: 500 });
  }

  // 2) Audit
  await auditLog({
    userId: user.id,
    action: "account_deletion_requested",
    resourceType: "user",
    resourceId: user.id,
    metadata: { soft: true },
    ip,
    userAgent: request.headers.get("user-agent"),
  });

  // 3) Sign out (revoga sessão imediatamente)
  await supabase.auth.signOut();

  return NextResponse.json({
    ok: true,
    message:
      "Conta marcada pra exclusão. Os dados serão purgados em até 30 dias. Sua sessão foi encerrada.",
  });
}
