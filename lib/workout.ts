import type {
  EquipmentKind,
  ExerciseCategory,
  PrimaryMuscleGroup,
} from "@/lib/types/workout";

/**
 * Labels e gradientes usados em toda a UI do módulo Treinos.
 * Centralizado aqui pra evitar drift entre cards/listas/dialogs.
 *
 * Portado do `ideal-life-app-main/lib/workout.ts` e adaptado pra paleta do
 * painel-fit (`primary` laranja + neutros `card/background/border-white/10`).
 */

/* =========================================================================
   Músculo primário (v1 / legado)
   ========================================================================= */

export const PRIMARY_MUSCLE_LABEL: Record<PrimaryMuscleGroup, string> = {
  peito: "Peito",
  costas: "Costas",
  pernas: "Pernas",
  ombros: "Ombros",
  bracos: "Braços",
  core: "Core",
  cardio: "Cardio",
  outro: "Outro",
};

/** Ordem sugerida pra exibir nos filtros. */
export const PRIMARY_MUSCLE_ORDER: PrimaryMuscleGroup[] = [
  "peito",
  "costas",
  "pernas",
  "ombros",
  "bracos",
  "core",
  "cardio",
  "outro",
];

/** Tailwind classes para o fundo do placeholder/grupo muscular.
 *  Adaptado pra paleta laranja `primary` do painel-fit. */
export const PRIMARY_MUSCLE_BG: Record<PrimaryMuscleGroup, string> = {
  peito: "bg-primary/20 text-primary",
  costas: "bg-emerald-500/20 text-emerald-500",
  pernas: "bg-violet-500/20 text-violet-500",
  ombros: "bg-amber-500/20 text-amber-500",
  bracos: "bg-primary/15 text-primary",
  core: "bg-sky-500/20 text-sky-500",
  cardio: "bg-rose-500/20 text-rose-500",
  outro: "bg-white/10 text-foreground/60",
};

/* =========================================================================
   Equipamento
   ========================================================================= */

export const EQUIPMENT_LABEL: Record<EquipmentKind, string> = {
  nenhum: "Sem equipamento",
  haltere: "Haltere",
  barra: "Barra",
  maquina: "Máquina",
  elastico: "Elástico",
  cabo: "Cabo",
  kettlebell: "Kettlebell",
  outro: "Outro",
};

export const EQUIPMENT_ORDER: EquipmentKind[] = [
  "nenhum",
  "haltere",
  "barra",
  "maquina",
  "elastico",
  "cabo",
  "kettlebell",
  "outro",
];

/* =========================================================================
   Categoria fina (v2)
   ========================================================================= */

export const EXERCISE_CATEGORY_LABEL: Record<ExerciseCategory, string> = {
  peito: "Peito",
  costas: "Costas",
  ombros: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  quadriceps: "Quadríceps",
  posterior: "Posterior de coxa",
  gluteos: "Glúteos",
  adutores: "Adutores",
  abdutores: "Abdutores",
  panturrilha: "Panturrilha",
  tibial: "Tibial",
  abdomen: "Abdômen / Core",
  lombar: "Lombar / Cadeia posterior",
  trapezio: "Trapézio",
  antebraco: "Antebraço / Pegada",
  corpo_inteiro: "Corpo inteiro",
  cardio: "Cardio",
};

/** Ordem em que as categorias aparecem no picker. */
export const EXERCISE_CATEGORY_ORDER: ExerciseCategory[] = [
  "peito",
  "costas",
  "ombros",
  "biceps",
  "triceps",
  "quadriceps",
  "posterior",
  "gluteos",
  "adutores",
  "abdutores",
  "panturrilha",
  "tibial",
  "abdomen",
  "lombar",
  "trapezio",
  "antebraco",
  "corpo_inteiro",
  "cardio",
];

