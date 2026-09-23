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

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "mercadopago_not_configured" }, { status: 503 });
  }
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
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
      }),
    });

    if (!mpRes.ok) {
      safeLog.error("[mp-subscription] mp api failed", { status: mpRes.status });
      return NextResponse.json({ ok: false, error: "mp_api_failed" }, { status: 502 });
    }

    const mpData = (await mpRes.json()) as { id?: string; init_point?: string };
    if (!mpData.init_point) {
      return NextResponse.json({ ok: false, error: "no_init_point" }, { status: 502 });
    }

    await supabase.from("payment_links").insert({
      trainer_id: user.id,
      description: `Plano ${plan.name} (assinatura)`,
      amount_cents: formatCents(plan.priceMonthly),
      external_id: mpData.id ?? `sub-${Date.now()}`,
      url: mpData.init_point,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return NextResponse.json({ ok: true, init_point: mpData.init_point });
  } catch (e) {
    safeLog.error("[mp-subscription] unhandled", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
