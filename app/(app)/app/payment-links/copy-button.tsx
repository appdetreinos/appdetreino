"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";

export function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        toast.success("Link copiado!");
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => toast.error("Falha ao copiar"));
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="text-xs text-primary hover:text-primary/80 hover:underline inline-flex items-center gap-1 px-2 py-1 rounded border border-primary/30 bg-primary/10"
      aria-label="Copiar link"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}
