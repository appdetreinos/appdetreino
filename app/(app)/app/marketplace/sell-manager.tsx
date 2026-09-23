"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/types/billing";

export type OwnTemplate = {
  id: string;
  title: string;
  kind: "workout" | "diet";
  is_for_sale: boolean;
  price_cents: number | null;
};

/**
 * Meus anúncios: liga/desliga vitrine + preço dos próprios templates.
 */
export function SellManager({ initial }: { initial: OwnTemplate[] }) {
  const router = useRouter();
  const [items, setItems] = useState<OwnTemplate[]>(initial);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(t: OwnTemplate, on: boolean) {
    const priceStr = (prices[t.id] ?? (t.price_cents != null ? String(t.price_cents / 100) : "")).replace(",", ".");
    const price = Number(priceStr);
    if (on && (!Number.isFinite(price) || price < 1)) {
      alert("Define o preço (mínimo R$ 1) antes de anunciar.");
      return;
    }
    setBusy(t.id);
    const supabase = createClient();
    const table = t.kind === "workout" ? "workout_templates" : "diet_templates";
    const { error } = await supabase
      .from(table)
      .update({
        is_for_sale: on,
        price_cents: on ? Math.round(price * 100) : t.price_cents,
      })
      .eq("id", t.id);
    if (!error) {
      setItems((cur) =>
        cur.map((x) =>
          x.id === t.id ? { ...x, is_for_sale: on, price_cents: on ? Math.round(price * 100) : x.price_cents } : x,
        ),
      );
      router.refresh();
    }
    setBusy(null);
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Você ainda não tem template próprio. Os globais são da biblioteca — cria o teu em Treinos ou Dietas.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((t) => (
        <li key={t.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-background/40 px-3 py-2.5">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{t.title}</div>
            <div className="text-xs text-muted-foreground">
              {t.kind === "workout" ? "Treino" : "Dieta"}
              {t.is_for_sale && t.price_cents != null ? ` · ${formatBRL(t.price_cents / 100)}` : ""}
            </div>
          </div>
          {t.is_for_sale ? (
            <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px]">à venda</Badge>
          ) : (
            <Input
              value={prices[t.id] ?? (t.price_cents != null ? String(t.price_cents / 100) : "")}
              onChange={(e) => setPrices((p) => ({ ...p, [t.id]: e.target.value }))}
              placeholder="R$"
              inputMode="decimal"
              className="h-8 w-20 text-xs"
            />
          )}
          <Switch
            checked={t.is_for_sale}
            onCheckedChange={(v) => toggle(t, v)}
            disabled={busy === t.id}
            aria-label={`Anunciar ${t.title}`}
          />
          {busy === t.id && <Loader2 className="size-4 animate-spin" />}
        </li>
      ))}
    </ul>
  );
}
