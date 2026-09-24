"use client";

import { useEffect, useRef, useState } from "react";
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

/**
 * Bricks embutido: Pix / Cartão / Boleto sem sair da página.
 * A preferência filtra o método; o Brick renderiza só ele.
 */
export function CheckoutClient({ planId, planName, amountCents }: Props) {
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [phase, setPhase] = useState<"idle" | "loading" | "brick" | "fallback" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [brickDetail, setBrickDetail] = useState<string | null>(null);
  const [initPoint, setInitPoint] = useState<string | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const brickKey = useRef(0);

  // SDK uma vez
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkFailed, setSdkFailed] = useState(false);
  useEffect(() => {
    if (window.MercadoPago) {
      setSdkReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.onload = () => setSdkReady(true);
    script.onerror = () => setSdkFailed(true);
    document.head.appendChild(script);
  }, []);

  async function start() {
    setError(null);
    setBrickDetail(null);
    setInitPoint(null);

    const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || "";
    if (!publicKey) {
      setError("Pagamentos ainda não configurados. Fala com o suporte.");
      setPhase("error");
      return;
    }
    if (!window.MercadoPago) {
      setError(
        sdkFailed
          ? "SDK bloqueado (adblock/offline). Desativa e recarrega."
          : "Carregando sistema de pagamento… tenta de novo em instantes.",
      );
      setPhase("error");
      return;
    }

    setPhase("loading");
    try {
      const res = await csrfFetch("/api/mercadopago/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId, amount_cents: amountCents, payment_method: method }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok: boolean;
        init_point?: string;
        preference_id?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.ok || !data.preference_id) {
        setError(friendlyApiError(data?.error));
        setPhase("error");
        return;
      }
      setInitPoint(data.init_point ?? null);

      const myKey = ++brickKey.current;
      let mp: any;
      try {
        mp = new window.MercadoPago(publicKey);
      } catch {
        setError("Chave de pagamento inválida. Fala com o suporte.");
        setPhase("error");
        return;
      }
      try {
        const bricks = mp.bricks();
        await bricks.create("payment", "payment-brick", {
          initialization: {
            amount: amountCents / 100,
            preferenceId: data.preference_id,
            paymentMethods: {
              essentials: true,
              paymentMethods: [
                method === "pix" ? "pix" : method === "boleto" ? "ticket" : "credit_card",
              ],
            },
          },
          customization: { visual: { style: { theme: "default" } } },
          callbacks: {
            onReady: () => {
              if (brickKey.current === myKey) setPhase("brick");
            },
            onError: (err: unknown) => {
              const msg =
                err instanceof Error ? err.message : JSON.stringify(err)?.slice(0, 200) ?? "unknown";
              safeLog.error("[checkout] brick error", msg);
              if (brickKey.current !== myKey) return;
              setBrickDetail(msg);
              setPhase(data.init_point ? "fallback" : "error");
              if (!data.init_point) setError("Não deu pra carregar o pagamento embutido.");
            },
            onSubmit: () => {
              window.location.href = "/app/settings?upgrade=pending";
            },
          },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "unknown";
        safeLog.error("[checkout] brick failed", msg);
        if (brickKey.current !== myKey) return;
        setBrickDetail(msg);
        setPhase(data.init_point ? "fallback" : "error");
        if (!data.init_point) setError("Não deu pra carregar o pagamento embutido.");
      }
    } catch (e) {
      safeLog.error("[checkout] failed", e instanceof Error ? e.message : "unknown");
      setError("Falha de conexão. Tenta de novo.");
      setPhase("error");
    }
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
                setPhase("idle");
                setError(null);
              }}
              disabled={phase === "loading"}
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

      {(phase === "idle" || phase === "loading") && (
        <Button size="lg" className="mt-6 w-full font-bold h-12" onClick={start} disabled={phase === "loading"}>
          {phase === "loading" ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" />
              Carregando {METHODS.find((m) => m.id === method)?.label}…
            </>
          ) : (
            <>
              <Lock className="size-4 mr-2" />
              Pagar {formatBRL(amountCents / 100)} via {METHODS.find((m) => m.id === method)?.label}
            </>
          )}
        </Button>
      )}

      {/* Brick: container sempre visível enquanto ativo */}
      {(phase === "loading" || phase === "brick") && <div id="payment-brick" className="mt-6" />}

      {phase === "fallback" && initPoint && (
        <div className="mt-6 rounded-lg border border-white/10 bg-background/40 p-5 text-center">
          <p className="text-sm font-semibold">Pagamento no Mercado Pago</p>
          <p className="text-xs text-muted-foreground mt-1">
            O embutido não carregou aqui — conclui no checkout seguro.
          </p>
          {brickDetail && (
            <p className="mt-2 rounded bg-background/60 p-2 text-[11px] font-mono text-muted-foreground break-all">
              Detalhe: {brickDetail}
            </p>
          )}
          <Button size="lg" className="mt-4 w-full font-bold" onClick={() => (window.location.href = initPoint)}>
            <Lock className="size-4 mr-2" />
            Pagar {formatBRL(amountCents / 100)} · {planName}
          </Button>
        </div>
      )}

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
          disabled={subLoading}
          onClick={async () => {
            setError(null);
            setSubLoading(true);
            try {
              const res = await csrfFetch("/api/mercadopago/subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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
