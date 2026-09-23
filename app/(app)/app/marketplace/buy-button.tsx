"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart } from "lucide-react";
import { csrfFetch } from "@/lib/security/client";
import { formatBRL } from "@/lib/types/billing";

/** Botão comprar planilha → preferência MP → redirect. */
export function BuyButton({
  kind,
  templateId,
  priceCents,
}: {
  kind: "workout" | "diet";
  templateId: string;
  priceCents: number;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setLoading(true);
    setError(null);
    try {
      const res = await csrfFetch("/api/marketplace/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, template_id: templateId }),
      });
      const json = (await res.json()) as { ok: boolean; init_point?: string; error?: string };
      if (!res.ok || !json.ok || !json.init_point) {
        setError(json.error === "mercadopago_not_configured" ? "Pagamento indisponível no momento." : (json.error ?? "Não deu pra gerar o pagamento."));
      } else {
        window.location.href = json.init_point;
      }
    } catch {
      setError("Falha de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button onClick={buy} disabled={loading} className="font-bold w-full">
        {loading ? <Loader2 className="size-4 animate-spin" /> : <ShoppingCart className="size-4" />}
        Comprar · {formatBRL(priceCents / 100)}
      </Button>
      {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
    </div>
  );
}
