"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Lock, Loader2 } from "lucide-react";
import { formatBRL } from "@/lib/types/billing";
import { safeLog } from "@/lib/log/safe";

type Props = {
  planId: string;
  planName: string;
  amountCents: number;
};

export function CheckoutClient({ planId, planName, amountCents }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function goToCheckout() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/mercadopago/preference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan_id: planId, amount_cents: amountCents }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          setError(body?.error ?? "Erro ao gerar link de pagamento");
          return;
        }
        const data = (await res.json()) as { init_point: string };
        if (typeof window !== "undefined") {
          window.location.href = data.init_point;
        }
      } catch (e) {
        safeLog.error("[checkout] failed", e instanceof Error ? e.message : "unknown");
        setError("Falha de conexão");
      }
    });
  }

  return (
    <div className="mt-6">
      {error && (
        <div className="mb-3 rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-500">
          {error === "mercadopago_not_configured"
            ? "Pagamento temporariamente indisponível. Configure MERCADOPAGO_ACCESS_TOKEN."
            : error}
        </div>
      )}

      <Button
        size="lg"
        className="w-full font-bold h-12"
        onClick={goToCheckout}
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Gerando link...
          </>
        ) : (
          <>
            <Lock className="size-4" />
            Pagar {formatBRL(amountCents / 100)}
          </>
        )}
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Pagamento seguro via Mercado Pago. Pix, cartão e boleto.
      </p>
    </div>
  );
}
