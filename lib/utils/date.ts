/**
 * Helpers de data — sem dependências externas.
 */

/** Compara se uma data ISO é "hoje" no fuso do servidor (UTC costuma bastar pro MVP). */
export function isToday(iso: string | Date): boolean {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const now = new Date();
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}

/** Tempo relativo tipo "há 12 min" / "há 3h" / "há 2d" / data formatada. */
export function relativeTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return "agora";
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const dd = Math.floor(h / 24);
  if (dd < 7) return `há ${dd}d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/**
 * Retorna hoje no fuso America/Sao_Paulo como "YYYY-MM-DD".
 *
 * API/banco usa isso para habit_logs.logged_at, wod_result.completed_at etc.
 * Substitui o uso problemático de `new Date().toISOString().split("T")[0]`
 * (que vira UTC e atrasa 1 dia no Brasil à noite).
 */
export function todayBR(now: Date = new Date()): string {
  const brt = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  const yyyy = brt.getFullYear();
  const mm = String(brt.getMonth() + 1).padStart(2, "0");
  const dd = String(brt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
