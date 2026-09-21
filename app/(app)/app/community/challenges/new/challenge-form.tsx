"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { safeLog } from "@/lib/log/safe";

export function ChallengeForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    const title = (formData.get("title") as string)?.trim();
    const description = (formData.get("description") as string | null)?.trim() || null;
    const starts_at = formData.get("starts_at") as string;
    const ends_at = formData.get("ends_at") as string;
    const reward_xp = Number(formData.get("reward_xp") ?? 0);

    if (!title || title.length < 2) {
      setError("Título obrigatório");
      return;
    }
    if (!starts_at || !ends_at || new Date(starts_at) >= new Date(ends_at)) {
      setError("Período inválido");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/me/challenges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description, starts_at, ends_at, reward_xp }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          setError(body?.error ?? "Erro ao criar");
          return;
        }
        if (typeof window !== "undefined") window.location.href = "/app/community";
      } catch (e) {
        safeLog.error("[challenge-form] submit failed", e instanceof Error ? e.message : "unknown");
        setError("Falha de conexão");
      }
    });
  }

  const today = new Date().toISOString().split("T")[0];
  const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          name="title"
          required
          maxLength={120}
          placeholder="Ex: Desafio 30 dias de água"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          name="description"
          maxLength={500}
          placeholder="O que o aluno precisa fazer?"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="starts_at">Início</Label>
          <Input
            id="starts_at"
            name="starts_at"
            type="date"
            defaultValue={today}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ends_at">Fim</Label>
          <Input
            id="ends_at"
            name="ends_at"
            type="date"
            defaultValue={twoWeeks}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reward_xp">Recompensa XP</Label>
        <Input
          id="reward_xp"
          name="reward_xp"
          type="number"
          min={0}
          max={10000}
          defaultValue={100}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Criando..." : "Criar desafio"}
      </Button>
    </form>
  );
}
