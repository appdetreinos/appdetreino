"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QrCode, Loader2, Copy, Check } from "lucide-react";
import QRCode from "qrcode";
import { buildPixPayload } from "@/lib/pix";

/**
 * QR Pix da cobrança: monta o BR Code na hora (chave do trainer
 * + valor) e mostra QR + copia-e-cola. 100% offline.
 */
export function ChargeQr({
  paymentId,
  amount,
  pixKey,
  beneficiary,
}: {
  paymentId: string;
  amount: number;
  pixKey: string;
  beneficiary: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [payload, setPayload] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    try {
      const code = buildPixPayload({
        key: pixKey,
        name: beneficiary ?? "Personal",
        amount,
        txid: paymentId,
      });
      const url = await QRCode.toDataURL(code, { width: 280, margin: 1 });
      setPayload(code);
      setQrUrl(url);
      setOpen(true);
    } catch {
      // sem QR, mantém fechado
    }
  }

  async function copy() {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="mt-2">
      <Button size="sm" variant="outline" onClick={toggle} className="font-semibold">
        <QrCode className="size-4" />
        {open ? "Fechar QR" : "Ver QR"}
      </Button>
      {open && qrUrl && (
        <div className="mt-3 rounded-xl border border-white/10 bg-background/60 p-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="QR Code Pix da cobrança" className="size-48 mx-auto rounded-lg bg-white p-2" />
          <p className="mt-2 text-xs text-muted-foreground break-all font-mono px-2">
            {payload?.slice(0, 60)}…
          </p>
          <Button size="sm" variant="ghost" onClick={copy} className="mt-1">
            {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
            {copied ? "Copiado" : "Copiar código"}
          </Button>
          {open && payload === null && <Loader2 className="size-4 animate-spin mx-auto mt-2" />}
        </div>
      )}
    </div>
  );
}
