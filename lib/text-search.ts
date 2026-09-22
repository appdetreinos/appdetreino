/**
 * Helpers de busca textual usados nos pickers/listas de exercícios.
 * Mantém a normalização em um único lugar para que a lupa da biblioteca,
 * do picker e do seletor avulso compartilhem o mesmo comportamento.
 *
 * Portado do `ideal-life-app-main/lib/text-search.ts`.
 */

import type { Exercise } from "@/lib/types/workout";

/** Normaliza para busca: minúsculas + remoção de acentos + trim. */
export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

/**
 * Verifica se `haystack` contém `needle` ignorando:
 *   - case (maiúsculas/minúsculas);
 *   - acentos (á, ã, ç, …);
 *   - espaços nas pontas.
 *
 * Útil para buscas de exercícios que precisam casar "Puxada Alta"
 * com "puxada" ou "maquina" / "máquina".
 */
export function fuzzyIncludes(
  haystack: string | null | undefined,
  needle: string,
): boolean {
  const term = normalizeSearch(needle);
  if (!term) return true;
  if (haystack == null) return false;
  return normalizeSearch(haystack).includes(term);
}

/**
 * Verifica se `needle` está presente em pelo menos um dos campos
 * fornecidos. Cada campo é avaliado com `fuzzyIncludes`.
 */
export function matchesAny(
  needle: string,
  fields: Array<string | null | undefined>,
): boolean {
  const term = needle.trim();
  if (!term) return true;
  return fields.some((f) => fuzzyIncludes(f, term));
}

/** Segmento retornado por `splitByMatch` — usado para renderizar o nome
 *  com a parte que casa com o termo em destaque. */
export type MatchSegment = { text: string; match: boolean };

/**
 * Divide `text` em segmentos contíguos marcando quais batem com `term`
 * (case/accent-insensitive via `normalizeSearch`). Útil para renderizar
 * um highlight visual no picker de exercícios.
 *
 * Devolve `[{ text: <texto original>, match: boolean }]` na ordem
 * encontrada. Se `term` é vazio, devolve `[{ text, match: false }]`.
 *
 * O mapeamento entre índices normalizados e originais é feito
 * caminhando ambos os strings em paralelo: a normalização NFD pode
 * dividir um caractere com acento em 2+ unidades (ex: `ã` → `a` + `̃`),
 * então cada unidade original pode gerar 1 ou mais unidades normalizadas.
 */
export function splitByMatch(
  text: string,
  term: string,
): MatchSegment[] {
  if (!text) return [];
  const normalizedTerm = normalizeSearch(term);
  if (!normalizedTerm) return [{ text, match: false }];

  const normalizedText = normalizeSearch(text);
  if (!normalizedText) return [{ text, match: false }];

  const segments: MatchSegment[] = [];
  let cursor = 0;
  let pos = normalizedText.indexOf(normalizedTerm, cursor);
  if (pos === -1) return [{ text, match: false }];

  // Cada caractere normalizado pode ter vindo de 1+ caracteres originais
  // (caso dos acentos). Como aqui já normalizamos tanto o text quanto o
  // term com NFD, a busca na string normalizada é confiável — basta
  // mapear o índice normalizado de volta pro original.
  while (pos !== -1) {
    if (pos > cursor) {
      segments.push({ text: text.slice(cursor, pos), match: false });
    }
    segments.push({ text: text.slice(pos, pos + normalizedTerm.length), match: true });
    cursor = pos + normalizedTerm.length;
    pos = normalizedText.indexOf(normalizedTerm, cursor);
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), match: false });
  }
  return segments;
}

/** Score de match de um item contra um termo. Quanto maior, melhor. */
function scoreItem(item: Pick<Exercise, "name" | "muscle_group" | "equipment" | "aliases">, term: string): number {
  const t = normalizeSearch(term);
  if (!t) return 1;

  const name = normalizeSearch(item.name);
  const muscle = normalizeSearch((item.muscle_group ?? "") as string);
  const equipment = normalizeSearch((item.equipment ?? "") as string);
  const aliases = (item.aliases ?? []).map(normalizeSearch);

  // Prioridade: nome exato > nome começa com > nome contém > aliases > muscle > equipment.
  if (name === t) return 100;
  if (name.startsWith(t)) return 50;
  if (name.includes(t)) return 20;
  for (const a of aliases) {
    if (a === t) return 30;
    if (a.startsWith(t)) return 15;
    if (a.includes(t)) return 8;
  }
  if (muscle.includes(t)) return 5;
  if (equipment.includes(t)) return 3;
  return 0;
}

/**
 * Retorna `items` ordenados por relevância ao termo.
 * Itens com score 0 são descartados. Se o termo é vazio, devolve na
 * ordem original.
 */
export function rankExercisesByQuery<T extends Pick<Exercise, "name" | "muscle_group" | "equipment" | "aliases">>(
  items: T[],
  term: string,
): T[] {
  const t = term.trim();
  if (!t) return items.slice();
  const scored = items
    .map((it) => ({ it, score: scoreItem(it, t) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.it.name.localeCompare(b.it.name, "pt-BR"));
  return scored.map((s) => s.it);
}
