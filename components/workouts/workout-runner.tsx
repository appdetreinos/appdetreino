"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronUp,
  Clock,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExerciseMedia } from "@/components/ui/exercise-media";
import { ExercisePicker } from "@/components/ui/exercise-picker";
import { cn } from "@/lib/utils";
import { RPE_DESCRIPTORS } from "@/lib/workout";
import {
  finishWorkoutSession,
  logSet,
  cancelWorkoutSession,
  updateSet,
  deleteSet,
} from "@/app/(app)/app/workouts/actions";
import type { ExerciseSet } from "@/lib/types/workout";

/* =========================================================================
   Types
   ========================================================================= */

export type PlanExercise = {
  exerciseId: string;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  image_url: string | null;
  animation_url: string | null;
  media_type: "gif" | "video" | "svg" | null;
  setsPlanned: number;
  reps: string;
  load: string | null;
};

export type LibraryExercise = Pick<
  PlanExercise,
  | "exerciseId"
  | "name"
  | "muscle_group"
  | "equipment"
  | "image_url"
  | "animation_url"
  | "media_type"
>;

type Props = {
  sessionId: string;
  workoutId: string;
  workoutTitle: string;
  studentName: string | null;
  startedAt: string;
  initialSets: ExerciseSet[];
  planExercises: PlanExercise[];
  library: LibraryExercise[];
  /** Mapas id → url resolvida pra mídia estática/animação. */
  resolvedUrls: Record<string, string | null>;
};

/* =========================================================================
   Componente principal
   ========================================================================= */

