"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Lock, Loader2 } from "lucide-react";
import { formatBRL } from "@/lib/types/billing";
import { safeLog } from "@/lib/log/safe";

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

declare global {
  interface Window {
    MercadoPago: any;
  }
}

export function CheckoutClient({ planId, planName, amountCents }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [brickRendered, setBrickRendered] = useState(false);

  useEffect(() => {
    if (window.MercadoPago) {
      setSdkLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.onload = () => {
      console.log("MP SDK Loaded");
      setSdkLoaded(true);
    };
    script.onerror = () => setError("Erro ao carregar o sistema de pagamentos.");
    document.head.appendChild(script);
  }, []);

  async function renderPaymentBrick() {
    setError(null);
    
    if (!window.MercadoPago && !sdkLoaded) {
      setError("O sistema de pagamentos está carregando. Tente novamente em instantes.");
      return;
    }

    startTransition(async () => {
      try {
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
          setError(body?.error ?? "Erro ao gerar preferência de pagamento");
          return;
        }

        const data = (await res.json()) as { preference_id: string };
        
        if (!window.MercadoPago) {
          setError("Erro técnico: SDK do Mercado Pago não detectado.");
          return;
        }

        const mp = new window.MercadoPago(process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || "");
        const bricksBuilder = mp.bricks();
        
        await bricksBuilder.create("payment", "payment-brick", {
          initialization: {
            preferenceId: data.preference_id,
            paymentMethods: {
              essentials: true,
              paymentMethods: [method === "pix" ? "pix" : method === "boleto" ? "ticket" : "credit_card"],
            },
          },
          customization: {
            visual: {
              style: { theme: "default" },
            },
          },
          callbacks: {
            onPaymentIsReady: () => {
              setBrickRendered(true);
            },
            onSubmit: (payment_id: string) => {
              window.location.href = "/app/settings?upgrade=pending";
            },
          },
        });
        setBrickRendered(true);

      } catch (e) {
        safeLog.error("[checkout-bricks] failed", e instanceof Error ? e.message : "unknown");
        setError("Falha ao carregar o formulário de pagamento seguro.");
      }
    });
  }

  return (
    <div className="mt-6">
      <div role="radiogroup" aria-label="Forma de pagamento" className="grid grid-cols-3 gap-2">
        {METHODS.map((m) => {
          const active = m.id === method;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                setMethod(m.id);
                setBrickRendered(false);
              }}
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
          {error}
        </div>
      )}

      {!brickRendered && (
        <Button
          size="lg"
          className="mt-6 w-full font-bold h-12"
          onClick={renderPaymentBrick}
          disabled={pending}
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" />
              Carregando...
            </>
          ) : (
            <>
              <Lock className="size-4 mr-2" />
              Pagar {formatBRL(amountCents / 100)} via {METHODS.find((m) => m.id === method)?.label}
            </>
          )}
        </Button>
      )}

      <div id="payment-brick" className="mt-6" />

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Pagamento processado com segurança via Mercado Pago Bricks.
      </p>
    </div>
  );
}
