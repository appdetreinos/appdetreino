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
    test: z.boolean().optional(),
  })
  .strict();

/**
 * POST /api/mercadopago/pix — QR Pix direto (sem Bricks, sem sair da página).
 * Responde { qr_code, qr_base64, payment_id, expires_at }.
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

  const isTest =
    parsed.data.test === true && process.env.ALLOW_TEST_CHECKOUT === "1";
  const expected_cents = isTest ? 10 : formatCents(plan.priceMonthly);
  if (parsed.data.amount_cents !== expected_cents) {
    return NextResponse.json(
      { ok: false, error: "amount_mismatch", expected_cents, plan_id: plan.id },
      { status: 400 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const payerName = String(
    (profile as { full_name?: string } | null)?.full_name ?? "",
  ).trim();
  const [first, ...rest] = payerName.split(/\s+/).filter(Boolean);

  try {
    const { mpClient } = await import("@/lib/mercadopago/client");
    const { Payment } = await import("mercadopago");
    const client = mpClient();
    if (!client) {
      return NextResponse.json({ ok: false, error: "mercadopago_not_configured" }, { status: 503 });
    }
    const paymentApi = new Payment(client);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const created = (await paymentApi.create({
      body: {
        transaction_amount: expected_cents / 100,
        payment_method_id: "pix",
        description: `Viva FIT — Plano ${plan.name}`,
        date_of_expiration: expiresAt,
        payer: {
          email: user.email,
          ...(first ? { first_name: first, last_name: rest.join(" ") || first } : {}),
        },
        notification_url: await notifyUrl(),
        external_reference: `${user.id}:${plan.id}:${currentYYYYMM()}`,
      },
    })) as {
      id?: unknown;
      status?: string;
      point_of_interaction?: {
        transaction_data?: { qr_code?: string; qr_code_base64?: string };
      };
      date_of_expiration?: string;
    };

    const tx = created.point_of_interaction?.transaction_data;
    if (!tx?.qr_code) {
      safeLog.error("[mp-pix] no qr returned", { status: created.status });
      return NextResponse.json({ ok: false, error: "pix_unavailable" }, { status: 502 });
    }

    const { createServiceClient } = await import("@/lib/supabase/server");
    const admin = await createServiceClient();
    await admin.from("payment_links").insert({
      trainer_id: user.id,
      description: isTest ? `Plano ${plan.name} (TESTE)` : `Plano ${plan.name}`,
      amount_cents: expected_cents,
      external_id: created.id != null ? String(created.id) : null,
      expires_at: created.date_of_expiration ?? null,
    });

    return NextResponse.json({
      ok: true,
      payment_id: created.id != null ? String(created.id) : null,
      qr_code: tx.qr_code,
      qr_base64: tx.qr_code_base64 ?? null,
      expires_at: created.date_of_expiration ?? null,
    });
  } catch (e) {
    safeLog.error("[mp-pix] unhandled", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

function currentYYYYMM(): string {
  const brt = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  return `${brt.getFullYear()}-${String(brt.getMonth() + 1).padStart(2, "0")}`;
}

async function notifyUrl(): Promise<string | undefined> {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const { headers } = await import("next/headers");
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    const base =
      host && !host.includes("localhost") ? `${proto}://${host}` : siteUrl;
    return `${base}/api/mercadopago/webhook`;
  } catch {
    return undefined;
  }
}
