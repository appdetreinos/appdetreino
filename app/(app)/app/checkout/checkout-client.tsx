"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, RefreshCw } from "lucide-react";
import { formatBRL } from "@/lib/types/billing";
import { safeLog } from "@/lib/log/safe";
import { csrfFetch } from "@/lib/security/client";

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

/** Erros da API traduzidos pra gente normal. */
function friendlyApiError(code: string | undefined): string {
  switch (code) {
    case "mercadopago_not_configured":
      return "Pagamentos ainda não configurados. Fala com o suporte.";
    case "amount_mismatch":
      return "Preço desatualizado. Recarrega a página e tenta de novo.";
    case "csrf_invalid":
      return "Sessão expirada. Recarrega a página e tenta de novo.";
    case "unknown_plan":
      return "Plano inválido. Escolhe de novo.";
    case "mp_api_failed":
      return "Mercado Pago fora do ar. Tenta em alguns minutos.";
    case "unauthenticated":
      return "Sessão expirada. Entra de novo.";
    default:
      return code ?? "Erro ao gerar pagamento.";
  }
}

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
  const [subLoading, setSubLoading] = useState(false);

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

    const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || "";
    if (!publicKey) {
      setError("Pagamentos ainda não configurados. Fala com o suporte.");
      return;
    }

    if (!window.MercadoPago && !sdkLoaded) {
      setError("O sistema de pagamentos está carregando. Tente novamente em instantes.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await csrfFetch("/api/mercadopago/preference", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plan_id: planId,
            amount_cents: amountCents,
            payment_method: method,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          setError(friendlyApiError((body as { error?: string } | null)?.error));
          return;
        }

        const data = (await res.json()) as { preference_id: string };

        if (!window.MercadoPago) {
          setError("Erro técnico: SDK do Mercado Pago não detectado.");
          return;
        }

        let mp: any;
        try {
          mp = new window.MercadoPago(publicKey);
        } catch {
          setError("Chave de pagamento inválida. Fala com o suporte.");
          return;
        }
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

      <div className="mt-4 rounded-lg border border-white/10 bg-background/40 p-4 text-center">
        <p className="text-sm font-semibold flex items-center justify-center gap-1.5">
          <RefreshCw className="size-4 text-primary" />
          Prefere não pagar todo mês?
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Assinatura no cartão: cobra {formatBRL(amountCents / 100)}/mês no automático.
        </p>
        <Button
          variant="outline"
          className="mt-3 font-semibold"
          disabled={subLoading || pending}
          onClick={async () => {
            setError(null);
            setSubLoading(true);
            try {
              const res = await csrfFetch("/api/mercadopago/subscription", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ plan_id: planId }),
              });
              const data = (await res.json()) as { ok: boolean; init_point?: string; error?: string };
              if (!res.ok || !data.ok || !data.init_point) {
                setError(friendlyApiError(data.error));
              } else {
                window.location.href = data.init_point;
              }
            } catch {
              setError("Falha de conexão.");
            } finally {
              setSubLoading(false);
            }
          }}
        >
          {subLoading ? <Loader2 className="size-4 animate-spin" /> : null}
          Assinar {formatBRL(amountCents / 100)}/mês no cartão
        </Button>
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Pagamento processado com segurança via Mercado Pago Bricks.
      </p>
    </div>
  );
}
