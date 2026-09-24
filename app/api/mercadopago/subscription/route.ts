import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeLog } from "@/lib/log/safe";
import { PLANS, formatCents } from "@/lib/types/billing";
import { ensureCsrf } from "@/lib/security/csrf-helpers";

const bodySchema = z.object({ plan_id: z.string().min(1).max(50) }).strict();

/**
 * POST /api/mercadopago/subscription {plan_id}
 * Assinatura recorrente no cartão (preapproval) — o trainer é
 * cobrado todo mês automaticamente, sem Pix manual.
 */
export async function POST(request: NextRequest) {
  const csrf = await ensureCsrf(request);
  if (!csrf.ok) return csrf.response;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "validation_failed" }, { status: 400 });
  }

  const plan = PLANS.find((p) => p.id === parsed.data.plan_id) ?? null;
  if (!plan) {
    return NextResponse.json({ ok: false, error: "unknown_plan" }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const { mpClient } = await import("@/lib/mercadopago/client");
    const { PreApproval } = await import("mercadopago");
    const client = mpClient();
    if (!client) {
      return NextResponse.json({ ok: false, error: "mercadopago_not_configured" }, { status: 503 });
    }
    const preapproval = new PreApproval(client);
    const created = await preapproval.create({
      body: {
        reason: `Viva FIT — Plano ${plan.name} (mensal)`,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: plan.priceMonthly,
          currency_id: "BRL",
        },
        payer_email: user.email,
        back_url: `${siteUrl}/app/settings?upgrade=success`,
        external_reference: `${user.id}:${plan.id}:subscription`,
      },
    });

    const initPoint = created.init_point;
    const preId = created.id;
    if (!initPoint) {
      return NextResponse.json({ ok: false, error: "no_init_point" }, { status: 502 });
    }

    await supabase.from("payment_links").insert({
      trainer_id: user.id,
      description: `Plano ${plan.name} (assinatura)`,
      amount_cents: formatCents(plan.priceMonthly),
      external_id: preId != null ? String(preId) : `sub-${Date.now()}`,
      url: initPoint,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return NextResponse.json({ ok: true, init_point: initPoint });
  } catch (e) {
    safeLog.error("[mp-subscription] unhandled", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
