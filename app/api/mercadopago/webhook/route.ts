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

  // 3) Aprovação de assinatura (preapproval) — libera o plano na hora
  if (body.type === "subscription_preapproval" && body.data?.id != null) {
    const supabasePre = await createServiceClient();
    await handleSubscriptionAuthorized(supabasePre, String(body.data.id));
    return NextResponse.json({ ok: true, subscription: true });
  }

  // 3.1) Só processa payment events daqui em diante
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

  // 5) Localiza a cobrança: o aviso traz o PAYMENT id, mas salvamos o
  // PREFERENCE id. Busca o pagamento na API do MP e casa pela
  // external_reference que gravamos (`userId:planId:yyyymm` ou `market:...`).
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  let refUserId: string | null = null;
  let refPlan: string | null = null;
  let refMarket: string | null = null;
  if (accessToken) {
    try {
      const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${externalId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (payRes.ok) {
        const payData = (await payRes.json()) as {
          status?: string;
          external_reference?: string;
        };
        if (payData.status !== "approved") {
          safeLog.info("[mp-webhook] payment not approved yet", { externalId, status: payData.status });
          return NextResponse.json({ ok: true, pending: true });
        }
        const ref = String(payData.external_reference ?? "");
        if (ref.startsWith("market:")) {
          refMarket = ref;
        } else {
          const [uid, pid] = ref.split(":");
          if (uid && pid) {
            refUserId = uid;
            refPlan = pid;
          }
        }
      }
    } catch (e) {
      safeLog.error("[mp-webhook] payment fetch failed", e instanceof Error ? e.message : "unknown");
    }
  }

  // 5.1) Marca pago: primeiro tenta pela external_reference, depois pelo
  // external_id legado (compatibilidade).
  type PayRow = { trainer_id: string | null; id: string; description: string | null };
  let payment: PayRow | null = null;
  if (refUserId) {
    const { data } = await supabase
      .from("payment_links")
      .update({
        paid_at: new Date().toISOString(),
        external_id: externalId,
      })
      .eq("trainer_id", refUserId)
      .like("description", "Plano %")
      .is("paid_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .select("trainer_id, id, description")
      .maybeSingle();
    payment = data as PayRow | null;
  }
  if (!payment) {
    const { data, error } = await supabase
      .from("payment_links")
      .update({
        paid_at: new Date().toISOString(),
      })
      .eq("external_id", externalId)
      .select("trainer_id, id, description")
      .maybeSingle();
    if (error) {
      safeLog.error("[mp-webhook] update failed", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    payment = data as PayRow | null;
  }

  const desc = payment && "description" in payment ? String(payment.description ?? "") : "";

  // 5.1) MARKETPLACE: external_reference `market:buyer:kind:id` tem prioridade;
  // cai pro legado via descrição da linha.
  {
    const buyer = refMarket
      ? refMarket.split(":")[1]
      : payment && "trainer_id" in payment
        ? (payment.trainer_id as string | undefined)
        : undefined;
    const ref = refMarket
      ? refMarket.split(":").slice(2).join(":")
      : desc.startsWith("Marketplace ")
        ? desc.replace("Marketplace ", "")
        : null;
    if (buyer && ref) {
      try {
        await fulfillMarketplace(supabase, buyer, ref);
      } catch (e) {
        safeLog.error("[mp-webhook] marketplace fulfill failed", e instanceof Error ? e.message : "unknown");
      }
    }
  }

  // 5.2) DESTRAVAR O TRAINER: tier vem da external_reference (`uid:plan:mes`);
  // cai pro legado via descrição. Funciona mesmo sem linha em payment_links
  // (ex: linha não gravada) — basta conhecer o dono e o plano.
  const unlockUserId =
    refUserId ?? (payment && "trainer_id" in payment ? (payment.trainer_id as string | null) : null);
  if (unlockUserId) {
    const planToken = ((refPlan ?? desc) || "").toUpperCase();
    const tier = planToken.includes("TOP") ? "top" : planToken.includes("PRO") ? "pro" : "start";
    await supabase
      .from("trainer_profiles")
      .update({
        plan_tier: tier,
        trial_ends_at: null
      })
      .eq("user_id", unlockUserId);
  }

  // 6) Audit
  await auditLog({
    userId: payment && "trainer_id" in payment ? payment.trainer_id : null,
    action: "webhook_mp",
    resourceType: "payment",
    resourceId: payment && "id" in payment ? payment.id : null,
    metadata: { external_id: externalId, live: isLive },
  });



  return NextResponse.json({ ok: true, payment_id: payment?.id ?? null });
}

type ServiceClient = Awaited<ReturnType<typeof createServiceClient>>;

/**
 * Entrega da vitrine: "workout:<uuid>" ou "diet:<uuid>".
 * Copia o template (só o que está à venda) para o comprador
 * como template próprio, fora da vitrine.
 */
async function fulfillMarketplace(supabase: ServiceClient, buyerId: string, ref: string) {
  const [kind, templateId] = ref.split(":");
  if ((kind !== "workout" && kind !== "diet") || !templateId) return;

  if (kind === "workout") {
    const { data: tpl } = await supabase
      .from("workout_templates")
      .select("id, title, description, category, difficulty, estimated_minutes")
      .eq("id", templateId)
      .eq("is_for_sale", true)
      .maybeSingle();
    if (!tpl) return;
    const t = tpl as Record<string, unknown>;
    const { data: copy } = await supabase
      .from("workout_templates")
      .insert({
        slug: `adquirido-${Date.now()}-${String(t.id).slice(0, 8)}`,
        title: `${t.title} (adquirido)`,
        description: t.description,
        category: t.category,
        difficulty: t.difficulty,
        estimated_minutes: t.estimated_minutes,
        is_global: false,
        created_by: buyerId,
        is_for_sale: false,
      })
      .select("id")
      .single();
    if (!copy) return;
    const newId = (copy as { id: string }).id;
    const { data: items } = await supabase
      .from("workout_template_items")
      .select("exercise_id, position, sets, reps, load, rest_seconds, rpe, notes")
      .eq("template_id", templateId);
    if (items && (items as unknown[]).length > 0) {
      await supabase
        .from("workout_template_items")
        .insert(
          (items as Array<Record<string, unknown>>).map((i) => ({ ...i, template_id: newId })),
        );
    }
    return;
  }

  const { data: dtpl } = await supabase
    .from("diet_templates")
    .select("id, title, description, kcal_target, p_target, c_target, g_target, goal")
    .eq("id", templateId)
    .eq("is_for_sale", true)
    .maybeSingle();
  if (!dtpl) return;
  const d = dtpl as Record<string, unknown>;
  const { data: dcopy } = await supabase
    .from("diet_templates")
    .insert({
      trainer_id: buyerId,
      title: `${d.title} (adquirido)`,
      description: d.description,
      kcal_target: d.kcal_target,
      p_target: d.p_target,
      c_target: d.c_target,
      g_target: d.g_target,
      goal: d.goal,
      is_global: false,
      is_for_sale: false,
    })
    .select("id")
    .single();
  if (!dcopy) return;
  const newDietId = (dcopy as { id: string }).id;
  const { data: meals } = await supabase
    .from("diet_template_meals")
    .select("id, name, time, position")
    .eq("template_id", templateId)
    .order("position");
  for (const m of (meals ?? []) as Array<Record<string, unknown>>) {
    const { data: nm } = await supabase
      .from("diet_template_meals")
      .insert({ template_id: newDietId, name: m.name, time: m.time, position: m.position })
      .select("id")
      .single();
    if (!nm) continue;
    const { data: items } = await supabase
      .from("diet_template_items")
      .select("food_name, grams, position")
      .eq("meal_id", m.id);
    if (items && (items as unknown[]).length > 0) {
      await supabase
        .from("diet_template_items")
        .insert(
          (items as Array<Record<string, unknown>>).map((i) => ({
            ...i,
            meal_id: (nm as { id: string }).id,
          })),
        );
    }
  }
}

export async function GET() {
  // Healthcheck (Mercado Pago pinga via GET em alguns fluxos)
  return NextResponse.json({ ok: true, service: "mercadopago-webhook" });
}

/**
 * Assinatura autorizada no cartão: busca o preapproval na API do MP,
 * confere status e destrava o trainer (plano + trial off).
 */
async function handleSubscriptionAuthorized(supabase: ServiceClient, preapprovalId: string) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) return;
  try {
    const res = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return;
    const data = (await res.json()) as {
      status?: string;
      external_reference?: string;
      auto_recurring?: { transaction_amount?: number };
    };
    if (data.status !== "authorized") return;
    const [userId, planId] = String(data.external_reference ?? "").split(":");
    if (!userId || !["start", "pro", "top"].includes(planId)) return;

    await supabase
      .from("payment_links")
      .update({ paid_at: new Date().toISOString() })
      .eq("trainer_id", userId)
      .like("description", "Plano %assinatura%")
      .is("paid_at", null);

    await supabase
      .from("trainer_profiles")
      .update({ plan_tier: planId, trial_ends_at: null })
      .eq("user_id", userId);

    await auditLog({
      userId,
      action: "webhook_mp",
      resourceType: "subscription",
      resourceId: preapprovalId,
      metadata: { plan: planId },
    });
  } catch (e) {
    safeLog.error("[mp-webhook] subscription check failed", e instanceof Error ? e.message : "unknown");
  }
}
