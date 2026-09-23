"use client";

import * as React from "react";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Container + items de stagger — entrada progressiva.
 *
 * Migrado de motion/react → CSS animations com delay inline.
 * (motion v13.4.0 quebra com Next 16 + React 19 — ref 3162866030 no /app.)
 *
 * Respeita prefers-reduced-motion automaticamente via CSS (globals.css).
 */
export function Stagger({
  children,
  delay = 0,
  className,
  staggerMs = 60,
  ...rest
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  staggerMs?: number;
} & React.HTMLAttributes<HTMLDivElement>) {
  const items = React.Children.toArray(children).filter(React.isValidElement);

  return (
    <div
      className={className}
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: "both",
      }}
      {...rest}
    >
      {items.map((child, i) => {
        if (!React.isValidElement(child)) return child;
        const childStyle = (child.props as { style?: React.CSSProperties }).style ?? {};
        return React.cloneElement(child as React.ReactElement<{
          style?: React.CSSProperties;
        }>, {
          style: {
            ...childStyle,
            animationDelay: `${delay + i * staggerMs}ms`,
            animationFillMode: "both",
          },
        });
      })}
    </div>
  );
}

/**
 * Item filho de <Stagger>. Animação: fade + slide pra cima via CSS.
 */
export function StaggerItem({
  children,
  className,
  ...rest
}: {
  children: ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`animate-fade-in-up ${className ?? ""}`} {...rest}>
      {children}
    </div>
  );
}

/**
 * Contador animado de 0 → value.
 * Migrado pra vanilla JS requestAnimationFrame (não usa motion).
 *
 * IMPORTANTE (Next 16): props de Server → Client precisam ser
 * serializáveis. Por isso a formatação usa `formatKind` (string)
 * em vez de função — passar `format={(v) => ...}` do server quebra
 * a página com "Functions cannot be passed directly to Client
 * Components" (digest 435854830).
 */
export type AnimatedNumberKind = "int" | "decimal1" | "currency" | "signed1";

function formatByKind(kind: AnimatedNumberKind, n: number): string {
  switch (kind) {
    case "decimal1":
      return n.toFixed(1);
    case "currency":
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
    case "signed1":
      return (n > 0 ? "+" : "") + n.toFixed(1);
    case "int":
    default:
      return Math.round(n).toLocaleString("pt-BR");
  }
}

export function AnimatedNumber({
  value,
  duration = 900,
  formatKind = "int",
  className,
}: {
  value: number;
  duration?: number;
  formatKind?: AnimatedNumberKind;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const to = value;
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (to - from) * eased;
      setDisplay(current);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const text = formatByKind(formatKind, display);

  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  );
}
