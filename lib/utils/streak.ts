/**
 * Calcula streak de hábito (dias consecutivos atingindo a meta).
 *
 * @param byDate  Mapa de data (YYYY-MM-DD) → count registrado naquele dia
 * @param target  Meta diária (>= target conta como "ok")
 * @param maxDays Limite máximo de dias pra olhar pra trás (default 60)
 * @returns Tamanho do streak atual (0 se não bateu hoje)
 */
export function calcHabitStreak(
  byDate: Map<string, number>,
  target: number,
  maxDays = 60,
): number {
  if (target <= 0) return 0;
  const tz = "America/Sao_Paulo";
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < maxDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toLocaleDateString("en-CA", { timeZone: tz });
    const count = byDate.get(key) ?? 0;
    if (count >= target) {
      streak++;
    } else {
      // Permitir 1 dia de graça só se for "ontem" (pra não cortar streak
      // de quem ainda não registrou hoje mas registrou ontem)
      if (i === 0) continue;
      break;
    }
  }
  return streak;
}
