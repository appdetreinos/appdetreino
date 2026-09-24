"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Lockout total do trial em todas as rotas /app/*.
 * Server calcula `locked`; client redireciona, exceto em
 * checkout/upgrade (senão prende o pagamento em loop).
 */
const ALLOWLIST = ["/app/checkout", "/app/settings/upgrade", "/app/upgrade"];

export function TrialGate({ locked }: { locked: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!locked) return;
    if (ALLOWLIST.some((p) => pathname === p || pathname.startsWith(p + "/"))) return;
    router.replace("/app/settings/upgrade?locked=1");
  }, [locked, pathname, router]);

  return null;
}
