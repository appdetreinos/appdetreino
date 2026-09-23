import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeLog } from "@/lib/log/safe";
import { ensureCsrf } from "@/lib/security/csrf-helpers";

/**
 * POST /api/mercadopago/cancel-subscription
 * Cancela a assinatura recorrente no Mercado Pago.
 * O plano atual segue até o fim do ciclo; renovações param.
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

  const { data: sub } = await supabase
    .from("payment_links")
    .select("id, external_id")
    .eq("trainer_id", user.id)
    .like("description", "Plano %assinatura%")
    .not("paid_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = sub as { id: string; external_id: string | null } | null;
  if (!row?.external_id || row.external_id.startsWith("sub-")) {
    return NextResponse.json({ ok: false, error: "no_active_subscription" }, { status: 404 });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "mercadopago_not_configured" }, { status: 503 });
  }

  try {
    const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${row.external_id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ status: "cancelled" }),
    });
    if (!mpRes.ok && mpRes.status !== 404) {
      safeLog.error("[mp-cancel] mp api failed", { status: mpRes.status });
      return NextResponse.json({ ok: false, error: "mp_api_failed" }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    safeLog.error("[mp-cancel] unhandled", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
