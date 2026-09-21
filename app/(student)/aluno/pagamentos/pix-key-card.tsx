"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

const TYPE_LABEL: Record<string, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "E-mail",
  phone: "Telefone",
  random: "Aleatória",
};

export function PixKeyCard({
  pixKey,
  pixType,
  beneficiary,
}: {
  pixKey: string;
  pixType: string | null;
  beneficiary: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(pixKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = pixKey;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30 p-5">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-semibold">
            Pagar via Pix
          </div>
          {beneficiary && (
            <div className="text-sm mt-1">
              <span className="text-muted-foreground">Para:</span> {beneficiary}
            </div>
          )}
        </div>
        <Button onClick={copy} size="sm" variant="outline">
          {copied ? (
            <>
              <Check className="size-4 text-emerald-500" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="size-4" />
              Copiar
            </>
          )}
        </Button>
      </div>

      <div className="mt-3 p-3 bg-background/50 rounded-md border border-white/5">
        <div className="text-xs text-muted-foreground">
          {pixType ? TYPE_LABEL[pixType] ?? pixType : "Chave"}
        </div>
        <div className="font-mono text-sm break-all mt-0.5">{pixKey}</div>
      </div>
    </Card>
  );
}
