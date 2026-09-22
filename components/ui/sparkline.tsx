"use client";

/**
 * Mini gráfico de linha (sparkline).
 *
 * Versão SEM motion/react — usa SVG puro + CSS animations
 * (stroke-dasharray pra desenhar a linha progressivamente).
 *
 * motion/react v13.4.0 quebra com Next 16 + React 19 em algumas
 * situações, então migramos pra CSS keyframes (que são determinísticos
 * e não dependem de JS pra animar).
 *
 * Props: igual à versão anterior.
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
          <path
            d={area}
            fill="url(#spark-area)"
            className="animate-fade-in"
            style={{ animationDelay: "300ms", animationFillMode: "backwards" }}
          />
        )}

        <path
          d={path}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="sparkline-path"
        />

        {showDots &&
          xs.map((x, i) => (
            <circle
              key={i}
              cx={x}
              cy={ys[i]}
              r="3"
              fill={strokeColor}
              className="sparkline-dot"
              style={{ animationDelay: `${700 + i * 40}ms` }}
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
