"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { formatBRL } from "@/lib/types/billing";
import type { QuizAnswers } from "@/lib/validation/quiz";

interface Props {
  step: number;
}

const experienceOptions = [
  { value: "less_6m", label: "Menos de 6 meses" },
  { value: "6m_2y", label: "6 meses a 2 anos" },
  { value: "2y_5y", label: "2 a 5 anos" },
  { value: "more_5y", label: "Mais de 5 anos" },
] as const;

const struggleOptions = [
  { value: "cobranca", label: "Cobrar mensalidade" },
  { value: "treino_dieta", label: "Mandar treino e dieta" },
  { value: "adesao", label: "Manter aluno engajado" },
  { value: "organizacao", label: "Organizar agenda e finanças" },
] as const;

type ExperienceValue = (typeof experienceOptions)[number]["value"];
type StruggleValue = (typeof struggleOptions)[number]["value"];

export function QuestionarioClient({ step }: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<QuizAnswers>({
    studentCount: null,
    experience: null,
    revenue: null,
    struggle: null,
  });

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  // Persiste cookie httpOnly a cada mudança. Debounce simples: 300ms.
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch("/api/quiz/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      }).catch(() => {
        // offline/não crítico — o resultado cai pra "start" se cookie sumir
      });
    }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [answers]);

  function next() {
    if (step < totalSteps) router.push(`/app/questionario?step=${step + 1}`);
    else router.push("/app/questionario/resultado");
  }

  function back() {
    if (step > 1) router.push(`/app/questionario?step=${step - 1}`);
  }

  const canProceed = useMemo(() => {
    if (step === 1) return (answers.studentCount ?? 0) > 0;
    if (step === 2) return !!answers.experience;
    if (step === 3) return (answers.revenue ?? 0) > 0;
    if (step === 4) return !!answers.struggle;
    return false;
  }, [answers, step]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/5">
        <div className="mx-auto max-w-2xl px-6 h-16 flex items-center justify-between">
          <div className="font-extrabold">Viva <span className="text-primary">FIT APP</span></div>
          <span className="text-xs text-muted-foreground">
            Etapa {step} de {totalSteps}
          </span>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <Progress value={progress} className="h-1.5" />

          {step === 1 && (
            <Step1
              value={answers.studentCount}
              onChange={(v) => setAnswers((a) => ({ ...a, studentCount: v }))}
            />
          )}
          {step === 2 && (
            <Step2
              value={answers.experience}
              onChange={(v) => setAnswers((a) => ({ ...a, experience: v as ExperienceValue }))}
            />
          )}
          {step === 3 && (
            <Step3
              value={answers.revenue}
              onChange={(v) => setAnswers((a) => ({ ...a, revenue: v }))}
            />
          )}
          {step === 4 && (
            <Step4
              value={answers.struggle}
              onChange={(v) => setAnswers((a) => ({ ...a, struggle: v as StruggleValue }))}
            />
          )}

          <div className="mt-10 flex items-center justify-between">
            {step > 1 ? (
              <Button variant="ghost" onClick={back}>
                <ArrowLeft className="size-4" />
                Voltar
              </Button>
            ) : (
              <Link href="/app" className="text-sm text-muted-foreground hover:text-foreground">
                Pular por agora
              </Link>
            )}
            <Button onClick={next} disabled={!canProceed} className="font-semibold">
              Continuar
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------- Steps ---------- */

function Step1({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  const presets = [5, 15, 30, 50, 80, 150];
  const [custom, setCustom] = useState<number | "">("");

  return (
    <div className="mt-10">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
        Quantos alunos você atende hoje?
      </h1>
      <p className="mt-3 text-muted-foreground">
        Pode ser uma média. A gente usa só pra te recomendar o plano certo.
      </p>

      <div className="mt-8 grid grid-cols-3 gap-3">
        {presets.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              onChange(n);
              setCustom("");
            }}
            className={`rounded-xl border p-5 text-center transition-colors ${
              value === n
                ? "border-primary bg-primary/10"
                : "border-white/10 hover:border-primary/40"
            }`}
          >
            <div className="num text-3xl font-extrabold">{n}+</div>
            <div className="text-xs text-muted-foreground mt-1">alunos</div>
          </button>
        ))}
      </div>

      <div className="mt-6">
        <Label htmlFor="custom">Outro número</Label>
        <Input
          id="custom"
          type="number"
          min={0}
          value={custom}
          onChange={(e) => {
            const v = e.target.value === "" ? "" : Number(e.target.value);
            setCustom(v);
            if (typeof v === "number") onChange(v);
          }}
          placeholder="ex: 42"
          className="mt-1.5"
        />
      </div>
    </div>
  );
}

function Step2({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: ExperienceValue) => void;
}) {
  return (
    <div className="mt-10">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
        Há quanto tempo você atua como personal?
      </h1>
      <p className="mt-3 text-muted-foreground">Isso muda o tipo de dica que te damos.</p>

      <div className="mt-8 grid sm:grid-cols-2 gap-3">
        {experienceOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-xl border p-5 text-left transition-colors ${
              value === opt.value
                ? "border-primary bg-primary/10"
                : "border-white/10 hover:border-primary/40"
            }`}
          >
            <div className="font-semibold">{opt.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Step3({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  const presets = [2000, 5000, 10000, 20000, 40000];
  const [custom, setCustom] = useState<number | "">("");

  return (
    <div className="mt-10">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
        Quanto você fatura por mês hoje?
      </h1>
      <p className="mt-3 text-muted-foreground">
        A gente usa isso pra te mostrar quanto sobra depois do Viva FIT APP.
      </p>

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {presets.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              onChange(n);
              setCustom("");
            }}
            className={`rounded-xl border p-5 text-center transition-colors ${
              value === n
                ? "border-primary bg-primary/10"
                : "border-white/10 hover:border-primary/40"
            }`}
          >
            <div className="num text-lg font-extrabold">{formatBRL(n)}</div>
            <div className="text-xs text-muted-foreground mt-1">/mês</div>
          </button>
        ))}
      </div>

      <div className="mt-6">
        <Label htmlFor="custom">Outro valor</Label>
        <Input
          id="custom"
          type="number"
          min={0}
          value={custom}
          onChange={(e) => {
            const v = e.target.value === "" ? "" : Number(e.target.value);
            setCustom(v);
            if (typeof v === "number") onChange(v);
          }}
          placeholder="ex: 8000"
          className="mt-1.5"
        />
      </div>
    </div>
  );
}

function Step4({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: StruggleValue) => void;
}) {
  return (
    <div className="mt-10">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
        O que mais te tira o sono hoje?
      </h1>
      <p className="mt-3 text-muted-foreground">
        O Viva FIT APP resolve os 4. Mas a gente prioriza o que tá mais urgente pra você.
      </p>

      <div className="mt-8 grid sm:grid-cols-2 gap-3">
        {struggleOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-xl border p-5 text-left transition-colors ${
              value === opt.value
                ? "border-primary bg-primary/10"
                : "border-white/10 hover:border-primary/40"
            }`}
          >
            <div className="font-semibold">{opt.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
