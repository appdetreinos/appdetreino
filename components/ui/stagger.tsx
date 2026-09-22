"use client";

import { motion, animate, useMotionValue, useTransform, type HTMLMotionProps } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Container que faz filhos entrarem com stagger (um após o outro).
 * Pra usar: <Stagger><Card1 /><Card2 /><Card3 /></Stagger>
 *
 * Respeita prefers-reduced-motion automaticamente via motion/react.
 */
export function Stagger({
  children,
  delay = 0,
  className,
  ...rest
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
} & Omit<HTMLMotionProps<"div">, "children">) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.06,
            delayChildren: delay,
          },
        },
      }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/**
 * Item filho de <Stagger>. Animação: fade + slide pra cima.
 */
export function StaggerItem({
  children,
  className,
  ...rest
}: {
  children: ReactNode;
  className?: string;
} & Omit<HTMLMotionProps<"div">, "children">) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
        },
      }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/**
 * Contador animado de 0 → value. Duração curta, easing ease-out.
 * Pra usar: <AnimatedNumber value={42} /> ou com format.
 */
export function AnimatedNumber({
  value,
  duration = 0.9,
  format,
  className,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toString());
  // Pra format (R$ etc.) — acompanha o motion value
  const [text, setText] = useState(format ? format(0) : "0");

  useEffect(() => {
    const controls = animate(mv, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
    });
    if (format) {
      const unsub = mv.on("change", (v) => setText(format(v)));
      return () => {
        controls.stop();
        unsub();
      };
    }
    return () => controls.stop();
  }, [mv, value, duration, format]);

  return (
    <motion.span className={className} suppressHydrationWarning>
      {format ? text : rounded}
    </motion.span>
  );
}
