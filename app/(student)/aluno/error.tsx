"use client";

import Link from "next/link";

/** Fallback de erro do app do aluno — nunca tela branca. */
export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-10 text-center max-w-md mx-auto">
      <h1 className="text-xl font-bold">Ops, travou aqui</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tenta de novo — teu treino tá salvo.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Tentar de novo
        </button>
        <Link
          href="/aluno"
          className="rounded-md border border-white/10 px-4 py-2 text-sm font-semibold"
        >
          Início
        </Link>
      </div>
    </div>
  );
}
