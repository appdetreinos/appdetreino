import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyMercadoPagoSignature, type WebhookVerification } from "@/lib/security/webhook-signature";
import { safeLog } from "@/lib/log/safe";
import { auditLog } from "@/lib/audit/log";

/**
 * Webhook do Mercado Pago Bricks.
 *
 * Segurança (Fase 10):
 *  1. Valida HMAC-SHA256 do header `x-signature` (constant-time).
 *  2. Rejeita timestamps > 5 min (anti-replay).
 *  3. Idempotência via `payment_webhook_events` (UNIQUE external_id+event_type).
 *  4. Audit log centralizado (lib/audit/log.ts) com metadata mínima.
 *  5. Service-role client (webhook não tem user).
 */
export async function POST(request: NextRequest) {
  // Lê body raw pra HMAC (precisa ser o body EXATO, não parsed)
  const rawBody = await request.text();

  // 1) Verifica assinatura
  const verification: WebhookVerification = verifyMercadoPagoSignature(request.headers, rawBody);
  if (!verification.valid) {
    safeLog.warn("[mp-webhook] rejected", verification.reason);
    return NextResponse.json({ ok: false, error: verification.reason ?? "unauthorized" }, { status: 401 });
  }

  // 2) Parse seguro
  let body: { type?: string; data?: { id?: string | number }; live_mode?: boolean } | null;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  if (!body) return NextResponse.json({ ok: false, error: "empty_body" }, { status: 400 });

  // 3) Só processa payment events
  if (body.type !== "payment" || body.data?.id == null) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const externalId = String(body.data.id);
  const isLive = Boolean(body.live_mode);

  const supabase = await createServiceClient();

  // 4) Idempotência — INSERT ON CONFLICT DO NOTHING
  const { data: dedup, error: dedupErr } = await supabase
    .from("payment_webhook_events")
    .insert({
      external_id: externalId,
      event_type: "payment",
      payload: { live_mode: isLive },
    })
    .select("id")
    .maybeSingle();

  if (dedupErr) {
    // Erro de schema? (migration não aplicada ainda) — loga mas não bloqueia
    safeLog.error("[mp-webhook] dedup insert failed", dedupErr.message);
  }

  // Se dedup retornou NULL mas sem erro = conflito (já processado)
  if (!dedupErr && !dedup) {
    safeLog.info("[mp-webhook] duplicate ignored", { externalId });
    return NextResponse.json({ ok: true, idempotent: true });
  }

  // 5) Atualiza a payment correspondente
  const { data: payment, error } = await supabase
    .from("payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      gateway: "mercadopago",
      external_id: externalId,
    })
    .eq("external_id", externalId)
    .select("id, trainer_id, student_id, status")
    .maybeSingle();

  if (error) {
    safeLog.error("[mp-webhook] update failed", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Se já estava pago, só confirma idempotência
  if (payment?.status !== "paid") {
    safeLog.warn("[mp-webhook] payment not found", { externalId });
  }

  // 6) Audit
  await auditLog({
    userId: payment?.trainer_id ?? null,
    action: "webhook_mp",
    resourceType: "payment",
    resourceId: payment?.id ?? null,
    metadata: { external_id: externalId, live: isLive },
  });

  return NextResponse.json({ ok: true, payment_id: payment?.id ?? null });
}

export async function GET() {
  // Healthcheck (Mercado Pago pinga via GET em alguns fluxos)
  return NextResponse.json({ ok: true, service: "mercadopago-webhook" });
}
