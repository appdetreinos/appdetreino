"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Copy, Check } from "lucide-react";
import { useState } from "react";
import { safeLog } from "@/lib/log/safe";

/**
 * Error boundary global do App Router.
 * Captura qualquer exception lançada em RSC e renderiza fallback branded.
 *
 * Em produção: loga via console (Vercel captura) + mostra ref pro usuário
 * reportar. Stack só aparece em dev.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    safeLog.error("[global-error] caught", {
      pathname,
      message: error.message,
      digest: error.digest,
      name: error.name,
    });
  }, [error, pathname]);

  const refId = error.digest ?? "sem-ref";

  function copyRef() {
    try {
      void navigator.clipboard.writeText(refId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10 bg-background text-foreground">
      <Card className="bg-card/80 border-white/10 p-8 max-w-md w-full text-center space-y-4">
        <div className="grid size-12 mx-auto place-items-center rounded-full bg-red-500/15 text-red-400">
          <AlertTriangle className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">Tivemos um problema</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A página falhou ao carregar. Você pode tentar de novo — se o erro persistir,
            nos avise no WhatsApp.
          </p>
          {error.digest ? (
            <button
              onClick={copyRef}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-background/40 px-2.5 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Copiar código de referência"
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              ref: {refId}
            </button>
          ) : null}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={() => reset()}>
            Tentar novamente
          </Button>
          <ButtonLink href="/" size="sm">
            Voltar ao início
          </ButtonLink>
        </div>
      </Card>
    </main>
  );
}
