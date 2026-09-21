import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";

/**
 * Double-submit cookie CSRF protection.
 *
 * Fluxo:
 *  1. Cliente chama GET /api/auth/csrf (or via Server Component), recebe token.
 *  2. Cliente set header "x-csrf-token" = value do cookie "csrf" em toda mutação.
 *  3. requireCsrf(request) compara cookie === header com timingSafeEqual.
 *
 * Por que double-submit (não Synchronizer Token):
 *  - Stateless: nada é armazenado no servidor, só cookie + header.
 *  - Atackers não conseguem ler cookies HttpOnly via cross-origin req.
 */

const COOKIE_NAME = "csrf";
const HEADER_NAME = "x-csrf-token";

const TOKEN_BYTES = 32; // 256 bits
const ONE_DAY_SECONDS = 60 * 60 * 24;

/** Gera token hex (64 chars). Use server-side. */
export function generateCsrfToken(): string {
  // lazy import to avoid running node:crypto in edge runtime
  const { randomBytes } = require("node:crypto") as typeof import("node:crypto");
  return randomBytes(TOKEN_BYTES).toString("hex");
}

/** Seta cookie httpOnly=false SameSite=Strict Secure com o token. */
export async function setCsrfCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: false, // precisa ser lido pelo JS para o header
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ONE_DAY_SECONDS,
  });
}

/** Lê cookie + header e compara com timing-safe. Retorna { ok }. */
export async function requireCsrf(request: Request): Promise<
  | { ok: true }
  | { ok: false; reason: "missing_cookie" | "missing_header" | "mismatch" }
> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(COOKIE_NAME)?.value;
  const headerToken = request.headers.get(HEADER_NAME);

  if (!cookieToken) return { ok: false, reason: "missing_cookie" };
  if (!headerToken) return { ok: false, reason: "missing_header" };
  if (cookieToken.length !== headerToken.length) return { ok: false, reason: "mismatch" };

  const a = Buffer.from(cookieToken, "utf8");
  const b = Buffer.from(headerToken, "utf8");
  if (a.length !== b.length) return { ok: false, reason: "mismatch" };

  const equal = timingSafeEqual(a, b);
  return equal ? { ok: true } : { ok: false, reason: "mismatch" };
}

/** Helper para emitir JSON response de erro de CSRF (compatível com Route Handler). */
export function csrfErrorResponse(reason: string): Response {
  return new Response(JSON.stringify({ ok: false, error: "csrf_invalid", reason }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

/** Lê o cookie atual sem auth. Retorna null se ausente. */
export async function readCsrfCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}
