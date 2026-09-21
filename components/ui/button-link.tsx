"use client";

import Link from "next/link";
import { type ComponentProps } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

type ButtonLinkProps = ComponentProps<typeof Link> &
  VariantProps<typeof buttonVariants> & {
    children: React.ReactNode;
  };

// Componente que renderiza um <Link> com a mesma aparência visual do Button.
// Necessário porque shadcn 4 + base-ui não tem `asChild` (usa `render`).
export function ButtonLink({
  className,
  variant,
  size,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </Link>
  );
}

export { Button, buttonVariants };