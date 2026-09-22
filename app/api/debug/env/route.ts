import { NextResponse } from "next/server";

/**
 * GET /api/debug/env — TEMPORÁRIO, REMOVER APÓS DIAGNÓSTICO.
 * Mostra quais envs NEXT_PUBLIC_* estão chegando no bundle.
 * NÃO expõe valores completos — só prefixo + length.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const mpPublic = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? "";

  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: {
      present: url.length > 0,
      prefix: url.slice(0, 30),
      length: url.length,
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      present: anon.length > 0,
      prefix: anon.slice(0, 30),
      length: anon.length,
      looksLikeJwt: anon.startsWith("eyJ"),
    },
    NEXT_PUBLIC_APP_URL: {
      present: appUrl.length > 0,
      value: appUrl,
      hasTrailingSlash: appUrl.endsWith("/"),
    },
    NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY: {
      present: mpPublic.length > 0,
      prefix: mpPublic.slice(0, 12),
      length: mpPublic.length,
    },
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL ?? null,
    vercelEnv: process.env.VERCEL_ENV ?? null,
  });
}
