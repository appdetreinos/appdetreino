/**
 * Rate limit baseado em Supabase (sem Redis).
 *
 * Pra casos onde você precisa de SLA alto, troque por Upstash Redis —
 * o contrato `checkRateLimit()` é o mesmo.
 *
 * Limite padrão: 5 tentativas / 15 minutos por key.
 */

import { createServiceClient } from "@/lib/supabase/server";

export interface RateLimitConfig {
  key: string;
  maxAttempts: number;
  windowMs: number; // janela em ms
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  reason?: string;
}

const WINDOW_DEFAULT_MS = 15 * 60 * 1000; // 15 min
const MAX_DEFAULT = 5;

export async function checkRateLimit(
  config: Partial<RateLimitConfig> & { key: string },
): Promise<RateLimitResult> {
  const { key, maxAttempts = MAX_DEFAULT, windowMs = WINDOW_DEFAULT_MS } = config;

  const supabase = await createServiceClient();
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  // 1. Ler contagem atual
  const { data: existing } = await supabase
    .from("rate_limit_attempts")
    .select("count, reset_at")
    .eq("key", key)
    .maybeSingle();

  if (existing && new Date(existing.reset_at) > now) {
    if (existing.count >= maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(existing.reset_at),
        reason: "rate_limit_exceeded",
      };
    }
    // Incrementar
    await supabase
      .from("rate_limit_attempts")
      .update({ count: existing.count + 1 })
      .eq("key", key);

    return {
      allowed: true,
      remaining: maxAttempts - existing.count - 1,
      resetAt: new Date(existing.reset_at),
    };
  }

  // 2. Janela expirou ou primeira tentativa → reset
  await supabase.from("rate_limit_attempts").upsert(
    {
      key,
      count: 1,
      reset_at: resetAt.toISOString(),
    },
    { onConflict: "key" },
  );

  return { allowed: true, remaining: maxAttempts - 1, resetAt };
}

/** Helper pra construir chave por IP + ação. */
export function rateLimitKey(action: string, ip: string, identifier?: string): string {
  return [action, ip, identifier].filter(Boolean).join(":");
}

/** Extrai IP do request (considera Vercel/Cloudflare). */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    headers.get("cf-connecting-ip") ??
    "unknown"
  );
}
