"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, QrCode, LogOut } from "lucide-react";
import { csrfFetch } from "@/lib/security/client";

/**
 * Botões conectar/desconectar + QR Code real da Evolution.
 */
export function WhatsappConnector({
  initialQr,
  initialState,
}: {
  initialQr: string | null;
  initialState: string | null;
}) {
  const router = useRouter();
  const [qr, setQr] = useState<string | null>(initialQr);
  const [state, setState] = useState<string | null>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setLoading(true);
    setError(null);
    try {
      const res = await csrfFetch("/api/evolution/connect", { method: "POST" });
      const json = (await res.json()) as { ok: boolean; qr?: string | null; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Não deu pra gerar o QR.");
      } else {
        setQr(json.qr ?? null);
        setState("connecting");
        router.refresh();
      }
    } catch {
      setError("Falha de conexão.");
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setLoading(true);
    try {
      const res = await csrfFetch("/api/evolution/status");
      const json = (await res.json()) as { ok: boolean; state?: string };
      if (json.ok && json.state) {
        setState(json.state);
        if (json.state === "open") setQr(null);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function disconnect() {
    setLoading(true);
    try {
      await csrfFetch("/api/evolution/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      });
      setQr(null);
      setState("disconnected");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const connected = state === "open";

  return (
    <div className="space-y-4">
      <div className="grid place-items-center rounded-2xl border-2 border-dashed border-white/10 bg-background/40 p-8">
        {connected ? (
          <div className="text-center">
            <div className="text-4xl">✅</div>
            <p className="mt-2 text-sm font-semibold text-emerald-500">Chip conectado</p>
            <p className="text-xs text-muted-foreground">Cobranças e recados saem no automático.</p>
          </div>
        ) : qr ? (
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`}
              alt="QR Code do WhatsApp"
              className="size-56 mx-auto rounded-xl bg-white p-2"
            />
            <p className="mt-3 text-sm text-muted-foreground">
              Escaneia com o WhatsApp do celular. Depois clica em "Já escaneei".
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="grid size-24 mx-auto place-items-center rounded-2xl bg-white/5">
              <QrCode className="size-10 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              QR Code aparece aqui após clicar em "Gerar conexão"
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      <div className="flex justify-center gap-2">
        {!connected ? (
          <>
            <Button size="lg" onClick={connect} disabled={loading} className="font-semibold">
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Gerar QR Code
            </Button>
            {qr && (
              <Button size="lg" variant="outline" onClick={refresh} disabled={loading}>
                Já escaneei
              </Button>
            )}
          </>
        ) : (
          <Button variant="outline" onClick={disconnect} disabled={loading}>
            <LogOut className="size-4" />
            Desconectar
          </Button>
        )}
      </div>
    </div>
  );
}
