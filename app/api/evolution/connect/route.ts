import { NextResponse, type NextRequest } from "next/server";
import { requireAuthenticated } from "@/lib/security/guards";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { evoFetch, instanceNameFor } from "@/lib/evolution/client";
import { safeLog } from "@/lib/log/safe";

/**
 * POST /api/evolution/connect
 * Cria a instância (se não existir), registra webhook e devolve o QR.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const { data: me } = await auth.supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (me?.role !== "trainer" && me?.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Só profissional." }, { status: 403 });
  }

  const instance = instanceNameFor(auth.user.id);

  const created = await evoFetch(`/instance/create`, {
    method: "POST",
    body: JSON.stringify({ instanceName: instance, qrcode: true, integration: "WHATSAPP-BAILEYS" }),
  });
  // 403/409 = já existe — segue o jogo
  if (!created.ok && created.error !== "evolution_403" && created.error !== "evolution_409") {
    safeLog.warn("[evolution-connect] create failed", created.error ?? "unknown");
    return NextResponse.json(
      { ok: false, error: "Evolution fora do ar. Confere a URL e a chave." },
      { status: 502 },
    );
  }

  // Webhook (best-effort — não bloqueia o QR)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    await evoFetch(`/webhook/set/${instance}`, {
      method: "POST",
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: `${appUrl}/api/evolution/webhook`,
          events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
        },
      }),
    }).catch(() => null);
  }

  const qr = await evoFetch<{ base64?: string; code?: string; pairingCode?: string }>(
    `/instance/connect/${instance}`,
  );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createSbClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: existing } = await admin
    .from("evolution_instances")
    .select("id")
    .eq("trainer_id", auth.user.id)
    .maybeSingle();
  if (existing) {
    await admin
      .from("evolution_instances")
      .update({ instance_name: instance, state: "connecting", qr_code_base64: qr.data?.base64 ?? null })
      .eq("id", (existing as { id: string }).id);
  } else {
    await admin.from("evolution_instances").insert({
      trainer_id: auth.user.id,
      instance_name: instance,
      state: "connecting",
      qr_code_base64: qr.data?.base64 ?? null,
    });
  }

  return NextResponse.json({
    ok: true,
    instance,
    qr: qr.data?.base64 ?? null,
    pairingCode: qr.data?.pairingCode ?? qr.data?.code ?? null,
  });
}
