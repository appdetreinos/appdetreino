/**
 * Wrapper mínimo do Mercado Pago Bricks (server-side helpers).
 *
 * Por enquanto só expõe:
 *  - configuração de credenciais (lidas de env vars)
 *  - verificação de assinatura de webhook
 *  - tipos de payload do webhook IPN/Bricks
 *
 * O checkout hospedado e o disparo de link de pagamento vão entrar
 * na próxima fase — por ora o webhook só atualiza `payments.status`.
 */

export interface MPWebhookPayload {
  type?: string;
  action?: string;
  data?: { id?: string | number };
  api_version?: string;
  user_id?: string | number;
  live_mode?: boolean;
}

export function getMPAccessToken(): string | undefined {
  return process.env.MERCADOPAGO_ACCESS_TOKEN;
}

export function getMPPublicKey(): string | undefined {
  return process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
}

/**
 * Validação simples do webhook do Mercado Pago.
 * A doc oficial pede HMAC-SHA256 do `x-signature` + `x-request-id` + `data.id`.
 * Pra MVP a gente checa se existe access token configurado — quando o usuário
 * plugar credenciais reais, ativamos a validação completa.
 */
export function isMPWebhookAuthorized(headers: Headers): boolean {
  const token = getMPAccessToken();
  if (!token) return true; // modo dev — sem credenciais, deixa passar
  const signature = headers.get("x-signature");
  const requestId = headers.get("x-request-id");
  // Em prod, compute HMAC e compare. Aqui basta garantir que algo veio.
  return Boolean(signature && requestId);
}
