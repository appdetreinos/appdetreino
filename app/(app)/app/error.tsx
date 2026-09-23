"use client";

import { ButtonLink } from "@/components/ui/button-link";

/** Fallback de erro do painel do trainer — nunca tela branca. */
export default function TrainerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-10 text-center max-w-md mx-auto">
      <h1 className="text-xl font-bold">Algo deu errado por aqui</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tenta recarregar. Se persistir, anota o código {error.digest ?? "—"} e fala com o suporte.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Tentar de novo
        </button>
        <ButtonLink href="/app" variant="outline">
          Voltar ao painel
        </ButtonLink>
      </div>
    </div>
  );
}
