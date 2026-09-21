"use client";

/**
 * Helper client-side para obter o token CSRF uma vez e reusar no header
 * `x-csrf-token` em todas as requisições mutantes.
 *
 * Estratégia:
 *  - Lê do cookie (`document.cookie`) que o route `/api/auth/csrf` escreveu
 *    via response. Cookie é HttpOnly=false (precisa ser JS-acessível).
 *  - Se ausente, faz GET /api/auth/csrf para criar/expor.
 *  - Cacheia em module-scope para evitar refetch a cada submit.
 */

let inflight: Promise<string | null> | null = null;
let cache: string | null = null;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

/** Assegura que existe um token CSRF e retorna o valor. */
export async function ensureCsrfToken(forceRefresh = false): Promise<string | null> {
  if (!forceRefresh && cache) return cache;
  if (!forceRefresh) {
    const fromCookie = readCookie("csrf");
    if (fromCookie) {
      cache = fromCookie;
      return cache;
    }
  }
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api/auth/csrf", {
        method: "GET",
        credentials: "same-origin",
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { csrf?: string };
      cache = data.csrf ?? null;
      return cache;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Helper: faz fetch com CSRF header. Para mutações (POST/PATCH/DELETE). */
export async function csrfFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await ensureCsrfToken();
  const headers = new Headers(init.headers);
  if (token && init.method && init.method.toUpperCase() !== "GET") {
    headers.set("x-csrf-token", token);
  }
  return fetch(url, { ...init, credentials: "same-origin", headers });
}
