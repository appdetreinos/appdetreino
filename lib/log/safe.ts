/**
 * Safe logger — helpers pra logar SEM vazar PII ou segredos.
 *
 * Princípios:
 *   - Nunca logar token (JWT, refresh_token, access_token).
 *   - Nunca logar senha (nem hash).
 *   - Sempre mascarar telefone/PIX quando aparecer em log.
 *   - Webhook payloads: logar só tipo + ID externo, nunca o body inteiro.
 */

const PII_PATTERNS: Array<{ pattern: RegExp; mask: (s: string) => string }> = [
  // JWT-like (eyJ...)
  {
    pattern: /eyJ[A-Za-z0-9_-]{10,}/g,
    mask: () => "[REDACTED_JWT]",
  },
  // Tokens alfanuméricos longos (>= 32 chars)
  {
    pattern: /\b[A-Za-z0-9]{32,}\b/g,
    mask: () => "[REDACTED_TOKEN]",
  },
];

function maskString(input: string): string {
  let out = input;
  for (const { pattern, mask } of PII_PATTERNS) {
    out = out.replace(pattern, mask);
  }
  return out;
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "****";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `(${digits.slice(0, 2) ?? "**"}) ****-${digits.slice(-2) ?? "**"}`;
}

export function maskPixKey(key: string | null | undefined): string {
  if (!key) return "****";
  if (key.length <= 4) return "****";
  return `****${key.slice(-4)}`;
}

export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes("@")) return "****";
  const [local, domain] = email.split("@");
  if (!local || !domain) return "****";
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(local.length - 2, 1))}@${domain}`;
}

function safeArg(arg: unknown): unknown {
  if (typeof arg === "string") return maskString(arg);
  if (arg instanceof Error) {
    return {
      name: arg.name,
      message: maskString(arg.message),
      stack: process.env.NODE_ENV === "production" ? undefined : arg.stack,
    };
  }
  return arg;
}

export const safeLog = {
  info: (...args: unknown[]) => {
    if (process.env.NODE_ENV === "production") return;
    console.info(...args.map(safeArg));
  },
  warn: (...args: unknown[]) => console.warn(...args.map(safeArg)),
  error: (...args: unknown[]) => console.error(...args.map(safeArg)),
};
