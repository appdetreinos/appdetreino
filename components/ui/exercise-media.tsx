"use client";

import { useState } from "react";
import { Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIMARY_MUSCLE_BG, EXERCISE_CATEGORY_BG } from "@/lib/workout";
import { isAnimationUrl } from "@/lib/exercise-images";
import type { Exercise } from "@/lib/types/workout";

type Props = {
  exercise: Pick<
    Exercise,
    "id" | "name" | "muscle_group" | "image_url" | "animation_url" | "category" | "media_type"
  > & { video_url?: string | null };
  /** URL já resolvida (vem do server via getExerciseMediaUrl). */
  resolvedUrl?: string | null;
  /** Quando true, renderiza como mídia grande com aspect ratio 4:3. */
  full?: boolean;
  /** Variação de tamanho (apenas quando full=false). */
  size?: "sm" | "md" | "lg";
};

/**
 * Renderiza a mídia demonstrativa do exercício ou um placeholder SVG por
 * grupo muscular.
 *
 * A `resolvedUrl` é a URL final (Wikimedia ou data URI) já resolvida pelo
 * server. Se ausente, cai num placeholder com iniciais do nome + fundo
 * colorido pelo `primary_muscle` ou `category`.
 *
 * Sem motion — fade in via CSS se precisar (classe `animate-fade-in`).
 */
export function ExerciseMedia({
  exercise,
  resolvedUrl,
  full = false,
  size = "md",
}: Props) {
  // Quebra de imagem (URL morta) cai pro placeholder com iniciais —
  // nunca thumbnail quebrada (gap reportado no picker).
  const [broken, setBroken] = useState(false);
  const showMedia = !!resolvedUrl && !broken;
  const isVideo = /\.(mp4|webm)$/i.test(resolvedUrl ?? "");
  const isAnimation = isVideo || isAnimationUrl(exercise.animation_url ?? resolvedUrl);

  // Fundo por categoria v2 se tiver, senão por músculo primário.
  const bg =
    (exercise.category &&
      (EXERCISE_CATEGORY_BG as Record<string, string>)[
        exercise.category as string
      ]) ||
    PRIMARY_MUSCLE_BG[
      (exercise.muscle_group ?? "outro") as keyof typeof PRIMARY_MUSCLE_BG
    ] ||
    PRIMARY_MUSCLE_BG.outro;

  const imgClass = isAnimation
    ? "h-full w-full rounded-2xl object-cover bg-white/5"
    : "h-full w-full rounded-2xl bg-white object-contain";

  if (showMedia && full) {
    return (
      <div
        className="block w-full rounded-2xl overflow-hidden border border-white/10"
        aria-label={`Imagem de ${exercise.name}`}
      >
        {isVideo ? (
          <video
            src={resolvedUrl as string}
            className={imgClass}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            onError={() => setBroken(true)}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolvedUrl}
            alt={exercise.name}
            className={imgClass}
            loading="lazy"
            onError={() => setBroken(true)}
          />
        )}
      </div>
    );
  }

  if (showMedia) {
    return (
      <div
        className={cn("shrink-0 rounded-2xl overflow-hidden border border-white/10", sizeDims(size))}
        aria-label={`Imagem de ${exercise.name}`}
      >
        {isVideo ? (
          <video
            src={resolvedUrl as string}
            className={imgClass}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            onError={() => setBroken(true)}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolvedUrl}
            alt={exercise.name}
            className={imgClass}
            loading="lazy"
            onError={() => setBroken(true)}
          />
        )}
      </div>
    );
  }

  const initials = exercise.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  if (full) {
    return (
      <div
        className={cn(
          "flex aspect-[4/3] w-full items-center justify-center rounded-2xl border border-white/10",
          bg,
        )}
        aria-label={`${exercise.name} (sem mídia)`}
      >
        {initials ? (
          <span className="text-3xl font-extrabold tracking-tight">{initials}</span>
        ) : (
          <Dumbbell size={48} aria-hidden="true" />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl border border-white/10",
        bg,
        sizeDims(size),
      )}
      aria-label={`${exercise.name} (sem foto)`}
    >
      {initials ? (
        <span className="font-bold tracking-tight">{initials}</span>
      ) : (
        <Dumbbell size={size === "lg" ? 28 : 20} aria-hidden="true" />
      )}
    </div>
  );
}

function sizeDims(size: "sm" | "md" | "lg"): string {
  if (size === "sm") return "h-10 w-10 text-[14px]";
  if (size === "lg") return "h-20 w-20 text-[18px]";
  return "h-14 w-14 text-[16px]";
}
