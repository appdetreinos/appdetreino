import { lookupExerciseImage } from "./exercise-image-map";
import type { Exercise } from "@/lib/types/workout";

/**
 * Resolve a URL final de mídia de um exercício.
 *
 * Diferente do `ideal-life-app-main` (que tem bucket privado + signed URL),
 * aqui nesta rodada NÃO temos bucket de Storage — toda a mídia é URL
 * externa (Wikimedia Commons) ou data URI gerado localmente. Então a
 * função apenas decide qual fonte usar.
 *
 * Cascata em 3 níveis:
 *
 *   1. `animation_url` se presente (gif/mp4/webm).
 *   2. `image_url` se presente (Wikimedia SVG).
 *   3. Fallback no mapa padrão por nome.
 *
 * Aceita também a conveniência de já receber a URL pronta (em alguns
 * pontos a gente resolve no server e só passa a string final).
 */
export function getExerciseMediaUrl(
  exercise: Pick<Exercise, "image_url" | "animation_url" | "name"> & {
    video_url?: string | null;
  },
): string | null {
  const chosen =
    exercise.animation_url ??
    (exercise.video_url as string | null | undefined) ??
    exercise.image_url ??
    null;
  if (chosen) return chosen;
  const mapped = lookupExerciseImage(exercise.name);
  if (mapped?.url) return mapped.url;
  return null;
}

/** Wrapper que aceita `image_url` cru (storage path OU URL) e cai no
 *  mapa se não houver. `animationUrl` (gif/mp4) tem prioridade — mostra
 *  o movimento, não só a pose. */
export function resolveExerciseMediaUrl(
  imageUrl: string | null | undefined,
  fallbackName: string | null | undefined,
  animationUrl?: string | null | undefined,
): string | null {
  if (animationUrl) return animationUrl;
  if (imageUrl) return imageUrl;
  if (fallbackName) {
    const mapped = lookupExerciseImage(fallbackName);
    if (mapped?.url) return mapped.url;
  }
  return null;
}

/** Detecta se a URL é de um arquivo animado (gif/mp4/webm). */
export function isAnimationUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return /\.(gif|mp4|webm)$/i.test(value);
}
