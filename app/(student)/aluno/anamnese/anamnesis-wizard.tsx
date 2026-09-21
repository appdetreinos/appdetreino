"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { safeLog } from "@/lib/log/safe";

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

const PER_STEP = 3;

export function AnamnesisWizard({ template, existingAnswers }: Props) {
  const questions = (template.questions ?? []) as Question[];
  const totalSteps = Math.max(1, Math.ceil(questions.length / PER_STEP));
  const [step, setStep] = useState(0); // 0-indexed
  const [answers, setAnswers] = useState<Record<string, unknown>>(existingAnswers);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const start = step * PER_STEP;
  const end = Math.min(start + PER_STEP, questions.length);
  const visible = questions.slice(start, end);

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

  function validateVisible(): string | null {
    for (const q of visible) {
      if (!q.required) continue;
      const v = answers[q.key];
      if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) {
        return `Preencha "${q.label}" para continuar.`;
      }
    }
    return null;
  }

  function next() {
    const v = validateVisible();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    if (step < totalSteps - 1) setStep((s) => s + 1);
    else submit();
  }

  function back() {
    setError(null);
    if (step > 0) setStep((s) => s - 1);
  }

  function submit() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/me/anamnesis", {
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

  const progressValue = ((step + 1) / totalSteps) * 100;

  return (
    <div className="space-y-6">
      <Progress value={progressValue} className="h-1.5" />

      <p className="text-xs text-muted-foreground">
        Etapa {step + 1} de {totalSteps}
        {questions.length > 0 && (
          <>
            {" · "}
            Perguntas {start + 1}–{end} de {questions.length}
          </>
        )}
      </p>

      {visible.map((q, idx) => {
        const globalIdx = start + idx + 1;
        return (
          <Card key={q.key} className="bg-card border-white/5 p-5">
            <Label className="flex items-baseline gap-2 mb-3">
              <span className="font-semibold">
                {globalIdx}. {q.label}
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
                onChange={(e) =>
                  set(q.key, e.target.value === "" ? null : Number(e.target.value))
                }
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
        );
      })}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && (
        <Card className="bg-emerald-500/10 border-emerald-500/30 p-4 flex items-center gap-3">
          <Check className="size-5 text-emerald-500 shrink-0" />
          <p className="text-sm">
            <strong>Anamnese salva.</strong> Suas respostas foram enviadas para o personal.
          </p>
        </Card>
      )}

      {!success && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={back} disabled={step === 0 || pending}>
            <ArrowLeft className="size-4" />
            Voltar
          </Button>
          <Button onClick={next} disabled={pending}>
            {pending
              ? "Salvando..."
              : step < totalSteps - 1
              ? "Continuar"
              : "Enviar respostas"}
            {step < totalSteps - 1 ? (
              <ArrowRight className="size-4" />
            ) : (
              <Check className="size-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
