// Webhook da Evolution API — recebe MESSAGES_UPSERT, CONNECTION_UPDATE, etc.
//
// Segurança (Fase 10):
//  1. Valida API key do header (constant-time).
//  2. Rejeita eventos fora da janela anti-replay (5 min).
//  3. Persiste em evolution_webhook_events com ON CONFLICT (idempotência).
//  4. Audit log estruturado.

import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyEvolutionSignature } from "@/lib/security/webhook-signature";
import { safeLog } from "@/lib/log/safe";
import { auditLog } from "@/lib/audit/log";

interface WebhookPayload {
  event: string;
  instance: string;
  data: unknown;
}

export async function POST(req: NextRequest) {
  // 1) Verifica assinatura
  const verification = verifyEvolutionSignature(req.headers);
  if (!verification.valid) {
    safeLog.warn("[evolution-webhook] rejected", verification.reason);
    return NextResponse.json(
      { ok: false, error: verification.reason ?? "unauthorized" },
      { status: 401 },
    );
  }

  // 2) Parse
  const payload = (await req.json().catch(() => null)) as WebhookPayload | null;
  if (!payload || typeof payload.event !== "string" || typeof payload.instance !== "string") {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  // 3) Idempotência — INSERT ON CONFLICT DO NOTHING (evento único por instance + event)
  try {
    const { error } = await supabase.from("evolution_webhook_events").insert({
      instance: payload.instance,
      event_type: payload.event,
      payload: payload.data as unknown as Record<string, unknown>,
      processed_at: new Date().toISOString(),
    });
    if (error && !error.message.includes("duplicate key")) {
      safeLog.error("[evolution-webhook] persist failed", error.message);
    }
  } catch (e) {
    safeLog.error("[evolution-webhook] persist exception", e instanceof Error ? e.message : "unknown");
  }

  // 4) Stub — processar evento (quando Supabase estiver conectado)
  safeLog.info("[evolution-webhook] received", {
    event: payload.event,
    instance: payload.instance,
  });

  // 5) Audit
  await auditLog({
    userId: null,
    action: "webhook_evolution",
    resourceType: "evolution_event",
    resourceId: null,
    metadata: { event: payload.event, instance: payload.instance },
  });

  return NextResponse.json({ ok: true, received: payload.event });
}
