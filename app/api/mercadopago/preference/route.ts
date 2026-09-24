import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeLog } from "@/lib/log/safe";
import { PLANS, formatCents } from "@/lib/types/billing";
import { ensureCsrf } from "@/lib/security/csrf-helpers";

const bodySchema = z
  .object({
    plan_id: z.string().min(1).max(50),
    amount_cents: z.number().int().min(1).max(1_000_000_00),
    payment_method: z.enum(["pix", "card", "boleto"]).optional(),
    test: z.boolean().optional(),
  })
  .strict();

/**
 * Mapa de payment_method (UI) → tipo aceito pelo Mercado Pago Checkout Pro.
 * Pra forçar o MP a mostrar SÓ o método escolhido, listamos os outros em
 * `excluded_payment_types`. O `id` é o que o MP usa no front dele.
 */
const MP_PAYMENT_TYPE_IDS = {
  pix: "pix",
  card: "credit_card",
  boleto: "ticket",
} as const;

/** Retorna os tipos de pagamento a EXCLUIR pra mostrar só o escolhido. */
function excludedPaymentTypes(keep: keyof typeof MP_PAYMENT_TYPE_IDS) {
  const keepId = MP_PAYMENT_TYPE_IDS[keep];
  return Object.values(MP_PAYMENT_TYPE_IDS)
    .filter((id) => id !== keepId)
    .map((id) => ({ id }));
}

/** Server-side: localiza o plano pelo id; null se não existir. */
function planById(planId: string) {
  return PLANS.find((p) => p.id === planId) ?? null;
}

/**
 * Helper: currentYYYYMM() em BRT para reaproveitar idempotência mensal.
 * Mesmo plano no mesmo mês = mesma preferência.
 */
function currentYYYYMM(): string {
  const brt = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  return `${brt.getFullYear()}-${String(brt.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * POST /api/mercadopago/preference
 *
 * Cria uma preferência de pagamento no Mercado Pago e retorna o `init_point`
 * pro cliente redirecionar.
 *
 * SEGURANÇA:
 *  - plan_id validado server-side contra PLANS (Whitelist). Trainer não
 *    consegue pagar "0,01" (era um bug grave na versão anterior).
 *  - amount_cents deve ser exatamente PLANS[plan_id].priceMonthly * 100.
 *    Se o frontend mandar "5999" para o plano start (R$59,90), validamos.
 *  - CSRF guard.
 *  - Idempotência mensal: mesmo user+plano+mes reutiliza preferência.
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
    return NextResponse.json(
      { ok: false, error: "validation_failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Whitelist de planos
  const plan = planById(parsed.data.plan_id);
  if (!plan) {
    safeLog.warn("[mp-preference] unknown plan_id", { planId: parsed.data.plan_id });
    return NextResponse.json({ ok: false, error: "unknown_plan" }, { status: 400 });
  }

  // Reaproveita valor server-side. Frontend pode ter um PLANS desatualizado.
  // Impede trainer pagar "0,01" enviando amount_cents manipulado.
  // Exceção: modo teste (ALLOW_TEST_CHECKOUT=1) trava em R$0,10 fixos.
  const isTest =
    parsed.data.test === true && process.env.ALLOW_TEST_CHECKOUT === "1";
  const expected_cents = isTest ? 10 : formatCents(plan.priceMonthly);
  if (parsed.data.amount_cents !== expected_cents) {
    safeLog.warn("[mp-preference] amount mismatch", {
      planId: plan.id,
      expected: expected_cents,
      got: parsed.data.amount_cents,
    });
    return NextResponse.json(
      {
        ok: false,
        error: "amount_mismatch",
        expected_cents,
        plan_id: plan.id,
      },
      { status: 400 },
    );
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json(
      { ok: false, error: "mercadopago_not_configured" },
      { status: 503 },
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const idempotencyKey = `${user.id}-${plan.id}-${currentYYYYMM()}${isTest ? "-test" : ""}`;

  try {
    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        items: [
          {
            title: isTest ? `Viva FIT — Plano ${plan.name} (TESTE)` : `Viva FIT — Plano ${plan.name}`,
            quantity: 1,
            unit_price: expected_cents / 100,
            currency_id: "BRL",
          },
        ],
        payer: { email: user.email },
        back_urls: {
          success: `${siteUrl}/app/settings?upgrade=success`,
          failure: `${siteUrl}/app/checkout?plan=${plan.id}`,
          pending: `${siteUrl}/app/settings?upgrade=pending`,
        },
        auto_return: "approved",
        external_reference: `${user.id}:${plan.id}:${currentYYYYMM()}`,
        notification_url: `${siteUrl}/api/mercadopago/webhook`,
        // Se o trainer escolheu um método específico, esconde os outros.
        // Sem isso, o Checkout Pro mostra TODOS os meios configurados na conta MP.
        payment_methods: parsed.data.payment_method
          ? { excluded_payment_types: excludedPaymentTypes(parsed.data.payment_method) }
          : undefined,
      }),
    });

    if (!mpRes.ok) {
      const errBody = await mpRes.text();
      safeLog.error("[mp-preference] mp api failed", { status: mpRes.status, body: errBody });
      return NextResponse.json(
        { ok: false, error: "mp_api_failed" },
        { status: 502 },
      );
    }

    const mpData = (await mpRes.json()) as { id: string; init_point?: string };
    const initPoint = mpData.init_point;

    if (!initPoint) {
      return NextResponse.json({ ok: false, error: "no_init_point" }, { status: 502 });
    }

    // Valida a preferência (credencial teste vs produção, app sem Bricks, etc).
    // Se a GET falhar, o Brick também falharia — avisa já com motivo claro.
    try {
      const verifyRes = await fetch(`https://api.mercadopago.com/checkout/preferences/${mpData.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!verifyRes.ok) {
        const vBody = await verifyRes.text();
        safeLog.error("[mp-preference] verify failed", { status: verifyRes.status, body: vBody });
        return NextResponse.json(
          { ok: false, error: "preference_invalid", detail: `verify_${verifyRes.status}` },
          { status: 502 },
        );
      }
    } catch (e) {
      safeLog.error("[mp-preference] verify threw", e instanceof Error ? e.message : "unknown");
    }

    // Audit + idempotência. errors únicos treinam a tabela. Ignora dup.
    const { error: linkErr } = await supabase.from("payment_links").insert({
      trainer_id: user.id,
      description: isTest ? `Plano ${plan.name} (TESTE)` : `Plano ${plan.name}`,
      amount_cents: expected_cents,
      external_id: mpData.id,
      url: initPoint,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    if (linkErr && !linkErr.message.includes("duplicate")) {
      safeLog.warn("[mp-preference] payment_links insert failed", linkErr.message);
      // Não retorna erro — o init_point já foi criado no MP.
    }

    return NextResponse.json({ ok: true, init_point: initPoint, preference_id: mpData.id });
  } catch (e) {
    safeLog.error("[mp-preference] unhandled", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
