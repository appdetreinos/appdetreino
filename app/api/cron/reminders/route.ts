// Cron diário — 7h da manhã (BRT).
//
// Faz 3 coisas (todas best-effort, nunca quebram o 200):
//  1. Marca payments vencidos como overdue (pending + due_date < hoje).
//  2. Se Evolution configurada: envia mensagens pendentes agendadas
//     (scheduled_for <= agora) via /message/sendText e marca sent/failed.
//  3. Audita tudo em audit_log.
//
// Segurança: Authorization: Bearer CRON_SECRET + service-role client.

import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyCronSecret } from "@/lib/security/webhook-signature";
import { safeLog } from "@/lib/log/safe";
import { auditLog } from "@/lib/audit/log";
import { evoFetch, isEvolutionConfigured } from "@/lib/evolution/client";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const verification = verifyCronSecret(req.headers);
  if (!verification.valid) {
    safeLog.warn("[cron-reminders] rejected", verification.reason);
    return NextResponse.json(
      { ok: false, error: verification.reason ?? "unauthorized" },
      { status: 401 },
    );
  }

  const supabase = await createServiceClient();
  let markedOverdue = 0;
  let sent = 0;
  let failed = 0;
  let queuedRenewals = 0;

  // 1) Vencidos → overdue
  try {
    const { data } = await supabase
      .from("payments")
      .update({ status: "overdue" })
      .eq("status", "pending")
      .lt("due_date", todayStr())
      .select("id");
    markedOverdue = data?.length ?? 0;
  } catch (e) {
    safeLog.error("[cron-reminders] overdue failed", e instanceof Error ? e.message : "unknown");
  }

  // 1.5) Lembretes de renovação: vencem em até 3 dias → fila do WhatsApp
  // (só quando Evolution configurada; idempotente por payment_id no payload)
  if (isEvolutionConfigured()) {
    try {
      queuedRenewals = await queueRenewalReminders(supabase);
    } catch (e) {
      safeLog.error("[cron-reminders] renewals failed", e instanceof Error ? e.message : "unknown");
    }
  }

  // 2) Envio WhatsApp (só se configurado)
  if (isEvolutionConfigured()) {
    try {
      const { data: due } = await supabase
        .from("evolution_messages")
        .select("id, trainer_id, instance_name, to_phone, type, payload_jsonb")
        .eq("status", "pending")
        .lte("scheduled_for", new Date().toISOString())
        .limit(50);

      // Mapa trainer → instância aberta
      const { data: instances } = await supabase
        .from("evolution_instances")
        .select("trainer_id, instance_name")
        .eq("state", "open");
      const openByTrainer = new Map(
        ((instances ?? []) as Array<{ trainer_id: string; instance_name: string }>).map((i) => [
          i.trainer_id,
          i.instance_name,
        ]),
      );

      for (const m of (due ?? []) as Array<{
        id: string;
        trainer_id: string;
        instance_name: string | null;
        to_phone: string | null;
        type: string;
        payload_jsonb: { text?: string } | null;
      }>) {
        const instance = m.instance_name ?? openByTrainer.get(m.trainer_id) ?? null;
        const text = m.payload_jsonb?.text;
        if (!instance || !m.to_phone || m.type !== "text" || !text) {
          await supabase.from("evolution_messages").update({ status: "failed" }).eq("id", m.id);
          failed++;
          continue;
        }
        const digits = m.to_phone.replace(/\D/g, "");
        const number = digits.startsWith("55") ? digits : `55${digits}`;
        const res = await evoFetch(`/message/sendText/${instance}`, {
          method: "POST",
          body: JSON.stringify({ number, text }),
        });
        if (res.ok) {
          await supabase
            .from("evolution_messages")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", m.id);
          sent++;
        } else {
          await supabase
            .from("evolution_messages")
            .update({ status: "failed" })
            .eq("id", m.id);
          failed++;
        }
      }
    } catch (e) {
      safeLog.error("[cron-reminders] send failed", e instanceof Error ? e.message : "unknown");
    }
  }

  await auditLog({
    userId: null,
    action: "cron_reminders_run",
    resourceType: "cron",
    resourceId: null,
    metadata: {
      marked_overdue: markedOverdue,
      queued_renewals: queuedRenewals,
      sent,
      failed,
      evolution: isEvolutionConfigured() ? "on" : "off",
    },
  });

  return NextResponse.json({ ok: true, marked_overdue: markedOverdue, queued_renewals: queuedRenewals, sent, failed });
}

