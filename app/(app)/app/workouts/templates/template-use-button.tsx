"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Send, X, Check } from "lucide-react";

interface StudentOption {
  id: string;
  name: string;
}

/**
 * Botão "Usar template" — abre dropdown de seleção de aluno,
 * chama a RPC `clone_workout_template`, redireciona pro treino criado.
 */
export function TemplateUseButton({
  templateId,
  templateTitle,
  students,
}: {
  templateId: string;
  templateTitle: string;
  students: StudentOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  async function handleUse() {
    if (!picked) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/workouts/from-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, studentId: picked }),
      });

      const json = (await res.json()) as { ok?: boolean; workoutId?: string; error?: string };

      if (!res.ok || !json.ok) {
        setError(json.error ?? "Não deu pra aplicar o template.");
        setSubmitting(false);
        return;
      }

      // Sucesso → vai pro treino criado
      startTransition(() => router.push(`/app/workouts/${json.workoutId}`));
    } catch {
      setError("Erro de rede. Tenta de novo.");
      setSubmitting(false);
    }
  }

  if (students.length === 0) {
    return (
      <Button variant="outline" disabled className="text-xs">
        Convide um aluno primeiro
      </Button>
    );
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="font-semibold"
        size="sm"
      >
        <Send className="size-4" />
        Usar template
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-5"
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-lg">Aplicar template</h3>
                <p className="text-sm text-foreground/65 mt-1">
                  <strong className="text-foreground">{templateTitle}</strong> será criado e atribuído pro aluno escolhido.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="text-foreground/60 hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-5">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Pra qual aluno?
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {students.map((s) => (
                  <label
                    key={s.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      picked === s.id
                        ? "border-primary bg-primary/10"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="student"
                      value={s.id}
                      checked={picked === s.id}
                      onChange={() => setPicked(s.id)}
                      className="accent-primary"
                    />
                    <span className="flex-1 text-sm font-medium">{s.name}</span>
                    {picked === s.id && <Check className="size-4 text-primary" />}
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleUse}
                disabled={!picked || submitting || pending}
                className="font-semibold"
              >
                {submitting || pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Criando treino…
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    Criar e atribuir
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
