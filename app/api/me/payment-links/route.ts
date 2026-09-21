import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { safeLog } from "@/lib/log/safe";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";

const createSchema = z
  .object({
    description: z.string().trim().min(2).max(140),
    amount_cents: z.number().int().min(100).max(1_000_000_00),
    expires_at: z.string().nullable().optional(),
    audience: z
      .object({ email: z.string().email().nullable().optional() })
      .nullable()
      .optional(),
  })
  .strict();

/**
 * POST /api/me/payment-links
 *
 * Trainer cria link avulso de pagamento. Em produção, chama Mercado Pago
 * para gerar link Pix/Cartão e devolve `url` + `external_id`.
 *
 * Como dependência: Pix Direto via trainer_settings.pix_key. Esse endpoint
 * persiste só os metadados — geraremos o link no provider em sprint futura.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, createSchema);
  if (!body.ok) return body.response;

  // Gera URL pública estável — abre /pay/[publicCode] que redireciona ao aluno.
  const publicCode = generatePublicCode();

  const { data, error } = await auth.supabase
    .from("payment_links")
    .insert({
      trainer_id: auth.user.id,
      description: body.data.description,
      amount_cents: body.data.amount_cents,
      expires_at: body.data.expires_at ?? null,
      url: `https://app.vivafit.com.br/pay/${publicCode}`,
      external_id: publicCode,
    })
    .select("id, public_code")
    .single();

  if (error) {
    safeLog.error("[payment-links/create] failed", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    id: data?.id,
    public_code: data?.public_code,
    url: `https://app.vivafit.com.br/pay/${publicCode}`,
  });
}

/** Gera code hex 12 chars (não-collision suficiente p/ MVP). */
function generatePublicCode(): string {
  // 6 bytes = 12 hex chars, ~2^48 combinações.
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
