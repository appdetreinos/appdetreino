import { NextResponse } from "next/server";
import { generateCsrfToken, setCsrfCookie } from "@/lib/security/csrf";

/**
 * GET /api/auth/csrf
 *
 * Gera um token CSRF (se ainda não houver um cookie válido), seta o cookie
 * `csrf` HttpOnly=false SameSite=Strict e devolve o token em JSON.
 *
 * Idempotente: o cliente pode chamar antes de qualquer submit.
 */
export async function GET() {
  const token = generateCsrfToken();
  await setCsrfCookie(token);

  return NextResponse.json(
    { ok: true, csrf: token },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
