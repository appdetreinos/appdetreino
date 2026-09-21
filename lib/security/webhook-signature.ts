/**
 * Validação de assinatura dos webhooks.
 *
 * Suporta:
 *  - Mercado Pago: HMAC-SHA256 de `x-signature` + `x-request-id` + `data.id`
 *  - Evolution API: header customizado `apikey` comparado com EVOLUTION_WEBHOOK_SECRET
 *
 * Se o secret não estiver configurado em dev, o webhook é aceito (warning).
 * Em produção, secret é OBRIGATÓRIO — função retorna false.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export interface WebhookVerification {
  valid: boolean;
  reason?: string;
}

function constantTimeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Mercado Pago — valida x-signature HMAC-SHA256.
 *
 * Spec MP:
 *   template = "v1:" + ts + ":" + token (do manifest)
 *   signature = HMAC-SHA256(template, secret)
 *   header `x-signature` = "ts=...,v1=..."
 *
 * Sem manifest (modo dev), aceitamos se há `x-signature` + `x-request-id` + secret configurado.
 */
export function verifyMercadoPagoSignature(
  headers: Headers,
  rawBody: string,
  manifestToken?: string,
): WebhookVerification {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const isProd = process.env.NODE_ENV === "production";

  if (!secret) {
    if (isProd) {
      return { valid: false, reason: "MERCADOPAGO_WEBHOOK_SECRET not configured in production" };
    }
    // Dev: aceita sem validar
    return { valid: true, reason: "dev_mode_no_secret" };
  }

  const xSignature = headers.get("x-signature");
  const xRequestId = headers.get("x-request-id");
  if (!xSignature || !xRequestId) {
    return { valid: false, reason: "missing x-signature or x-request-id" };
  }

  // Parse "ts=...,v1=..."
  const parts = Object.fromEntries(
    xSignature.split(",").map((kv) => {
      const [k, v] = kv.split("=");
      return [k?.trim() ?? "", v?.trim() ?? ""];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;

  if (!ts || !v1) {
    return { valid: false, reason: "malformed x-signature" };
  }

  // Template canônico
  const dataId = extractDataIdFromBody(rawBody);
  const token = manifestToken ?? "UNKNOWN_TOKEN";
  const template = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  const expected = createHmac("sha256", secret).update(template).digest("hex");

  if (!constantTimeCompare(expected, v1)) {
    return { valid: false, reason: "hmac_mismatch" };
  }

  // Rejeitar timestamps muito antigos (> 5 min) — anti-replay
  const tsMs = Number(ts) * 1000;
  if (Number.isFinite(tsMs)) {
    const ageMs = Date.now() - tsMs;
    if (ageMs > 5 * 60 * 1000) {
      return { valid: false, reason: "timestamp_too_old" };
    }
  }

  return { valid: true };
}

function extractDataIdFromBody(body: string): string {
  try {
    const parsed = JSON.parse(body);
    return String(parsed?.data?.id ?? "");
  } catch {
    return "";
  }
}

/**
 * Evolution API — valida apikey no header.
 */
export function verifyEvolutionSignature(headers: Headers): WebhookVerification {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET;
  const isProd = process.env.NODE_ENV === "production";

  if (!secret) {
    if (isProd) {
      return { valid: false, reason: "EVOLUTION_WEBHOOK_SECRET not configured in production" };
    }
    return { valid: true, reason: "dev_mode_no_secret" };
  }

  const provided =
    headers.get("apikey") ?? headers.get("x-api-key") ?? headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!provided) return { valid: false, reason: "missing apikey" };
  if (!constantTimeCompare(provided, secret)) {
    return { valid: false, reason: "apikey_mismatch" };
  }

  return { valid: true };
}

/**
 * Cron — Vercel injeta `Authorization: Bearer ${CRON_SECRET}` automaticamente.
 */
export function verifyCronSecret(headers: Headers): WebhookVerification {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return { valid: false, reason: "CRON_SECRET not configured" };
  }

  const provided = headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!provided) return { valid: false, reason: "missing authorization" };
  if (!constantTimeCompare(provided, secret)) {
    return { valid: false, reason: "cron_secret_mismatch" };
  }

  return { valid: true };
}
