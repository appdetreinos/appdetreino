/**
 * Tipos do módulo de Treinos.
 *
 * Adaptados do `ideal-life-app-main/types/database.ts` pro schema deste projeto
 * (`exercises`, `workout_*`). O schema atual NÃO tem `machine_type` v2
 * nem `instructions` — só os básicos. Os tipos v2 ficam preparados pra
 * migration futura.
 *
 * Mantemos as chaves estáveis (mesmo nomes do ideal) pra facilitar o diff
 * se alguém for olhar o projeto de referência.
 */

/* =========================================================================
   v1 (legado) — bate com a migration 0001_init.sql
   ========================================================================= */

export type PrimaryMuscleGroup =
  | "peito"
  | "costas"
  | "pernas"
  | "ombros"
  | "bracos"
  | "core"
  | "cardio"
  | "outro";

export type EquipmentKind =
  | "nenhum"
  | "haltere"
  | "barra"
  | "maquina"
  | "elastico"
  | "cabo"
  | "kettlebell"
  | "outro";

/* =========================================================================
   v2 — categoria fina (mapeada em `exercises.category` na migration 0031)
   ========================================================================= */

export type ExerciseCategory =
  | "peito"
  | "costas"
  | "ombros"
  | "biceps"
  | "triceps"
  | "quadriceps"
  | "posterior"
  | "gluteos"
  | "adutores"
  | "abdutores"
  | "panturrilha"
  | "tibial"
  | "abdomen"
  | "lombar"
  | "trapezio"
  | "antebraco"
  | "corpo_inteiro"
  | "cardio";

export type MachineType =
  | "selectorized"
  | "plate_loaded"
  | "cable"
  | "smith"
  | "free_weight"
  | "bodyweight"
  | "cardio"
  | "other";

/* =========================================================================
   Exercise — shape usado nos componentes.
   ========================================================================= */

export interface Exercise {
  id: string;
  /** NULL = exercício do catálogo global. Trainer_id = exercício do próprio trainer. */
  user_id: string | null;
  name: string;
  muscle_group: PrimaryMuscleGroup | string | null;
  equipment: EquipmentKind | string | null;
  /** Storage path OU URL absoluta (Wikimedia). */
  image_url?: string | null;
  /** GIF/MP4/WebM. Storage path OU URL absoluta. */
  animation_url?: string | null;
  /** v2: categoria fina (vide ExerciseCategory). */
  category?: ExerciseCategory | string | null;
  /** v2: apelidos alternativos pra busca. */
  aliases?: string[] | null;
  /** v2: tipo de máquina. */
  machine_type?: MachineType | string | null;
  /** v2: instruções longas. */
  instructions?: string | null;
  /** 'gif' | 'video' | 'svg' — inferido pela extensão se ausente. */
  media_type?: "gif" | "video" | "svg" | null;
}

/* =========================================================================
   ExerciseSet — série registrada dentro de uma sessão.
   ========================================================================= */

export interface ExerciseSet {
  id: string;
  workout_session_id: string;
  exercise_id: string | null;
  exercise_name: string;
  set_number: number;
  reps: number | null;
  load_kg: number | null;
  rpe: number | null;
  discomfort: number | null;
  notes: string | null;
  created_at: string;
}

/* =========================================================================
   WorkoutSession — uma execução de treino.
   ========================================================================= */

export interface WorkoutSession {
  id: string;
  workout_id: string;
  student_id: string;
  date: string;
  status: "pending" | "done" | "cancelled";
  started_at: string | null;
  completed_at: string | null;
}
