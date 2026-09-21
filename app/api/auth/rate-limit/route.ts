import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, getClientIp, rateLimitKey } from "@/lib/security/rate-limit";
import { safeLog } from "@/lib/log/safe";

/**
 * POST /api/auth/rate-limit
 *
 * Body: { action: "login" | "register" | "forgot_password", identifier: string }
 *
 * Verifica se IP+identifier pode prosseguir.
 * Cliente checa isso ANTES de submeter o form (UX melhor — feedback
 * imediato em vez de erro após tentar).
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.action !== "string") {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const ip = getClientIp(request.headers);
  const identifier = typeof body.identifier === "string" ? body.identifier : "";

  const config = {
    login: { maxAttempts: 5, windowMs: 15 * 60 * 1000 },
    register: { maxAttempts: 3, windowMs: 60 * 60 * 1000 },
    forgot_password: { maxAttempts: 3, windowMs: 60 * 60 * 1000 },
  } as const;

  const policy = config[body.action as keyof typeof config];
  if (!policy) {
    return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
  }

  const limit = await checkRateLimit({
    key: rateLimitKey(body.action, ip, identifier),
    maxAttempts: policy.maxAttempts,
    windowMs: policy.windowMs,
  });

  if (!limit.allowed) {
    safeLog.warn("[auth-rate-limit] blocked", { action: body.action, ip });
    return NextResponse.json(
      {
        ok: false,
        allowed: false,
        remaining: 0,
        resetAt: limit.resetAt.toISOString(),
        retryAfterSeconds: Math.ceil((limit.resetAt.getTime() - Date.now()) / 1000),
      },
      { status: 429 },
    );
  }

  return NextResponse.json({
    ok: true,
    allowed: true,
    remaining: limit.remaining,
    resetAt: limit.resetAt.toISOString(),
  });
}
