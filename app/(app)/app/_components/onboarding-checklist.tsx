"use client";

import { useState } from "react";
import Link from "next/link";
import {
  UserPlus,
  Dumbbell,
  Salad,
  CreditCard,
  Check,
  Sparkles,
  ChevronDown,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Onboarding checklist — tour guiado persistente no topo do dashboard.
 *
 * Migrado de motion/react → CSS animations (motion v13.4.0 quebra com
 * Next 16 + React 19, causava ref 3162866030 no /app).
 *
 *  - Persistente: visível até completar as 4 tarefas
 *  - Pode ser dispensado (vira "X" pequeno)
 *  - Marcado via triggers no banco
 */

export interface ChecklistState {
  invited_student: boolean;
  sent_workout: boolean;
  sent_diet: boolean;
  configured_pay: boolean;
}

export function OnboardingChecklist({
  initial,
}: {
  initial: ChecklistState;
}) {
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [state, setState] = useState(initial);

  const completed = Object.values(state).filter(Boolean).length;
  const total = 4;
  const allDone = completed === total;
  const pct = (completed / total) * 100;

  if (allDone && dismissed) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border overflow-hidden animate-fade-in-down",
        allDone
          ? "border-emerald-500/30 bg-emerald-500/[0.04]"
          : "border-primary/30 bg-primary/[0.04]"
      )}
    >
      {/* Header — sempre visível, mostra progresso */}
      <div className="flex items-center gap-3 p-4 sm:p-5">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl",
            allDone
              ? "bg-emerald-500/15 text-emerald-500"
              : "bg-primary/15 text-primary"
          )}
        >
          <Sparkles className="size-4" />
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-bold sm:text-base">
              {allDone ? "Tudo pronto! 🎉" : "Bora dar os primeiros passos"}
            </h3>
            <span
              className={cn(
                "text-[11px] font-bold num tabular-nums",
                allDone ? "text-emerald-500" : "text-primary"
              )}
            >
              {completed}/{total}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {allDone
              ? "Você concluiu as 4 tarefas iniciais. Pode fechar quando quiser."
              : expanded
                ? "Faz as tarefas abaixo no seu ritmo. Vai marcando conforme você for fazendo."
                : "Tarefas pendentes pra você dominar a plataforma"}
          </p>
        </div>

        {!allDone && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="grid size-8 place-items-center rounded-md text-foreground/60 transition-colors hover:bg-white/5 hover:text-foreground"
            aria-label={expanded ? "Recolher" : "Expandir"}
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform duration-200",
                expanded && "rotate-180"
              )}
            />
          </button>
        )}

        {allDone && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="grid size-8 place-items-center rounded-md text-foreground/60 transition-colors hover:bg-white/5 hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Barra de progresso (CSS transition) */}
      <div className="h-1 w-full bg-white/5">
        <div
          className={cn(
            "h-full transition-all duration-800 ease-out",
            allDone ? "bg-emerald-500" : "bg-primary"
          )}
          style={{ width: `${pct}%`, transitionDuration: "800ms" }}
        />
      </div>

      {/* Lista de tarefas — colapsável */}
      {expanded && !allDone && (
        <div className="overflow-hidden animate-fade-in">
          <ul className="divide-y divide-white/5">
            <Task
              icon={UserPlus}
              title="Convide seu primeiro aluno"
              description="Manda o link de convite e ele já entra com tudo configurado."
              href="/app/students/new"
              done={state.invited_student}
            />
            <Task
              icon={Dumbbell}
              title="Monte um treino"
              description="Cria séries, exercícios e cargas. O aluno recebe pelo app."
              href="/app/workouts/new"
              done={state.sent_workout}
            />
            <Task
              icon={Salad}
              title="Monte uma dieta"
              description="Refeições, horários e trocas. Tudo no painel do aluno."
              href="/app/diets"
              done={state.sent_diet}
            />
            <Task
              icon={CreditCard}
              title="Configure a cobrança"
              description="Cria o link de pagamento recorrente (Pix ou cartão)."
              href="/app/payment-links"
              done={state.configured_pay}
            />
          </ul>
        </div>
      )}

      {/* Footer quando completo */}
      {allDone && (
        <div className="border-t border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3 text-xs text-emerald-500 sm:px-5">
          Daqui pra frente é escalar — a plataforma cuida do resto.
        </div>
      )}
    </div>
  );
}

/* ---------- Task ---------- */

function Task({
  icon: Icon,
  title,
  description,
  href,
  done,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  done: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "group flex items-center gap-3 px-4 py-3 transition-colors sm:px-5 sm:py-4",
          done
            ? "opacity-60"
            : "hover:bg-white/[0.03]"
        )}
      >
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full border-2 transition-all",
            done
              ? "border-emerald-500 bg-emerald-500 text-emerald-50"
              : "border-white/15 text-foreground/40 group-hover:border-primary/40 group-hover:text-primary"
          )}
        >
          {done ? (
            <Check className="size-4" strokeWidth={3} />
          ) : (
            <Icon className="size-4" strokeWidth={2.2} />
          )}
        </span>

        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "text-sm font-bold",
              done && "line-through text-muted-foreground"
            )}
          >
            {title}
          </div>
          <div className="text-xs text-muted-foreground truncate">{description}</div>
        </div>

        {!done && (
          <span className="text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Fazer agora →
          </span>
        )}
      </Link>
    </li>
  );
}
