"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingBasket, Check } from "lucide-react";
import { csrfFetch } from "@/lib/security/client";

/** Gera a lista de compras da semana a partir desta dieta. */
export function ShoppingGenerateButton({ dietId }: { dietId: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setDone(false);
    try {
      const res = await csrfFetch("/api/trainer/shopping-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diet_id: dietId }),
      });
      const json = (await res.json()) as { ok: boolean; items?: number; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Não deu pra gerar.");
      } else {
        setDone(true);
      }
    } catch {
      setError("Falha de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button size="sm" variant="outline" onClick={generate} disabled={loading} className="font-semibold">
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : done ? (
          <Check className="size-4 text-emerald-500" />
        ) : (
          <ShoppingBasket className="size-4" />
        )}
        {done ? "Lista gerada" : "Gerar lista de compras"}
      </Button>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      {done && (
        <p className="text-xs text-emerald-500 mt-1">Pronta na aba Compras do aluno.</p>
      )}
    </div>
  );
}
