import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeLog } from "@/lib/log/safe";

const querySchema = z.object({ id: z.string().min(1).max(40) });

/**
 * GET /api/mercadopago/pix-status?id= — status do Pix (polling pós-QR).
 * Leitura autenticada (sem mutação) — dispensa CSRF.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const parsed = querySchema.safeParse({
    id: new URL(request.url).searchParams.get("id"),
  });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "validation_failed" }, { status: 400 });
  }

  try {
    const { mpClient } = await import("@/lib/mercadopago/client");
    const { Payment } = await import("mercadopago");
    const client = mpClient();
    if (!client) {
      return NextResponse.json({ ok: false, error: "mercadopago_not_configured" }, { status: 503 });
    }
    const paymentApi = new Payment(client);
    const data = (await paymentApi.get({ id: parsed.data.id })) as { status?: string };
    return NextResponse.json({ ok: true, status: data.status ?? "unknown" });
  } catch (e) {
    safeLog.error("[mp-pix-status] failed", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
