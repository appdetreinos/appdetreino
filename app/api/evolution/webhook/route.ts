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

  // 4) Processa eventos conhecidos (best-effort, nunca quebra o 200)
  try {
    await processEvent(supabase, payload.event, payload.instance, payload.data);
  } catch (e) {
    safeLog.error("[evolution-webhook] process exception", e instanceof Error ? e.message : "unknown");
  }

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

type ServiceClient = Awaited<ReturnType<typeof createServiceClient>>;

async function processEvent(
  supabase: ServiceClient,
  event: string,
  instance: string,
  data: unknown,
) {
  const d = (data ?? {}) as Record<string, unknown>;

  if (event === "CONNECTION_UPDATE") {
    const state = typeof d.state === "string" ? d.state : null;
    if (state === "open" || state === "close" || state === "connecting") {
      const phone =
        typeof (d as Record<string, unknown>).number === "string"
          ? ((d as Record<string, unknown>).number as string)
          : null;
      await supabase
        .from("evolution_instances")
        .update({
          state,
          ...(phone ? { phone } : {}),
          last_seen_at: new Date().toISOString(),
          ...(state === "open" ? { qr_code_base64: null } : {}),
        })
        .eq("instance_name", instance);
    }
    return;
  }

  if (event === "QRCODE_UPDATED") {
    const nested = d.qrcode as Record<string, unknown> | undefined;
    const base64 =
      typeof nested?.base64 === "string"
        ? (nested.base64 as string)
        : typeof d.base64 === "string"
          ? (d.base64 as string)
          : null;
    if (base64) {
      await supabase
        .from("evolution_instances")
        .update({ qr_code_base64: base64, state: "connecting" })
        .eq("instance_name", instance);
    }
    return;
  }

  if (
    event === "MESSAGES_UPSERT" &&
    typeof d.key === "object" &&
    d.key !== null &&
    !((d.key as Record<string, unknown>).fromMe === true)
  ) {
    // Inbound: descobre o trainer pela instância e registra
    const { data: inst } = await supabase
      .from("evolution_instances")
      .select("trainer_id")
      .eq("instance_name", instance)
      .maybeSingle();
    const trainerId = (inst as { trainer_id?: string } | null)?.trainer_id;
    if (!trainerId) return;

    const key = d.key as Record<string, unknown>;
    const remoteJid = typeof key.remoteJid === "string" ? (key.remoteJid as string) : "";
    const fromPhone = remoteJid.split("@")[0] || null;
    const msg = d.message as Record<string, unknown> | undefined;
    const conv = msg ? msg.conversation : undefined;
    const text =
      typeof conv === "string"
        ? conv
        : typeof (msg?.extendedTextMessage as Record<string, unknown> | undefined)?.text === "string"
          ? ((msg?.extendedTextMessage as Record<string, unknown>).text as string)
          : null;

    await supabase.from("evolution_messages").insert({
      trainer_id: trainerId,
      instance_name: instance,
      direction: "inbound",
      from_phone: fromPhone,
      type: text ? "text" : "other",
      payload_jsonb: { text, remoteJid } as unknown as Record<string, unknown>,
      status: "received",
      sent_at: new Date().toISOString(),
    });
  }
}
