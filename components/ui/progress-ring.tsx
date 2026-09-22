"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Anel circular com progresso animado (0–100).
 *
 * Pra usar: <ProgressRing value={73} size={80} />
 */
export function ProgressRing({
  value,
  size = 80,
  strokeWidth = 6,
  className,
  trackColor = "rgba(255,255,255,0.08)",
  progressColor,
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  trackColor?: string;
  progressColor?: string;
  label?: ReactNode;
  sublabel?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - strokeWidth) / 2;
  const C = 2 * Math.PI * r;
  const offset = C * (1 - v / 100);

  return (
    <div className={`relative inline-grid place-items-center ${className ?? ""}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={progressColor ?? "currentColor"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {label !== undefined && (
          <div>
            <div className="text-2xl font-extrabold leading-none">{label}</div>
            {sublabel && <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{sublabel}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
