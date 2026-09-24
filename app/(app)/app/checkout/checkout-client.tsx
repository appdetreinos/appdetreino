"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, RefreshCw, ExternalLink } from "lucide-react";
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
 * Pagamento EMBUTIDO (Bricks) — não sai da página.
 * Se o Bricks falhar (adblock, SDK, chave), mostra fallback
 * que abre o checkout hospedado.
 */
export function CheckoutClient({ planId, planName, amountCents }: Props) {
  const [phase, setPhase] = useState<"loading" | "brick" | "fallback" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [initPoint, setInitPoint] = useState<string | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const brickDone = useRef(false);

  // 1) Cria a preferência no servidor
  useEffect(() => {
    let cancelled = false;
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
        if (cancelled) return;
        if (!res.ok || !data?.ok || !data.preference_id) {
          setError(friendlyApiError(data?.error));
          setPhase("error");
          return;
        }
        setInitPoint(data.init_point ?? null);
        setPreferenceId(data.preference_id);
      } catch (e) {
        if (cancelled) return;
        safeLog.error("[checkout] preference failed", e instanceof Error ? e.message : "unknown");
        setError("Falha de conexão. Tenta de novo.");
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [planId, amountCents]);

  // 2) Carrega o SDK e renderiza o Brick quando tudo pronto
  useEffect(() => {
    if (!preferenceId || brickDone.current) return;
    brickDone.current = true;

    const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || "";
    if (!publicKey) {
      setError("Pagamentos ainda não configurados. Fala com o suporte.");
      setPhase("error");
      return;
    }

    const render = async () => {
      try {
        if (!window.MercadoPago) throw new Error("sdk_missing");
        const mp = new window.MercadoPago(publicKey);
        const bricks = mp.bricks();
        await bricks.create("payment", "payment-brick", {
          initialization: { preferenceId },
          customization: { visual: { style: { theme: "default" } } },
          callbacks: {
            onReady: () => setPhase("brick"),
            onError: (err: unknown) => {
              safeLog.error("[checkout] brick error", err instanceof Error ? err.message : "unknown");
              setPhase(initPoint ? "fallback" : "error");
              if (!initPoint) setError("Não deu pra carregar o pagamento embutido.");
            },
            onSubmit: () => {
              window.location.href = "/app/settings?upgrade=pending";
            },
          },
        });
      } catch (e) {
        safeLog.error("[checkout] brick failed", e instanceof Error ? e.message : "unknown");
        setPhase(initPoint ? "fallback" : "error");
        if (!initPoint) setError("Não deu pra carregar o pagamento embutido.");
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
      // SDK bloqueado (adblock/offline) → fallback hospedado
      setPhase(initPoint ? "fallback" : "error");
      if (!initPoint) setError("Não deu pra carregar o pagamento. Desativa o adblock e recarrega.");
    };
    document.head.appendChild(script);
  }, [preferenceId, initPoint]);

  return (
    <div className="mt-6">
      {phase === "loading" && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Carregando pagamento seguro…
        </div>
      )}

      {phase === "error" && error && (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-500">
          {error}
        </div>
      )}

      {/* Container do Brick: SEMPRE visível (escondido quebra a montagem).
          O loader sai quando onReady dispara. */}
      {(phase === "loading" || phase === "brick") && (
        <div className="mt-2">
          {phase === "loading" && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Carregando pagamento seguro…
            </div>
          )}
          <div id="payment-brick" />
        </div>
      )}

      {phase === "fallback" && initPoint && (
        <div className="rounded-lg border border-white/10 bg-background/40 p-5 text-center">
          <p className="text-sm font-semibold">Pagamento no Mercado Pago</p>
          <p className="text-xs text-muted-foreground mt-1">
            O embutido não carregou aqui — conclui no checkout seguro.
          </p>
          <Button
            size="lg"
            className="mt-4 w-full font-bold"
            onClick={() => (window.location.href = initPoint)}
          >
            <Lock className="size-4 mr-2" />
            Pagar {formatBRL(amountCents / 100)} · {planName}
            <ExternalLink className="size-4 ml-2" />
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
                setPhase("error");
              } else {
                window.location.href = data.init_point;
              }
            } catch {
              setError("Falha de conexão.");
              setPhase("error");
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
        Pagamento processado com segurança via Mercado Pago.
      </p>
    </div>
  );
}
