import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp, rateLimitKey } from "@/lib/security/rate-limit";
import { safeLog } from "@/lib/log/safe";
import { auditLog } from "@/lib/audit/log";

/**
 * POST /api/auth/forgot-password
 *
 * Body: { email: string }
 *
 * Resposta SEMPRE a mesma — anti-enumeração.
 *
 * 1. Rate limit: 3 req/hora por IP+email.
 * 2. Se rate-limited → retorna 200 mesmo assim (UX consistente, sem dica).
 * 3. Se email existe → dispara reset via Supabase auth.
 * 4. Audit log estruturado.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const ip = getClientIp(request.headers);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || email.length > 254 || !email.includes("@")) {
    // Resposta genérica mesmo pra email inválido
    return NextResponse.json({ ok: true });
  }

  // Rate limit (anti-spam)
  const limit = await checkRateLimit({
    key: rateLimitKey("forgot_password", ip, email),
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    safeLog.warn("[forgot-password] rate-limited", { ip });
    return NextResponse.json({ ok: true });
  }

  const supabase = await createServiceClient();

  // Dispara reset (Supabase resolve internamente se email existe)
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/recuperar/redefinir`,
  });

  if (error) {
    safeLog.error("[forgot-password] supabase error", error.message);
  }

  await auditLog({
    userId: null,
    action: "forgot_password_requested",
    resourceType: "auth",
    resourceId: null,
    metadata: { ip },
  });

  return NextResponse.json({ ok: true });
}
