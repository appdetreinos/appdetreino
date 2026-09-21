import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureCsrf } from "./csrf-helpers";
import { safeLog } from "@/lib/log/safe";

/**
 * Guards comuns para Route Handlers mutantes (`/api/me/*`, `/api/community/*`).
 *
 * Combina:
 *   1. Autenticação (cookie Supabase).
 *   2. CSRF token (header x-csrf-token = cookie csrf).
 *   3. Zod parse com schema.
 */

type AuthFailure = { ok: false; response: Response };

export async function requireAuthenticated(
  request: NextRequest,
): Promise<{ ok: true; user: { id: string; email?: string }; supabase: Awaited<ReturnType<typeof createClient>> } | AuthFailure> {
  // CSRF (rejeita se header/cookie faltarem)
  const csrf = await ensureCsrf(request);
  if (!csrf.ok) return { ok: false, response: csrf.response };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 }),
    };
  }
  return { ok: true, user: { id: user.id, email: user.email ?? undefined }, supabase };
}

/** Helper para JSON parsing + Zod validate. */
export async function parseJsonBody<T>(
  request: NextRequest,
  schema: import("zod").ZodType<T>,
): Promise<{ ok: true; data: T } | AuthFailure> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    safeLog.warn("parseJsonBody: invalid JSON", {});
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 }),
    };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    safeLog.warn("parseJsonBody: validation failed", { issues: parsed.error.issues });
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "validation_failed" }, { status: 400 }),
    };
  }
  return { ok: true, data: parsed.data };
}
