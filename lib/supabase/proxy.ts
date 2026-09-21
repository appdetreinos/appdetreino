import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Cliente Supabase específico para `proxy.ts` (middleware Next 16).
 *
 * Diferente de `lib/supabase/server.ts` (que usa `cookies()` do next/headers),
 * aqui manipulamos manualmente os cookies do `NextRequest` e gravamos
 * no `NextResponse` para que o refresh token funcione corretamente
 * a cada request protegida.
 *
 * Retorna `null` se as env vars não estiverem populadas — o caller
 * deve tratar isso como "Supabase indisponível" e redirecionar pra `/login`.
 */
export async function createProxyClient(request: NextRequest, response: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });
}
