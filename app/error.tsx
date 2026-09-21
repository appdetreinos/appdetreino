"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { safeLog } from "@/lib/log/safe";

/**
 * Error boundary global do App Router.
 * Captura qualquer exception lançada em RSC e renderiza fallback branded.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    safeLog.error("[global-error] caught", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

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
            <p className="mt-3 text-xs font-mono text-muted-foreground">
              ref: {error.digest}
            </p>
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