/** Tailwind classes para o fundo do placeholder por categoria. */
export const EXERCISE_CATEGORY_BG: Record<ExerciseCategory, string> = {
  peito: "bg-primary/20 text-primary",
  costas: "bg-emerald-500/20 text-emerald-500",
  ombros: "bg-amber-500/20 text-amber-500",
  biceps: "bg-primary/15 text-primary",
  triceps: "bg-primary/15 text-primary",
  quadriceps: "bg-violet-500/20 text-violet-500",
  posterior: "bg-violet-500/20 text-violet-500",
  gluteos: "bg-violet-500/20 text-violet-500",
  adutores: "bg-violet-500/15 text-violet-500",
  abdutores: "bg-violet-500/15 text-violet-500",
  panturrilha: "bg-white/10 text-foreground/60",
  tibial: "bg-white/10 text-foreground/60",
  abdomen: "bg-sky-500/15 text-sky-500",
  lombar: "bg-emerald-500/20 text-emerald-500",
  trapezio: "bg-amber-500/15 text-amber-500",
  antebraco: "bg-white/10 text-foreground/60",
  corpo_inteiro: "bg-rose-500/20 text-rose-500",
  cardio: "bg-rose-500/20 text-rose-500",
};

/* =========================================================================
   Helpers de número / parsing
   ========================================================================= */

/** Converte minutos em horas decimais (1 casa) com clamp defensivo. */
export function minutesToHours(min: number): number {
  if (!Number.isFinite(min) || min <= 0) return 0;
  return Math.round((min / 60) * 10) / 10;
}

/** RPE descritivo (1–10). Texto neutro — sem diagnosticar nem afirmar segurança. */
export const RPE_DESCRIPTORS: { value: number; label: string; hint: string }[] = [
  { value: 1, label: "Muito leve", hint: "Praticamente sem esforço" },
  { value: 2, label: "Leve", hint: "Aquecimento fácil" },
  { value: 3, label: "Leve", hint: "Controle respiratório tranquilo" },
  { value: 4, label: "Moderado", hint: "Cansaço controlado" },
  { value: 5, label: "Moderado", hint: "Suda, mantém conversa" },
  { value: 6, label: "Moderado", hint: "Fala fica entrecortada" },
  { value: 7, label: "Intenso", hint: "Poucas palavras" },
  { value: 8, label: "Intenso", hint: "Respiração pesada" },
  { value: 9, label: "Muito intenso", hint: "Quase máximo, séries curtas" },
  { value: 10, label: "Máximo", hint: "Esforço máximo até a falha" },
];

/** Desconforto (0–10). "Dor" sem rótulo diagnóstico. */
export const DISCOMFORT_HINT =
  "Marque desconforto físico sentido durante a série. Sem diagnóstico — apenas registro.";

/** Normaliza string de repetição alvo. Aceita "10-12", "8", "até a falha". */
export function parseTargetReps(value: string): {
  min?: number;
  max?: number;
  raw: string;
} {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return { raw: "" };
  if (trimmed.includes("-")) {
    const [a, b] = trimmed.split("-").map((n) => parseInt(n.trim(), 10));
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return { min: a, max: b, raw: trimmed };
    }
  }
  const single = parseInt(trimmed, 10);
  if (Number.isFinite(single)) {
    return { min: single, max: single, raw: trimmed };
  }
  return { raw: trimmed };
}

/** Converte uma string de reps-alvo em um número mínimo (heurística pra UI). */
export function targetRepsMin(value: string): number | null {
  return parseTargetReps(value).min ?? null;
}

/** Calcula volume total (reps × kg) de um set. */
export function setVolumeKg(reps: number | null, loadKg: number | null): number {
  if (reps == null || loadKg == null) return 0;
  return Math.round(reps * loadKg * 100) / 100;
}

/** Formata RPE como "7 — Intenso". */
export function rpeLabel(value: number | null): string {
  if (value == null) return "—";
  const d = RPE_DESCRIPTORS.find((x) => x.value === value);
  return d ? `${value} — ${d.label}` : `${value}`;
}
