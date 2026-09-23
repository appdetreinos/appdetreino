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
      sent,
      failed,
      evolution: isEvolutionConfigured() ? "on" : "off",
    },
  });

  return NextResponse.json({ ok: true, marked_overdue: markedOverdue, sent, failed });
}
