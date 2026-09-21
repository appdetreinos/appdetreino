/**
 * Helpers para sanitização de inputs antes de uso em queries.
 * Especialmente em `.or(...)` ou `.ilike(...)` do PostgREST, onde
 * caracteres como `"` `,` `.` `()` podem ser interpretados como
 * sintaxe da query string.
 */

/**
 * Mantém só dígitos, +, -, (, ), espaço. Impede PostgREST `.or()` injection.
 * Tel BR típico fica `+55 (11) 91234-5678` → vira `+5511912345678` após
 * trim agressivo? Não: mantemos espaços/traços/parênteses porque alguns
 * DBs gravam o telefone formatado. O importante é não deixar passar
 * aspas/comas/pontos-que-viram-RPC-filter.
 */
export function sanitizePhone(input: string | null | undefined): string {
  if (!input) return "";
  // Mantém só chars seguros. Sem vírgula, sem ponto, sem aspas, sem parêntese-2x.
  return String(input).replace(/[^0-9+\-\s()]/g, "").slice(0, 32);
}

/** Texto livre (descrições, mensagens) — trim + limite duro, sem nova função. */
export function sanitizeText(input: string | null | undefined, max = 1000): string {
  if (!input) return "";
  return String(input).trim().slice(0, max);
}
