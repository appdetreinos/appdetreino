"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Copy, Check, QrCode, CheckCircle2 } from "lucide-react";
import { formatBRL } from "@/lib/types/billing";
import { safeLog } from "@/lib/log/safe";
import { csrfFetch } from "@/lib/security/client";

type Props = {
  planId: string;
  planName: string;
  amountCents: number;
  testMode?: boolean;
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
    case "pix_unavailable":
      return "Pix indisponível agora. Tenta cartão ou boleto.";
    case "unauthenticated":
      return "Sessão expirada. Entra de novo.";
    default:
      return code ?? "Erro ao gerar pagamento.";
  }
}

/**
 * Checkout: Pix com QR na página · Cartão/Boleto via MP hospedado.
 * Tudo sem sair da página no Pix; redirect só pros outros métodos.
 */
export function CheckoutClient({ planId, planName, amountCents, testMode }: Props) {
  const [method, setMethod] = useState<"pix" | "card" | "boleto">("pix");
  const [error, setError] = useState<string | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  return (
    <div className="mt-6">
      <div role="radiogroup" aria-label="Forma de pagamento" className="grid grid-cols-3 gap-2">
        {(
          [
            { id: "pix", label: "Pix" },
            { id: "card", label: "Cartão" },
            { id: "boleto", label: "Boleto" },
          ] as const
        ).map((m) => {
          const active = m.id === method;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                setMethod(m.id);
                setError(null);
              }}
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

      {method === "pix" ? (
        <PixPay
          planId={planId}
          amountCents={amountCents}
          testMode={testMode}
          onError={setError}
        />
      ) : (
        <Button
          size="lg"
          className="mt-6 w-full font-bold h-12"
          disabled={redirecting}
          onClick={async () => {
            setError(null);
            setRedirecting(true);
            try {
              const res = await csrfFetch("/api/mercadopago/preference", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  plan_id: planId,
                  amount_cents: amountCents,
                  payment_method: method,
                  test: testMode === true,
                }),
              });
              const data = (await res.json().catch(() => null)) as {
                ok: boolean;
                init_point?: string;
                error?: string;
              } | null;
              if (!res.ok || !data?.ok || !data.init_point) {
                setError(friendlyApiError(data?.error));
              } else {
                window.location.href = data.init_point;
              }
            } catch {
              setError("Falha de conexão.");
            } finally {
              setRedirecting(false);
            }
          }}
        >
          {redirecting ? (
            <Loader2 className="size-4 animate-spin mr-2" />
          ) : null}
          Pagar {formatBRL(amountCents / 100)} via {method === "card" ? "Cartão" : "Boleto"}
        </Button>
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
        Pagamento processado com segurança via Mercado Pago {planName}.
      </p>
    </div>
  );
}

/** QR Pix gerado na hora + confirmação automática (polling). */
function PixPay({
  planId,
  amountCents,
  testMode,
  onError,
}: {
  planId: string;
  amountCents: number;
  testMode?: boolean;
  onError: (msg: string | null) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "loading" | "qr" | "paid">("idle");
  const [qr, setQr] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const paymentId = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  async function checkStatus(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/mercadopago/pix-status?id=${encodeURIComponent(id)}`);
      const data = (await res.json().catch(() => null)) as { ok: boolean; status?: string };
      return res.ok && data.ok && data.status === "approved";
    } catch {
      return false;
    }
  }

  function startPolling(id: string) {
    setSecondsLeft(180);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(async () => {
      setSecondsLeft((s) => {
        if (s <= 1 && timer.current) clearInterval(timer.current);
        return Math.max(0, s - 5);
      });
      if (await checkStatus(id)) {
        if (timer.current) clearInterval(timer.current);
        setPhase("paid");
        setTimeout(() => {
          window.location.href = "/app/settings?upgrade=success";
        }, 1200);
      }
    }, 5000);
  }

  async function generate() {
    onError(null);
    setPhase("loading");
    try {
      const res = await csrfFetch("/api/mercadopago/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId, amount_cents: amountCents, test: testMode === true }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok: boolean;
        payment_id?: string;
        qr_code?: string;
        qr_base64?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.ok || !data.qr_code) {
        onError(friendlyApiError(data?.error));
        setPhase("idle");
        return;
      }
      paymentId.current = data.payment_id ?? null;
      setQr(data.qr_code);
      setQrImage(data.qr_base64 ?? null);
      setPhase("qr");
      if (data.payment_id) startPolling(data.payment_id);
    } catch (e) {
      safeLog.error("[pix] failed", e instanceof Error ? e.message : "unknown");
      onError("Falha de conexão.");
      setPhase("idle");
    }
  }

  async function copy() {
    if (!qr) return;
    try {
      await navigator.clipboard.writeText(qr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback selecionável abaixo
    }
  }

  if (phase === "paid") {
    return (
      <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
        <div className="grid size-14 mx-auto place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
          <CheckCircle2 className="size-7" />
        </div>
        <p className="mt-2 font-bold text-emerald-500">Pagamento confirmado!</p>
        <p className="text-xs text-muted-foreground mt-1">Levando você de volta…</p>
      </div>
    );
  }

  if (phase === "qr" && qr) {
    const mm = Math.floor(secondsLeft / 60);
    const ss = String(secondsLeft % 60).padStart(2, "0");
    return (
      <div className="mt-6 rounded-xl border border-white/10 bg-background/40 p-5 text-center">
        <p className="text-sm font-semibold flex items-center justify-center gap-2">
          <QrCode className="size-4 text-primary" />
          Escaneia pra pagar {formatBRL(amountCents / 100)}
        </p>
        {qrImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`data:image/png;base64,${qrImage}`}
            alt="QR Code Pix"
            className="size-52 mx-auto mt-3 rounded-xl bg-white p-2"
          />
        )}
        <div className="mt-3 flex gap-2">
          <Input value={qr} readOnly onFocus={(e) => e.target.select()} className="font-mono text-[11px]" />
          <Button variant="outline" onClick={copy} className="shrink-0">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Aguardando pagamento… {mm}:{ss} {secondsLeft <= 0 && "(gera outro QR se expirar)"}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-1"
          onClick={async () => {
            if (paymentId.current && (await checkStatus(paymentId.current))) {
              if (timer.current) clearInterval(timer.current);
              setPhase("paid");
              setTimeout(() => {
                window.location.href = "/app/settings?upgrade=success";
              }, 1200);
            }
          }}
        >
          Já paguei, verificar
        </Button>
      </div>
    );
  }

  return (
    <Button size="lg" className="mt-6 w-full font-bold h-12" onClick={generate} disabled={phase === "loading"}>
      {phase === "loading" ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
      Gerar QR Pix de {formatBRL(amountCents / 100)}
    </Button>
  );
}
