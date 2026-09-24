import { MercadoPagoConfig } from "mercadopago";
import { safeLog } from "@/lib/log/safe";

/** Client oficial do MP (boa prática do checklist de qualidade). */
export function mpClient(): MercadoPagoConfig | null {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) return null;
  try {
    return new MercadoPagoConfig({ accessToken, options: { timeout: 15000 } });
  } catch (e) {
    safeLog.error("[mp] config failed", e instanceof Error ? e.message : "unknown");
    return null;
  }
}
