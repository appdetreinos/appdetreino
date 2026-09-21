"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { csrfFetch } from "@/lib/security/client";

const PRESETS = [
  { label: "Online 30min", name: "Consulta online", minutes: 30, color: "#FF6B35", type: "online" as const },
  { label: "Online 60min", name: "Consulta online 1h", minutes: 60, color: "#FF6B35", type: "online" as const },
  { label: "Avaliação inicial", name: "Avaliação inicial", minutes: 60, color: "#10B981", type: "avaliacao" as const },
  { label: "Reavaliação", name: "Reavaliação", minutes: 45, color: "#10B981", type: "avaliacao" as const },
  { label: "Presencial 60min", name: "Sessão presencial", minutes: 60, color: "#3B82F6", type: "presencial" as const },
];

type ModalityType = "presencial" | "online" | "avaliacao";

export function NewTypeClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState(60);
  const [price, setPrice] = useState("0");
  const [color, setColor] = useState("#FF6B35");
  const [type, setType] = useState<ModalityType>("presencial");
  const [pending, startTransition] = useTransition();

  function applyPreset(p: typeof PRESETS[number]) {
    setName(p.name);
    setMinutes(p.minutes);
    setColor(p.color);
    setType(p.type);
    setPrice("0");
  }

  function save() {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      toast.error("Dê um nome com pelo menos 2 caracteres");
      return;
    }

    const priceReais = Number(price);
    const priceCents =
      Number.isFinite(priceReais) && priceReais >= 0
        ? Math.round(priceReais * 100)
        : null;

    startTransition(async () => {
      try {
        const res = await csrfFetch("/api/me/appointment-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            duration_minutes: minutes,
            price_cents: priceCents,
            color,
            type,
            active: true,
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          toast.error(data?.error ?? "Falha ao criar tipo");
          return;
        }
        toast.success("Tipo criado!");
        router.push("/app/agenda/types");
        router.refresh();
      } catch {
        toast.error("Erro de rede");
      }
    });
  }

  return (
    <div className="p-5 md:p-6 max-w-2xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <Link
          href="/app/agenda/types"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
          Tipos
        </Link>
        <h1 className="text-xl font-extrabold">Novo tipo de agendamento</h1>
        <span className="w-12" />
      </header>

      <Card className="bg-card border-white/5 p-6 space-y-5">
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Predefinições
          </Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="rounded-lg border border-white/10 bg-background/60 px-3 py-1.5 text-xs hover:border-primary/40 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Consulta online"
            autoFocus
            maxLength={80}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minutes">Duração (min)</Label>
            <Input
              id="minutes"
              type="number"
              min={5}
              max={480}
              step={5}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value) || 60)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Preço (R$)</Label>
            <Input
              id="price"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0 = grátis"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Modalidade</Label>
          <div className="flex flex-wrap gap-2">
            {(["presencial", "online", "avaliacao"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  type === t
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-white/10 hover:border-primary/40"
                }`}
              >
                {t === "presencial"
                  ? "Presencial"
                  : t === "online"
                    ? "Online"
                    : "Avaliação"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="color">Cor</Label>
          <div className="flex items-center gap-3">
            <input
              id="color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="size-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
            />
            <span className="text-sm text-muted-foreground font-mono">{color}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => router.back()} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={pending} className="font-semibold">
            <Save className="size-4" />
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
