"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { csrfFetch } from "@/lib/security/client";
import { Send, Copy } from "lucide-react";

type CreatedLink = { url: string; public_code: string };

export function PaymentLinkForm() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [pending, startTransition] = useTransition();
  const [created, setCreated] = useState<CreatedLink | null>(null);

  function submit() {
    const desc = description.trim();
    const reais = Number(amount);

    if (desc.length < 2) {
      toast.error("Dê uma descrição com pelo menos 2 caracteres");
      return;
    }
    if (!Number.isFinite(reais) || reais < 1) {
      toast.error("Valor mínimo: R$ 1,00");
      return;
    }

    startTransition(async () => {
      try {
        const res = await csrfFetch("/api/me/payment-links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: desc,
            amount_cents: Math.round(reais * 100),
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          toast.error(data?.error ?? "Falha ao criar link");
          return;
        }
        const data = (await res.json()) as { url: string; public_code: string };
        setCreated({ url: data.url, public_code: data.public_code });
        toast.success("Link criado!");
        router.refresh();
      } catch {
        toast.error("Erro de rede");
      }
    });
  }

  function copyLink(url: string) {
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Link copiado!"))
      .catch(() => toast.error("Não consegui copiar"));
  }

  if (created) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
        <div className="text-sm font-semibold text-emerald-400">
          Link criado! Compartilhe com o aluno:
        </div>
        <div className="rounded-md bg-background/80 border border-white/10 px-3 py-2 font-mono text-sm break-all">
          {created.url}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => copyLink(created.url)} className="flex-1">
            <Copy className="size-4" />
            Copiar link completo
          </Button>
          <Button
            variant="outline"
            onClick={() => copyLink(created.public_code)}
            className="flex-1"
          >
            <Copy className="size-4" />
            Copiar código
          </Button>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreated(null);
            setDescription("");
            setAmount("");
          }}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Criar outro
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="desc">Descrição</Label>
        <Input
          id="desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="ex: Pack 4 sessões avulsas"
          maxLength={140}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="amount">Valor (R$)</Label>
          <Input
            id="amount"
            type="number"
            min={1}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="200"
          />
        </div>
        <div className="flex items-end">
          <Button onClick={submit} disabled={pending} className="w-full font-semibold">
            <Send className="size-4" />
            {pending ? "Criando…" : "Criar link"}
          </Button>
        </div>
      </div>
    </div>
  );
}
