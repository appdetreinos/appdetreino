"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { csrfFetch } from "@/lib/security/client";

/**
 * Botão "Marcar como paga" — trainer confirma manualmente o pagamento do aluno.
 * (Fluxo sem gateway: aluno transfere direto na chave Pix do trainer.)
 */
export function MarkPaidButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await csrfFetch(`/api/me/payments/${paymentId}/mark-paid`, {
        method: "POST",
      });
      if (!res.ok) {
        setLoading(false);
        return;
      }
      setDone(true);
      startTransition(() => router.refresh());
    } catch {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <span className="text-xs text-emerald-500 font-semibold inline-flex items-center gap-1">
        <Check className="size-3.5" />
        Pago!
      </span>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={loading || pending}
      className="border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 font-semibold"
    >
      {loading || pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Check className="size-4" />
      )}
      <span className="hidden sm:inline">Marcar como paga</span>
    </Button>
  );
}
