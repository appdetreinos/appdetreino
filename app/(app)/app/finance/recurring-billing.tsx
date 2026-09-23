"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, RefreshCw, Repeat } from "lucide-react";
import { csrfFetch } from "@/lib/security/client";
import { formatBRL } from "@/lib/types/billing";

export type BillingTemplate = {
  id: string;
  name: string;
  amount: number | null;
  cycle: string | null;
  billing_type: string | null;
};

/**
 * Cobrança recorrente (padrão Prime: todo dia 5, automático).
 * Trainer cria o modelo uma vez e gera as mensalidades dos
 * alunos ativos com 1 clique. Idempotente no mês.
 */
export function RecurringBilling({ initial }: { initial: BillingTemplate[] }) {
  const router = useRouter();
  const [templates, setTemplates] = useState<BillingTemplate[]>(initial);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const v = Number(String(amount).replace(",", "."));
    if (name.trim().length < 2 || !Number.isFinite(v) || v <= 0) {
      setMsg({ ok: false, text: "Nome e valor válido são obrigatórios." });
      return;
    }
    setSaving(true);
    try {
      const res = await csrfFetch("/api/trainer/payment-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), amount: Math.round(v * 100) / 100 }),
      });
      const json = (await res.json()) as { ok: boolean; template?: BillingTemplate; error?: string };
      if (!res.ok || !json.ok || !json.template) {
        setMsg({ ok: false, text: json.error ?? "Não deu pra salvar." });
      } else {
        setTemplates((t) => [...t, json.template as BillingTemplate]);
        setName("");
        setAmount("");
        setMsg({ ok: true, text: "Modelo criado." });
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, text: "Falha de conexão." });
    } finally {
      setSaving(false);
    }
  }

  async function generate(id: string) {
    setMsg(null);
    setGenerating(id);
    try {
      const res = await csrfFetch("/api/trainer/generate-monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: id }),
      });
      const json = (await res.json()) as { ok: boolean; created?: number; skipped?: number; error?: string };
      if (!res.ok || !json.ok) {
        setMsg({ ok: false, text: json.error ?? "Não deu pra gerar." });
      } else if ((json.created ?? 0) === 0) {
        setMsg({ ok: true, text: "Todo mundo já foi cobrado neste ciclo. Nada a gerar." });
      } else {
        setMsg({ ok: true, text: `${json.created} cobrança(s) gerada(s).` });
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, text: "Falha de conexão." });
    } finally {
      setGenerating(null);
    }
  }

  return (
    <Card className="bg-card/80 border-white/10 p-6">
      <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
        <Repeat className="size-5 text-primary" />
        Cobrança recorrente
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        Cria o plano uma vez. Todo mês, 1 clique gera a cobrança de todos os alunos ativos com vencimento dia 05.
      </p>

      {templates.length > 0 && (
        <ul className="space-y-2 mb-4">
          {templates.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-lg border border-white/5 bg-background/40 px-3 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{t.name}</div>
                <div className="text-xs text-muted-foreground">
                  {t.amount != null ? formatBRL(Number(t.amount)) : "—"}/mês
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">mensal</Badge>
              <Button size="sm" variant="outline" onClick={() => generate(t.id)} disabled={generating !== null}>
                {generating === t.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                Gerar mês
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={create} className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <Label htmlFor="tpl-name" className="sr-only">Nome do plano</Label>
          <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Mensalidade consultoria" maxLength={80} />
        </div>
        <div className="w-full sm:w-32">
          <Label htmlFor="tpl-amount" className="sr-only">Valor</Label>
          <Input id="tpl-amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="R$ 149,90" inputMode="decimal" />
        </div>
        <Button type="submit" disabled={saving} className="font-semibold">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Criar plano
        </Button>
      </form>

      {msg && (
        <p className={`mt-3 text-sm ${msg.ok ? "text-emerald-500" : "text-destructive"}`}>{msg.text}</p>
      )}
    </Card>
  );
}
