"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2 } from "lucide-react";
import { csrfFetch } from "@/lib/security/client";

/**
 * Prescrição facilitada com IA (plano Pro).
 * Trainer informa objetivo/nível/dias e recebe a divisão pronta.
 */
export function AiSuggest() {
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [days, setDays] = useState(4);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ai: boolean; suggestion: string; note?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function suggest() {
    setError(null);
    setResult(null);
    if (goal.trim().length < 2) {
      setError("Informa o objetivo (ex: hipertrofia).");
      return;
    }
    setLoading(true);
    try {
      const res = await csrfFetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goal.trim(), level, days }),
      });
      const json = (await res.json()) as { ok: boolean; ai?: boolean; suggestion?: string; note?: string; error?: string };
      if (!res.ok || !json.ok || !json.suggestion) {
        setError(json.error ?? "Não deu pra gerar.");
      } else {
        setResult({ ai: json.ai ?? false, suggestion: json.suggestion, note: json.note });
      }
    } catch {
      setError("Falha de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-card to-card border-primary/20 p-6">
      <div className="flex items-start gap-4">
        <div className="grid size-12 place-items-center rounded-xl bg-primary/15 text-primary shrink-0">
          <Sparkles className="size-6" />
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-lg flex items-center gap-2">
            Montar com IA
            <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">Pro</Badge>
          </h2>
          <p className="text-sm text-foreground/65 mt-0.5">
            Descreve o aluno e recebe a divisão pronta usando tua biblioteca de exercícios.
          </p>
        </div>
      </div>

      <div className="mt-4 grid sm:grid-cols-[1fr_auto_auto_auto] gap-2">
        <div>
          <Label htmlFor="ai-goal" className="sr-only">Objetivo</Label>
          <Input id="ai-goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Ex: hipertrofia de superiores" />
        </div>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value as typeof level)}
          className="rounded-md border border-white/10 bg-background px-3 py-2 text-sm"
          aria-label="Nível"
        >
          <option value="beginner">Iniciante</option>
          <option value="intermediate">Intermediário</option>
          <option value="advanced">Avançado</option>
        </select>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-md border border-white/10 bg-background px-3 py-2 text-sm"
          aria-label="Dias por semana"
        >
          {[2, 3, 4, 5, 6].map((d) => (
            <option key={d} value={d}>{d}x/sem</option>
          ))}
        </select>
        <Button onClick={suggest} disabled={loading} className="font-semibold">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Gerar
        </Button>
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {result && (
        <div className="mt-4 rounded-xl border border-white/10 bg-background/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-[10px]">
              {result.ai ? "gerado por IA" : "divisão clássica"}
            </Badge>
            {result.note && <span className="text-[11px] text-muted-foreground">{result.note}</span>}
          </div>
          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{result.suggestion}</pre>
          <p className="mt-3 text-xs text-muted-foreground">
            Revisa antes de aplicar — cria o treino em <strong>Montar do zero</strong> com essa base.
          </p>
        </div>
      )}
    </Card>
  );
}