type ServiceClient = Awaited<ReturnType<typeof createServiceClient>>;

/**
 * Pra cada cobrança pending vencendo em até 3 dias, enfileira 1
 * lembrete no WhatsApp do trainer (com chave Pix, se cadastrada).
 * Idempotente: pula se já existe mensagem com esse payment_id.
 */
async function queueRenewalReminders(supabase: ServiceClient): Promise<number> {
  const today = todayStr();
  const limit = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: open } = await supabase
    .from("evolution_instances")
    .select("trainer_id, instance_name")
    .eq("state", "open");
  const openByTrainer = new Map(
    ((open ?? []) as Array<{ trainer_id: string; instance_name: string }>).map((i) => [
      i.trainer_id,
      i.instance_name,
    ]),
  );
  if (openByTrainer.size === 0) return 0;

  const { data: upcoming } = await supabase
    .from("payments")
    .select(
      `id, amount, due_date, description, trainer_id, student_id,
       student_profiles!inner(user_id, full_name, profiles:profiles!inner(phone))`,
    )
    .eq("status", "pending")
    .gte("due_date", today)
    .lte("due_date", limit)
    .in("trainer_id", Array.from(openByTrainer.keys()))
    .limit(100);

  const { data: already } = await supabase
    .from("evolution_messages")
    .select("payload_jsonb")
    .eq("status", "pending");
  const queuedPaymentIds = new Set(
    ((already ?? []) as Array<{ payload_jsonb: { payment_id?: string } | null }>).map(
      (m) => m.payload_jsonb?.payment_id,
    ).filter(Boolean),
  );

  let queued = 0;
  for (const p of (upcoming ?? []) as Array<{
    id: string;
    amount: number;
    due_date: string;
    trainer_id: string;
    student_profiles:
      | { full_name: string; profiles: { phone: string | null } | { phone: string | null }[] | null }
      | { full_name: string; profiles: { phone: string | null } | { phone: string | null }[] | null }[];
  }>) {
    if (queuedPaymentIds.has(p.id)) continue;
    const sp = Array.isArray(p.student_profiles) ? p.student_profiles[0] : p.student_profiles;
    const prof = sp?.profiles ? (Array.isArray(sp.profiles) ? sp.profiles[0] : sp.profiles) : null;
    const digits = (prof?.phone ?? "").replace(/\D/g, "");
    if (!digits) continue;

    const { data: settings } = await supabase
      .from("trainer_settings")
      .select("pix_key")
      .eq("user_id", p.trainer_id)
      .maybeSingle();
    const pix = (settings as { pix_key?: string } | null)?.pix_key;

    const firstName = (sp?.full_name ?? "aluno").split(" ")[0];
    const valor = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(p.amount));
    const vence = new Date(p.due_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    const text =
      `Oi, ${firstName}! 💪 Tua mensalidade de ${valor} vence ${vence}.` +
      (pix ? ` Paga no Pix: ${pix}` : " Fala comigo pra acertar.");

    const { error } = await supabase.from("evolution_messages").insert({
      trainer_id: p.trainer_id,
      instance_name: openByTrainer.get(p.trainer_id),
      direction: "outbound",
      to_phone: `55${digits}`,
      type: "text",
      payload_jsonb: { text, payment_id: p.id },
      status: "pending",
      scheduled_for: new Date().toISOString(),
    });
    if (!error) queued++;
  }
  return queued;
}
