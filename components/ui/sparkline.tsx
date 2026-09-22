"use client";

import { motion } from "motion/react";

/**
 * Mini gráfico de linha (sparkline) com animação de desenho progressivo.
 *
 * Props:
 *  - data: array de números (eixo Y)
 *  - labels: array opcional de strings pra mostrar abaixo
 *  - height: altura do SVG em px (largura é 100% responsiva)
 *  - stroke: cor da linha (default primary)
 *  - showDots: se mostra bolinhas em cada ponto
 *  - showArea: preenche abaixo da linha
 */
export function Sparkline({
  data,
  labels,
  height = 60,
  stroke,
  showDots = true,
  showArea = true,
  className,
}: {
  data: number[];
  labels?: string[];
  height?: number;
  stroke?: string;
  showDots?: boolean;
  showArea?: boolean;
  className?: string;
}) {
  if (data.length === 0) return null;

  const W = 600;
  const H = height;
  const padding = 6;
  const xs = data.map((_, i) =>
    padding + (i * (W - padding * 2)) / Math.max(1, data.length - 1),
  );
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const ys = data.map((v) => H - padding - ((v - min) / range) * (H - padding * 2));

  const path = data
    .map((_, i) => `${i === 0 ? "M" : "L"} ${xs[i].toFixed(1)} ${ys[i].toFixed(1)}`)
    .join(" ");
  const area = `${path} L ${xs.at(-1)} ${H - padding} L ${xs[0]} ${H - padding} Z`;

  const strokeColor = stroke ?? "currentColor";

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: `${height}px` }}
        preserveAspectRatio="none"
        role="img"
      >
        <defs>
          <linearGradient id="spark-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {showArea && (
          <motion.path
            d={area}
            fill="url(#spark-area)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          />
        )}

        <motion.path
          d={path}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />

        {showDots &&
          xs.map((x, i) => (
            <motion.circle
              key={i}
              cx={x}
              cy={ys[i]}
              r="3"
              fill={strokeColor}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                duration: 0.3,
                delay: 0.7 + i * 0.04,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          ))}
      </svg>

      {labels && (
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          {labels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}
