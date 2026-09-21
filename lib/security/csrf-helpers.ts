import { requireCsrf, csrfErrorResponse } from "./csrf";
import { safeLog } from "@/lib/log/safe";

/**
 * Helper para adicionar CSRF guard no início de um Route Handler mutante.
 *
 * @example
 *   export async function POST(request: Request) {
 *     const csrf = await ensureCsrf(request);
 *     if (!csrf.ok) return csrf.response;
 *     // ... handler logic
 *   }
 */
export async function ensureCsrf(
  request: Request,
): Promise<{ ok: true } | { ok: false; response: Response }> {
  const result = await requireCsrf(request);
  if (result.ok) return { ok: true };

  safeLog.warn("csrf.rejected", { reason: result.reason });
  return { ok: false, response: csrfErrorResponse(result.reason) };
}
