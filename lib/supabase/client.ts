import { createBrowserClient } from "@supabase/ssr";

/**
 * Cookie de auth persistente (30 dias) por padrão — UX percebida é
 * "não precisar logar toda vez". O refresh token rotativo do Supabase
 * garante que continua válido enquanto a sessão existir.
 *
 * Server-side: o `proxy.ts` recarrega o cookie a cada request protegida
 * com base no access token atual (curto) + refresh token (longo).
 */
const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Mantém os cookies com mesma expiração longa (30 dias) que o
        // Supabase Auth usa internamente — assim não cai no "session cookie"
        // que some quando fecha o browser.
        getAll() {
          if (typeof document === "undefined") return [];
          return document.cookie
            .split("; ")
            .filter(Boolean)
            .map((kv) => {
              const idx = kv.indexOf("=");
              const name = idx === -1 ? kv : kv.slice(0, idx);
              const value = idx === -1 ? "" : kv.slice(idx + 1);
              return { name, value: decodeURIComponent(value) };
            });
        },
        setAll(cookiesToSet) {
          if (typeof document === "undefined") return;
          for (const { name, value, options } of cookiesToSet) {
            const maxAge = options?.maxAge ?? THIRTY_DAYS_SECONDS;
            document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
          }
        },
      },
    },
  );
}