import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";
import { safeLog } from "@/lib/log/safe";

const bodySchema = z
  .object({
    kind: z.enum(["workout", "diet"]),
    template_id: z.string().uuid(),
  })
  .strict();

/**
 * POST /api/marketplace/buy {kind, template_id}
 * Cria preferência MP pra comprar planilha de outro trainer.
 * No webhook aprovado, o template é clonado pro comprador.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const { data: me } = await auth.supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();
  const role = (me as { role?: string } | null)?.role;
  if (role !== "trainer" && role !== "admin") {
    return NextResponse.json({ ok: false, error: "Só profissional." }, { status: 403 });
  }

  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  const table = body.data.kind === "workout" ? "workout_templates" : "diet_templates";
  const { data: tpl } = await auth.supabase
    .from(table)
    .select("id, title, price_cents, is_for_sale")
    .eq("id", body.data.template_id)
    .eq("is_for_sale", true)
    .maybeSingle();

  const t = tpl as { id: string; title: string; price_cents: number | null } | null;
  if (!t || t.price_cents == null || t.price_cents < 100) {
    return NextResponse.json({ ok: false, error: "Anúncio indisponível." }, { status: 404 });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "mercadopago_not_configured" }, { status: 503 });
  }
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  let notifyBase = siteUrl;
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (host && !host.includes("localhost")) notifyBase = `${proto}://${host}`;
  } catch { /* mantém siteUrl */ }

  try {
    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": `market-${auth.user.id}-${body.data.kind}-${body.data.template_id}`,
      },
      body: JSON.stringify({
        items: [
          {
            title: `Planilha: ${t.title}`,
            quantity: 1,
            unit_price: t.price_cents / 100,
            currency_id: "BRL",
          },
        ],
        payer: { email: auth.user.email },
        back_urls: {
          success: `${siteUrl}/app/marketplace?bought=1`,
          failure: `${siteUrl}/app/marketplace`,
          pending: `${siteUrl}/app/marketplace?bought=pending`,
        },
        auto_return: "approved",
        external_reference: `market:${auth.user.id}:${body.data.kind}:${body.data.template_id}`,
        notification_url: `${notifyBase}/api/mercadopago/webhook`,
      }),
    });
    if (!mpRes.ok) {
      safeLog.error("[marketplace] mp failed", { status: mpRes.status });
      return NextResponse.json({ ok: false, error: "mp_api_failed" }, { status: 502 });
    }
    const mpData = (await mpRes.json()) as { id: string; init_point?: string };
    if (!mpData.init_point) {
      return NextResponse.json({ ok: false, error: "no_init_point" }, { status: 502 });
    }

    await auth.supabase.from("payment_links").insert({
      trainer_id: auth.user.id,
      description: `Marketplace ${body.data.kind}:${body.data.template_id}`,
      amount_cents: t.price_cents,
      external_id: mpData.id,
      url: mpData.init_point,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    return NextResponse.json({ ok: true, init_point: mpData.init_point });
  } catch (e) {
    safeLog.error("[marketplace] unhandled", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
