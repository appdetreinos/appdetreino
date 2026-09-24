"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { formatBRL } from "@/lib/types/billing";
import { safeLog } from "@/lib/log/safe";
import { csrfFetch } from "@/lib/security/client";

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
 * Bricks embutido (inicialização mínima válida: amount + preferenceId).
 * O próprio Brick mostra as abas Pix / Cartão / Boleto.
 */
export function CheckoutClient({ planId, planName, amountCents }: Props) {
  const [phase, setPhase] = useState<"loading" | "brick" | "fallback" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [brickDetail, setBrickDetail] = useState<string | null>(null);
  const [initPoint, setInitPoint] = useState<string | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || "";
    if (!publicKey) {
      setError("Pagamentos ainda não configurados. Fala com o suporte.");
      setPhase("error");
      return;
    }

    (async () => {
      try {
        const res = await csrfFetch("/api/mercadopago/preference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan_id: planId, amount_cents: amountCents }),
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

        const render = async () => {
          try {
            if (!window.MercadoPago) throw new Error("sdk_missing");
            const mp = new window.MercadoPago(publicKey);
            const bricks = mp.bricks();
            await bricks.create("payment", "payment-brick", {
              initialization: {
                amount: amountCents / 100,
                preferenceId: data.preference_id,
              },
              customization: { visual: { style: { theme: "default" } } },
              callbacks: {
                onReady: () => setPhase("brick"),
                onError: (err: unknown) => {
                  const msg =
                    err instanceof Error ? err.message : JSON.stringify(err)?.slice(0, 200) ?? "unknown";
                  safeLog.error("[checkout] brick error", msg);
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
            setBrickDetail(msg);
            setPhase(data.init_point ? "fallback" : "error");
            if (!data.init_point) setError("Não deu pra carregar o pagamento embutido.");
          }
        };

        if (window.MercadoPago) {
          render();
          return;
        }
        const script = document.createElement("script");
        script.src = "https://sdk.mercadopago.com/js/v2";
        script.async = true;
        script.onload = () => render();
        script.onerror = () => {
          setBrickDetail("SDK bloqueado ou offline (script não carregou).");
          setPhase(data.init_point ? "fallback" : "error");
          if (!data.init_point) setError("Não deu pra carregar o pagamento. Desativa o adblock e recarrega.");
        };
        document.head.appendChild(script);
      } catch (e) {
        safeLog.error("[checkout] failed", e instanceof Error ? e.message : "unknown");
        setError("Falha de conexão. Tenta de novo.");
        setPhase("error");
      }
    })();
  }, [planId, amountCents]);

  return (
    <div className="mt-6">
      {phase === "loading" && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Carregando pagamento seguro…
        </div>
      )}

      {phase === "error" && error && (
        <div className="mt-4 rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-500">
          {error}
        </div>
      )}

      {/* Brick com Pix / Cartão / Boleto embutidos */}
      {(phase === "loading" || phase === "brick") && <div id="payment-brick" className="mt-2" />}

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