export function WorkoutRunner({
  sessionId,
  workoutId,
  workoutTitle,
  studentName,
  startedAt,
  initialSets,
  planExercises,
  library,
  resolvedUrls,
}: Props) {
  const router = useRouter();

  const [sets, setSets] = useState<ExerciseSet[]>(initialSets);
  const [finishing, setFinishing] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Cronômetro (atualiza a cada 1s via rAF-like interval).
  const startedMs = useMemo(() => new Date(startedAt).getTime(), [startedAt]);
  const [elapsed, setElapsed] = useState<number>(() =>
    Math.max(0, Date.now() - startedMs),
  );
  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(Math.max(0, Date.now() - startedMs));
    }, 1000);
    return () => clearInterval(t);
  }, [startedMs]);

  const done = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sets) {
      map.set(s.exercise_name, (map.get(s.exercise_name) ?? 0) + 1);
    }
    return map;
  }, [sets]);

  const totalPlannedSets = useMemo(
    () => planExercises.reduce((acc, p) => acc + p.setsPlanned, 0),
    [planExercises],
  );
  const totalDoneSets = useMemo(
    () => planExercises.reduce((acc, p) => acc + (done.get(p.name) ?? 0), 0),
    [planExercises, done],
  );

  async function appendSet(input: {
    exerciseId: string;
    exerciseName: string;
    reps: number | null;
    loadKg: number | null;
    rpe: number | null;
    discomfort: number | null;
    notes: string | null;
    adHoc: boolean;
  }) {
    const nextSetNumber =
      (sets.filter((s) => s.exercise_name === input.exerciseName).length ?? 0) +
      1;

    const result = await logSet({
      session_id: sessionId,
      exercise_id: input.adHoc ? null : input.exerciseId,
      exercise_name: input.exerciseName,
      set_number: nextSetNumber,
      reps: input.reps,
      load_kg: input.loadKg,
      rpe: input.rpe,
      discomfort: input.discomfort,
      notes: input.notes,
    });

    if (!result.ok) return;

    // Optimistic: insere item local com id otimista (string) — re-após
    // server confirma substituímos pelo id real.
    const optimistic: ExerciseSet = {
      id: `tmp-${Math.random().toString(36).slice(2)}`,
      workout_session_id: sessionId,
      exercise_id: input.adHoc ? null : input.exerciseId,
      exercise_name: input.exerciseName,
      set_number: nextSetNumber,
      reps: input.reps,
      load_kg: input.loadKg,
      rpe: input.rpe,
      discomfort: input.discomfort,
      notes: input.notes,
      created_at: new Date().toISOString(),
    };
    setSets((prev) => [...prev, optimistic]);

    // Substitui pelo id real (mantém a ordem).
    setSets((prev) =>
      prev.map((s) => (s.id === optimistic.id ? { ...s, id: result.data.id } : s)),
    );
  }

  async function handlePatch(id: string, patch: Partial<ExerciseSet>) {
    await updateSet({ id, ...patch });
    setSets((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function handleDelete(id: string) {
    const before = sets;
    setSets((prev) => prev.filter((s) => s.id !== id));
    const result = await deleteSet({ id });
    if (!result.ok) setSets(before);
  }

  async function handleFinish(rpe: number | null, notes: string | null) {
    setFinishing(true);
    const result = await finishWorkoutSession({
      session_id: sessionId,
      user_rpe: rpe,
      notes,
    });
    setFinishing(false);
    if (result.ok) {
      setShowFinish(false);
      router.push(`/app/workouts/historico/${sessionId}`);
      router.refresh();
    } else {
      // mantém modal aberto; usuário pode tentar de novo
    }
  }

  async function handleCancel() {
    const result = await cancelWorkoutSession({ session_id: sessionId });
    setShowCancel(false);
    if (result.ok) {
      router.push(`/app/workouts/${workoutId}`);
      router.refresh();
    }
  }

  async function addAdHoc(pickedId: string) {
    const ex = library.find((e) => e.exerciseId === pickedId);
    if (!ex) return;
    setPickerOpen(false);
    await appendSet({
      exerciseId: ex.exerciseId,
      exerciseName: ex.name,
      reps: null,
      loadKg: null,
      rpe: null,
      discomfort: null,
      notes: null,
      adHoc: false,
    });
  }

  return (
    <div className="min-h-screen pb-32">
      <RunnerHeader
        title={workoutTitle}
        studentName={studentName}
        elapsedSec={Math.floor(elapsed / 1000)}
        onCancel={() => setShowCancel(true)}
        canFinish={totalDoneSets > 0 || sets.length > 0}
      />

      <main className="p-4 max-w-3xl mx-auto space-y-5">
        {/* Progresso do plano */}
        <Card className="bg-card/80 border-white/10 p-4">
          <div className="flex items-center justify-between text-sm">
            <p className="font-semibold">
              {totalDoneSets} de {totalPlannedSets} séries do plano
              {sets.filter(
                (s) =>
                  !planExercises.some((p) => p.name === s.exercise_name),
              ).length > 0 && (
                <span className="ml-1 text-muted-foreground">
                  (+{" "}
                  {
                    sets.filter(
                      (s) =>
                        !planExercises.some(
                          (p) => p.name === s.exercise_name,
                        ),
                    ).length
                  }{" "}
                  avulsas)
                </span>
              )}
            </p>
            <ProgressBar
              value={totalDoneSets}
              total={Math.max(totalPlannedSets, 1)}
            />
          </div>
        </Card>

        {/* Exercícios do plano */}
        {planExercises.map((p) => {
          const mySets = sets.filter((s) => s.exercise_name === p.name);
          return (
            <ExerciseBlock
              key={p.exerciseId}
              exercise={p}
              resolvedUrl={resolvedUrls[p.exerciseId] ?? null}
              sets={mySets}
              targetSets={p.setsPlanned}
              onLog={(input) =>
                appendSet({
                  exerciseId: p.exerciseId,
                  exerciseName: p.name,
                  reps: input.reps,
                  loadKg: input.loadKg,
                  rpe: input.rpe,
                  discomfort: input.discomfort,
                  notes: input.notes,
                  adHoc: false,
                })
              }
              onPatch={handlePatch}
              onDelete={handleDelete}
            />
          );
        })}

        {/* Adicionar avulso */}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-card/40 px-4 py-4 text-sm font-semibold text-foreground/70 hover:border-primary/40 hover:text-foreground"
        >
          <Plus className="size-4" />
          Exercício avulso
        </button>

        <div className="pt-6" />

        <Card className="sticky bottom-3 z-20 border-white/10 bg-card/90 backdrop-blur-md p-3 shadow-lg">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setShowCancel(true)}
            >
              <X className="size-4" />
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={
                finishing || (totalDoneSets === 0 && sets.length === 0)
              }
              className="flex-1 font-semibold"
              onClick={() => setShowFinish(true)}
            >
              <CheckCircle2 className="size-4" />
              Finalizar treino
            </Button>
          </div>
        </Card>
      </main>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        exercises={library.map((l) => ({
          id: l.exerciseId,
          name: l.name,
          muscle_group: l.muscle_group,
          equipment: l.equipment,
          image_url: l.image_url,
          animation_url: l.animation_url,
          category: l.muscle_group,
          aliases: null,
        }))}
        resolvedUrls={resolvedUrls}
        selectedIds={[]}
        onAdd={(ex) => addAdHoc(ex.id)}
      />

      <FinishDialog
        open={showFinish}
        onClose={() => setShowFinish(false)}
        onConfirm={handleFinish}
        finishing={finishing}
        sessionCount={totalDoneSets}
      />
      <CancelDialog
        open={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirm={handleCancel}
      />
    </div>
  );
}

/* =========================================================================
   Header com cronômetro
   ========================================================================= */

function RunnerHeader({
  title,
  studentName,
  elapsedSec,
  onCancel,
  canFinish,
}: {
  title: string;
  studentName: string | null;
  elapsedSec: number;
  onCancel: () => void;
  canFinish: boolean;
}) {
  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-background/85 backdrop-blur-md">
      <div className="px-4 h-16 flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{title}</p>
          {studentName && (
            <p className="truncate text-[11px] text-foreground/65">
              {studentName}
            </p>
          )}
        </div>
        <div
          className="inline-flex items-center gap-1.5 rounded-full bg-card border border-white/10 px-3 py-1 text-sm font-mono tabular-nums"
          aria-live="polite"
        >
          <Clock className="size-3.5" />
          {mm}:{ss}
        </div>
      </div>
    </header>
  );
}

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = Math.min(100, Math.round((value / total) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-32 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-semibold text-muted-foreground">
        {pct}%
      </span>
    </div>
  );
}

/* =========================================================================
   Bloco por exercício
   ========================================================================= */

function ExerciseBlock({
  exercise,
  resolvedUrl,
  sets,
  targetSets,
  onLog,
  onPatch,
  onDelete,
}: {
  exercise: PlanExercise;
  resolvedUrl: string | null;
  sets: ExerciseSet[];
  targetSets: number;
  onLog: (input: {
    reps: number | null;
    loadKg: number | null;
    rpe: number | null;
    discomfort: number | null;
    notes: string | null;
  }) => Promise<void> | void;
  onPatch: (id: string, patch: Partial<ExerciseSet>) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Card className="bg-card/80 border-white/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-stretch gap-3 p-3 text-left"
      >
        <ExerciseMedia
          exercise={{
            id: exercise.exerciseId,
            name: exercise.name,
            muscle_group: exercise.muscle_group,
            image_url: exercise.image_url,
            animation_url: exercise.animation_url,
            media_type: exercise.media_type,
            category: exercise.muscle_group,
          }}
          resolvedUrl={resolvedUrl}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold">{exercise.name}</p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
            Alvo: {targetSets}×{exercise.reps}
            {exercise.load ? ` @ ${exercise.load}` : ""}
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold text-primary">
            {sets.length}/{targetSets} séries
          </div>
        </div>
        <ChevronUp
          className={cn(
            "size-5 shrink-0 self-center text-muted-foreground transition-transform",
            !open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div className="border-t border-white/10 px-3 pb-3 pt-2 space-y-1.5">
          {sets.length === 0 && (
            <p className="text-[11px] text-muted-foreground italic py-1">
              Nenhuma série registrada.
            </p>
          )}
          {sets.map((s) => (
            <SetLine
              key={s.id}
              set={s}
              onPatch={(patch) => onPatch(s.id, patch)}
              onDelete={() => onDelete(s.id)}
            />
          ))}
          <NewSetForm
            nextSetNumber={sets.length + 1}
            defaultReps={null}
            onLog={onLog}
          />
        </div>
      )}
    </Card>
  );
}

/* =========================================================================
   Linha de série registrada (editável inline)
   ========================================================================= */

function SetLine({
  set,
  onPatch,
  onDelete,
}: {
  set: ExerciseSet;
  onPatch: (patch: Partial<ExerciseSet>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [reps, setReps] = useState(String(set.reps ?? ""));
  const [load, setLoad] = useState(String(set.load_kg ?? ""));
  const [rpe, setRpe] = useState<number | null>(set.rpe);
  const [discomfort, setDiscomfort] = useState<number | null>(set.discomfort);

  const dirty =
    (reps === "" ? null : Number(reps)) !== (set.reps ?? null) ||
    (load === "" ? null : Number(load)) !== (set.load_kg ?? null) ||
    rpe !== set.rpe ||
    discomfort !== set.discomfort;

  async function save() {
    onPatch({
      reps: reps === "" ? null : Number(reps),
      load_kg: load === "" ? null : Number(load),
      rpe,
      discomfort,
    });
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-background/40 px-2 py-1.5">
      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/15 text-[11px] font-bold text-primary">
        {set.set_number}
      </span>
      {editing ? (
        <>
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="reps"
            className="w-14 rounded-md border border-white/10 bg-background px-2 py-1 text-sm"
          />
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            value={load}
            onChange={(e) => setLoad(e.target.value)}
            placeholder="kg"
            className="w-16 rounded-md border border-white/10 bg-background px-2 py-1 text-sm"
          />
          <SmallNumberSelector
            value={rpe}
            onChange={setRpe}
            max={10}
            label="RPE"
          />
          <SmallNumberSelector
            value={discomfort}
            onChange={setDiscomfort}
            max={10}
            label="Desc"
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!dirty}
            onClick={save}
            aria-label="Salvar"
          >
            <Save className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
            aria-label="Cancelar"
          >
            <X className="size-3.5" />
          </Button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <span className="text-sm font-bold">
              {set.reps ?? "—"}
              <span className="mx-0.5 text-muted-foreground">×</span>
              {set.load_kg != null ? (
                <span>{set.load_kg}kg</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </span>
            {set.rpe != null && (
              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                RPE {set.rpe}
              </span>
            )}
            {set.discomfort != null && set.discomfort > 0 && (
              <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500">
                D {set.discomfort}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="text-foreground/60 hover:text-destructive"
            aria-label="Remover"
          >
            <Trash2 className="size-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

/* =========================================================================
   Form pra próxima série
   ========================================================================= */

function NewSetForm({
  nextSetNumber,
  defaultReps,
  onLog,
}: {
  nextSetNumber: number;
  defaultReps: number | null;
  onLog: (input: {
    reps: number | null;
    loadKg: number | null;
    rpe: number | null;
    discomfort: number | null;
    notes: string | null;
  }) => Promise<void> | void;
}) {
  const [reps, setReps] = useState<string>(defaultReps ? String(defaultReps) : "");
  const [load, setLoad] = useState<string>("");
  const [rpe, setRpe] = useState<number | null>(null);
  const [discomfort, setDiscomfort] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    await onLog({
      reps: reps === "" ? null : Number(reps),
      loadKg: load === "" ? null : Number(load),
      rpe,
      discomfort,
      notes: null,
    });
    setReps(defaultReps ? String(defaultReps) : "");
    setLoad("");
    setRpe(null);
    setDiscomfort(null);
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/[0.04] px-2 py-2 mt-2">
      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/15 text-[11px] font-bold text-primary">
        {nextSetNumber}
      </span>
      <input
        type="number"
        inputMode="numeric"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        placeholder="reps"
        className="w-14 rounded-md border border-white/10 bg-background px-2 py-1 text-sm"
      />
      <input
        type="number"
        inputMode="decimal"
        step="0.5"
        value={load}
        onChange={(e) => setLoad(e.target.value)}
        placeholder="kg"
        className="w-16 rounded-md border border-white/10 bg-background px-2 py-1 text-sm"
      />
      <SmallNumberSelector value={rpe} onChange={setRpe} max={10} label="RPE" />
      <SmallNumberSelector
        value={discomfort}
        onChange={setDiscomfort}
        max={10}
        label="Desc"
      />
      <Button
        type="button"
        size="sm"
        onClick={submit}
        disabled={busy || (reps === "" && load === "")}
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Plus className="size-3.5" />
        )}
        Adicionar
      </Button>
    </div>
  );
}

/* =========================================================================
   Selector pequeno (0..max) — RPE/Desconforto.
   ========================================================================= */

function SmallNumberSelector({
  value,
  onChange,
  max,
  label,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  max: number;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="rounded-md border border-white/10 bg-background px-2 py-1 text-[11px] font-semibold hover:border-primary/40"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {label}
        {value != null ? (
          <span className="ml-1 text-primary">{value}</span>
        ) : (
          <span className="ml-1 text-muted-foreground">—</span>
        )}
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute z-30 mt-1 left-0 grid grid-cols-6 gap-1 rounded-lg border border-white/10 bg-card p-2 shadow-xl"
        >
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="col-span-6 rounded bg-white/5 px-2 py-1 text-[10px] hover:bg-white/10"
          >
            limpar
          </button>
          {Array.from({ length: max + 1 }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onChange(i);
                setOpen(false);
              }}
              className={cn(
                "min-w-[24px] rounded px-1.5 py-0.5 text-[11px]",
                value === i
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-white/10",
              )}
            >
              {i}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   Modal de finalizar
   ========================================================================= */

function FinishDialog({
  open,
  onClose,
  onConfirm,
  finishing,
  sessionCount,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (rpe: number | null, notes: string | null) => Promise<void>;
  finishing: boolean;
  sessionCount: number;
}) {
  const [rpe, setRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const onConfirmClick = useCallback(async () => {
    await onConfirm(rpe, notes.trim() ? notes.trim() : null);
  }, [onConfirm, rpe, notes]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-5 shadow-2xl">
        <h3 className="text-lg font-bold">Finalizar treino</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Você registrou {sessionCount} séries nesse treino.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <Label className="text-xs">Como foi a sessão? (RPE 1–10)</Label>
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {RPE_DESCRIPTORS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRpe(r.value === rpe ? null : r.value)}
                  className={cn(
                    "rounded-lg border px-1 py-2 text-center text-xs",
                    rpe === r.value
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-white/10 bg-background/40 hover:border-primary/40",
                  )}
                >
                  <span className="block text-base font-extrabold">
                    {r.value}
                  </span>
                  <span className="block text-[10px] text-muted-foreground truncate">
                    {r.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="finish-notes" className="text-xs">
              Notas (opcional)
            </Label>
            <textarea
              id="finish-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Comentários sobre o treino de hoje…"
              className="mt-1.5 w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Voltar
          </Button>
          <Button
            type="button"
            onClick={onConfirmClick}
            disabled={finishing}
            className="font-semibold"
          >
            {finishing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Salvando…
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                Confirmar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   Modal de cancelar
   ========================================================================= */

function CancelDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <XCircle className="size-7 text-destructive" />
          <h3 className="text-lg font-bold">Cancelar treino?</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Todas as séries registradas serão apagadas. Isso não pode ser desfeito.
        </p>
        <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Voltar pro treino
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => onConfirm()}
            className="font-semibold"
          >
            <Trash2 className="size-4" />
            Sim, cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
