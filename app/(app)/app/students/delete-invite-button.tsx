"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { csrfFetch } from "@/lib/security/client";

/**
 * Botão pra excluir (cancelar) um convite pendente.
 * Confirma antes pra evitar exclusão acidental.
 */
export function DeleteInviteButton({ inviteId }: { inviteId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        "Excluir esse convite? O aluno não vai mais conseguir entrar por esse link.",
      );
      if (!ok) return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await csrfFetch(`/api/me/student-invites/${inviteId}`, {
        method: "DELETE",
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "Não deu pra excluir.");
        setLoading(false);
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError("Erro de rede.");
      setLoading(false);
    }
  }

  return (
    <div className="relative inline-flex">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleClick}
        disabled={loading || pending}
        title="Excluir convite"
        className="text-foreground/60 hover:text-destructive"
      >
        {loading || pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
      </Button>
      {error && (
        <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
