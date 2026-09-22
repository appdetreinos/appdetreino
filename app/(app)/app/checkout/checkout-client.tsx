"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Lock, Loader2 } from "lucide-react";
import { formatBRL } from "@/lib/types/billing";
import { safeLog } from "@/lib/log/safe";

/**
 * Métodos de pagamento suportados no checkout (Viva FIT APP).
 * Cada um mapeia pra um `id` do Mercado Pago Checkout Pro:
 *  - pix    → PIX instantâneo
 *  - card   → cartão de crédito (parcelado conforme conta MP)
 *  - boleto → boleto bancário
 *
 * Default é `card` porque é o que mais converte em SaaS no Brasil.
 */
export type PaymentMethod = "pix" | "card" | "boleto";

const METHODS: Array<{ id: PaymentMethod; label: string }> = [
  { id: "pix", label: "Pix" },
  { id: "card", label: "Cartão" },
  { id: "boleto", label: "Boleto" },
];

type Props = {
  planId: string;
  planName: string;
  amountCents: number;
};

export function CheckoutClient({ planId, planName, amountCents }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("card");

  async function goToCheckout() {
    setError(null);
    startTransition(async () => {
      try {
        // Recupera o token CSRF do cookie para evitar erro 'csrf_invalid'
        const getCookie = (name: string) => {
          const value = "; " + document.cookie;
          const parts = value.split("; " + name + "=");
          if (parts.length === 2) return parts.pop()?.split(";").shift();
          return null;
        };
        const csrfToken = getCookie("csrf");

        const res = await fetch("/api/mercadopago/preference", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken ?? "",
          },
          body: JSON.stringify({
            plan_id: planId,
            amount_cents: amountCents,
            payment_method: method,
          }),
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
      {/* Seletor de método de pagamento — funciona como radio group de fato */}
      <div
        role="radiogroup"
        aria-label="Forma de pagamento"
        className="grid grid-cols-3 gap-2"
      >
        {METHODS.map((m) => {
          const active = m.id === method;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setMethod(m.id)}
              disabled={pending}
              className={
                "rounded-lg border px-3 py-3 text-sm font-semibold text-center transition-colors " +
                (active
                  ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/30"
                  : "border-white/10 bg-background/40 text-foreground/85 hover:border-white/20 hover:bg-background/60")
              }
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-500">
          {error === "mercadopago_not_configured"
            ? "Pagamento temporariamente indisponível. Configure MERCADOPAGO_ACCESS_TOKEN."
            : error}
        </div>
      )}

      <Button
        size="lg"
        className="mt-6 w-full font-bold h-12"
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
            Pagar {formatBRL(amountCents / 100)} no {METHODS.find((m) => m.id === method)?.label}
          </>
        )}
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Pagamento seguro via Mercado Pago. Pix, cartão e boleto.
      </p>
    </div>
  );
}
