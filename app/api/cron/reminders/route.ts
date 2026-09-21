// Cron de lembretes diários — 7h da manhã (BRT)
//
// ESTADO ATUAL (2026-09): placeholder read-only. F4 (WhatsApp/Evolution) foi
// adiado e a integração não existe. Esta rota existe para satisfazer o
// vercel.json `crons: [{ path: '/api/cron/reminders', schedule: '0 7 * * *' }]`
// mas não envia mensagens. Quando F4 voltar, restaura-se o loop de envio.
//
// Segurança (Fase 10):
//  1. Valida Authorization: Bearer CRON_SECRET (constant-time).
//  2. Service-role client (CRON não tem user).

import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyCronSecret } from "@/lib/security/webhook-signature";
import { safeLog } from "@/lib/log/safe";
import { auditLog } from "@/lib/audit/log";

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
  try {
    const { count } = await supabase
      .from("student_profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .not("phone", "is", null);

    safeLog.info("[cron-reminders] skipped — Evolution deferred (F4)", {
      eligibleUsers: count ?? 0,
    });

    await auditLog({
      userId: null,
      action: "cron_reminders_run",
      resourceType: "cron",
      resourceId: null,
      metadata: {
        mode: "no_op",
        reason: "evolution_deferred",
        eligible_users: count ?? 0,
      },
    });

    return NextResponse.json({
      ok: true,
      sent: 0,
      skipped: count ?? 0,
      note: "Evolution integration deferred — no messages sent.",
    });
  } catch (err) {
    safeLog.error("[cron-reminders] unhandled", err instanceof Error ? err.message : "unknown");
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}
