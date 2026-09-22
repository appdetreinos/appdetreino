"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { safeLog } from "@/lib/log/safe";
import { csrfFetch } from "@/lib/security/client";

type Question = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "multiselect" | "number";
  options?: string[];
  required?: boolean;
};

type Props = {
  template: { id: string; title: string; questions: Question[] };
  existingAnswers: Record<string, unknown>;
};

export function AnamnesisForm({ template, existingAnswers }: Props) {
  const [answers, setAnswers] = useState<Record<string, unknown>>(existingAnswers);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const questions = (template.questions ?? []) as Question[];

  function set(key: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function toggleMulti(key: string, option: string) {
    setAnswers((prev) => {
      const current = (prev[key] as string[]) ?? [];
      const next = current.includes(option)
        ? current.filter((x) => x !== option)
        : [...current, option];
      return { ...prev, [key]: next };
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validação required
    for (const q of questions) {
      if (!q.required) continue;
      const v = answers[q.key];
      if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) {
        setError(`"${q.label}" é obrigatório`);
        return;
      }
    }

    startTransition(async () => {
      try {
        const res = await csrfFetch("/api/me/anamnesis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          setError(body?.error ?? "Erro ao salvar");
          return;
        }
        setSuccess(true);
      } catch (e) {
        safeLog.error("[anamnesis] submit failed", e instanceof Error ? e.message : "unknown");
        setError("Falha de conexão");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {questions.map((q, idx) => (
        <Card key={q.key} className="bg-card border-white/5 p-5">
          <Label className="flex items-baseline gap-2 mb-3">
            <span className="font-semibold">
              {idx + 1}. {q.label}
            </span>
            {q.required && (
              <span className="text-xs text-rose-500">obrigatório</span>
            )}
          </Label>

          {q.type === "text" && (
            <Input
              value={(answers[q.key] as string) ?? ""}
              onChange={(e) => set(q.key, e.target.value)}
              maxLength={500}
            />
          )}

          {q.type === "textarea" && (
            <Textarea
              value={(answers[q.key] as string) ?? ""}
              onChange={(e) => set(q.key, e.target.value)}
              maxLength={2000}
              rows={4}
            />
          )}

          {q.type === "number" && (
            <Input
              type="number"
              value={(answers[q.key] as number | string) ?? ""}
              onChange={(e) => set(q.key, e.target.value === "" ? null : Number(e.target.value))}
            />
          )}

          {q.type === "select" && (
            <div className="grid sm:grid-cols-2 gap-2">
              {(q.options ?? []).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => set(q.key, opt)}
                  className={`text-left rounded-md border px-3 py-2 text-sm transition-colors ${
                    answers[q.key] === opt
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-white/10 hover:bg-muted/30"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {q.type === "multiselect" && (
            <div className="grid sm:grid-cols-2 gap-2">
              {(q.options ?? []).map((opt) => {
                const arr = (answers[q.key] as string[]) ?? [];
                const active = arr.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleMulti(q.key, opt)}
                    className={`text-left rounded-md border px-3 py-2 text-sm transition-colors ${
                      active
                        ? "border-primary bg-primary/10"
                        : "border-white/10 hover:bg-muted/30"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      ))}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && (
        <p className="text-sm text-emerald-500 font-medium">Respostas salvas!</p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Salvando..." : "Salvar respostas"}
      </Button>
    </form>
  );
}
