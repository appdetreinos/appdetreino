import { safeLog } from "@/lib/log/safe";

/**
 * Cliente server-side da Evolution API (WhatsApp).
 * Feature flag: sem EVOLUTION_API_URL + EVOLUTION_API_KEY, tudo é no-op
 * e a página /app/whatsapp mostra o guia de setup em vez do mock.
 */

export function isEvolutionConfigured(): boolean {
  return Boolean(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY);
}

function base(): { url: string; key: string } | null {
  const url = process.env.EVOLUTION_API_URL?.replace(/\/$/, "");
  const key = process.env.EVOLUTION_API_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export async function evoFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; data?: T; error?: string }> {
  const cfg = base();
  if (!cfg) return { ok: false, error: "evolution_not_configured" };
  try {
    const res = await fetch(`${cfg.url}${path}`, {
      ...init,
      headers: { apikey: cfg.key, "Content-Type": "application/json", ...(init?.headers ?? {}) },
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json().catch(() => null)) as T | null;
    if (!res.ok) {
      safeLog.warn("[evolution] api error", `${path} -> ${res.status}`);
      return { ok: false, error: `evolution_${res.status}` };
    }
    return { ok: true, data: (json ?? {}) as T };
  } catch (e) {
    safeLog.error("[evolution] fetch failed", e instanceof Error ? e.message : "unknown");
    return { ok: false, error: "evolution_unreachable" };
  }
}

export function instanceNameFor(trainerId: string): string {
  return `viva-${trainerId.slice(0, 8)}`;
}
