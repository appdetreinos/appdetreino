/**
 * Database type — gerado manualmente (não usa `supabase gen types`).
 *
 * Cobre as 36 tabelas públicas do projeto + 10 enums + tipos auxiliares.
 * Manter em sincronia com `supabase/migrations/*.sql` ao adicionar colunas.
 *
 * Uso:
 *   import type { Database } from "@/lib/supabase/types";
 *   const supabase = createClient<Database>();
 */

// ============================================================
// Enums (espelham `CREATE TYPE ... AS ENUM` nas migrations)
// ============================================================

export type UserRole = "trainer" | "student" | "admin";
export type PlanTier = "start" | "pro" | "top";
export type StudentStatus = "active" | "inactive" | "paused";
export type PaymentStatus = "pending" | "paid" | "overdue" | "cancelled";
export type EvolutionInstanceState = "open" | "close" | "connecting";
export type BillingType = "PIX" | "CREDIT_CARD" | "BOLETO";
export type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
export type AppointmentType = "presencial" | "online" | "avaliacao";
export type HabitFrequency = "daily" | "weekly" | "weekdays" | "custom";
export type RecurrenceType = "none" | "weekly" | "biweekly" | "monthly";

// ============================================================
// Schema public — Database["public"] shape
// ============================================================

type ISO8601 = string;
type DateStr = string;
type TimeStr = string;

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ---------- Núcleo ----------
export interface ProfilesRow {
  id: string;
  role: UserRole;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  cref: string | null;
  deleted_at: ISO8601 | null;
  created_at: ISO8601;
  updated_at: ISO8601;
}
export interface TrainerProfilesRow {
  user_id: string;
  bio: string | null;
  specialties: string[] | null;
  plan_tier: PlanTier;
  trial_ends_at: ISO8601 | null;
  evolution_instance: string | null;
  evolution_apikey_enc: Uint8Array | null;
  onboarding_step: number;
  onboarding_completed_at: ISO8601 | null;
  actuation: string | null;
  client_volume: string | null;
  monthly_revenue: string | null;
  pix_key: string | null;
  pix_key_type: "cpf" | "cnpj" | "email" | "phone" | "random" | null;
  pix_beneficiary_name: string | null;
  created_at: ISO8601;
}
export interface StudentProfilesRow {
  user_id: string;
  trainer_id: string;
  invite_code: string | null;
  status: StudentStatus;
  full_name: string;
  phone: string | null;
  birthdate: DateStr | null;
  gender: string | null;
  height_cm: number | null;
  goal: string | null;
  xp_total: number;
  streak_current: number;
  streak_last_action_at: ISO8601 | null;
  joined_at: ISO8601;
  created_at: ISO8601;
}

// ---------- Workouts ----------
export interface ExercisesRow {
  id: string;
  trainer_id: string | null;
  name: string;
  video_url: string | null;
  muscle_group: string | null;
  equipment: string | null;
  instructions: string | null;
  created_at: ISO8601;
}
export interface WorkoutsRow {
  id: string;
  trainer_id: string;
  student_id: string | null;
  title: string;
  goal: string | null;
  created_at: ISO8601;
}
export interface WorkoutDaysRow {
  id: string;
  workout_id: string;
  day_of_week: number; // 0-6
  title: string | null;
}
export interface WorkoutItemsRow {
  id: string;
  workout_day_id: string;
  position: number;
  exercise_id: string;
  sets: number;
  reps: string;
  load: string | null;
  rest_seconds: number | null;
  rpe: number | null;
  notes: string | null;
}
export interface WorkoutSessionsRow {
  id: string;
  workout_id: string;
  student_id: string;
  date: DateStr;
  status: string;
  started_at: ISO8601 | null;
  completed_at: ISO8601 | null;
}
export interface WorkoutRecurrencesRow {
  id: string;
  workout_id: string;
  student_id: string;
  recurrence: RecurrenceType;
  start_date: DateStr;
  end_date: DateStr | null;
  weekday: number | null;
  created_at: ISO8601;
}

// ---------- Dietas ----------
export interface DietTemplatesRow {
  id: string;
  trainer_id: string | null;
  title: string;
  description: string | null;
  kcal_target: number | null;
  p_target: number | null;
  c_target: number | null;
  g_target: number | null;
  goal: string | null;
  is_global: boolean;
  created_at: ISO8601;
}
export interface DietTemplateMealsRow {
  id: string;
  template_id: string;
  name: string;
  time: TimeStr | null;
  position: number;
  created_at: ISO8601;
}
export interface DietTemplateItemsRow {
  id: string;
  meal_id: string;
  food_name: string;
  grams: number;
  position: number;
  created_at: ISO8601;
}
export interface FoodsRow {
  id: string;
  name: string;
  kcal_100g: number | null;
  protein_100g: number | null;
  carbs_100g: number | null;
  fat_100g: number | null;
  source: string;
}
export interface DietsRow {
  id: string;
  trainer_id: string;
  student_id: string | null;
  title: string;
  kcal_target: number | null;
  p_target: number | null;
  c_target: number | null;
  g_target: number | null;
  created_at: ISO8601;
}
export interface MealsRow {
  id: string;
  diet_id: string;
  position: number;
  time: TimeStr | null;
  name: string;
}
export interface MealItemsRow {
  id: string;
  meal_id: string;
  food_id: string;
  grams: number;
}

// ---------- Avaliação física ----------
export interface MeasurementsRow {
  id: string;
  student_id: string;
  date: DateStr;
  weight_kg: number | null;
  body_fat_pct: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  photos_urls: string[] | null;
  notes: string | null;
  created_at: ISO8601;
}

// ---------- Pagamentos ----------
export interface PaymentsRow {
  id: string;
  trainer_id: string;
  student_id: string;
  amount: number;
  status: PaymentStatus;
  due_date: DateStr;
  paid_at: ISO8601 | null;
  gateway: "pix_direto" | "mercadopago" | "manual";
  external_id: string | null;
  billing_type: BillingType | null;
  description: string | null;
  created_at: ISO8601;
}
export interface PaymentTemplatesRow {
  id: string;
  trainer_id: string;
  name: string;
  amount: number | null;
  cycle: string | null;
  billing_type: BillingType | null;
}
export interface PaymentLinksRow {
  id: string;
  trainer_id: string;
  student_id: string | null;
  description: string;
  amount_cents: number;
  billing_type: BillingType;
  external_id: string | null;
  url: string | null;
  public_code: string;
  paid_at: ISO8601 | null;
  expires_at: ISO8601 | null;
  created_at: ISO8601;
}
export interface PaymentMessagesRow {
  id: string;
  trainer_id: string;
  payment_id: string | null;
  resolved_text: string;
  whatsapp_to: string | null;
  status: "pending" | "sent" | "failed" | "cancelled";
  sent_at: ISO8601 | null;
  error: string | null;
  created_at: ISO8601;
}
export interface TrainerSettingsRow {
  user_id: string;
  pix_key: string | null;
  pix_key_type: "cpf" | "cnpj" | "email" | "phone" | "random" | null;
  pix_beneficiary_name: string | null;
  default_charge_message: string | null;
  default_overdue_message: string | null;
  onboarding_completed_at: ISO8601 | null;
  updated_at: ISO8601 | null;
}

// ---------- WhatsApp / Evolution ----------
export interface EvolutionInstancesRow {
  id: string;
  trainer_id: string;
  instance_name: string;
  state: EvolutionInstanceState;
  qr_code_base64: string | null;
  phone: string | null;
  last_seen_at: ISO8601 | null;
  created_at: ISO8601;
}
export interface EvolutionTemplatesRow {
  id: string;
  trainer_id: string;
  key: string;
  name: string;
  category: string | null;
  content: string;
  variables: string[] | null;
}
export interface EvolutionMessagesRow {
  id: string;
  trainer_id: string;
  instance_name: string | null;
  direction: string;
  to_phone: string | null;
  from_phone: string | null;
  type: string;
  payload_jsonb: Json | null;
  status: string;
  scheduled_for: ISO8601 | null;
  sent_at: ISO8601 | null;
  created_at: ISO8601;
}
export interface EvolutionWebhookEventsRow {
  id: string;
  instance: string;
  event_type: string;
  payload_jsonb: Json;
  processed_at: ISO8601 | null;
  error: string | null;
  created_at: ISO8601;
}

// ---------- Comunidade ----------
export interface CommunityPostsRow {
  id: string;
  trainer_id: string;
  author_id: string;
  audience: string;
  content: string;
  media_urls: string[] | null;
  pinned: boolean;
  created_at: ISO8601;
}
export interface CommunityLikesRow {
  post_id: string;
  user_id: string;
  created_at: ISO8601;
}
export interface CommunityCommentsRow {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: ISO8601;
}

// ---------- Gamificação ----------
export interface BadgesRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  criteria_jsonb: Json | null;
}
export interface StudentBadgesRow {
  student_id: string;
  badge_id: string;
  earned_at: ISO8601;
}
export interface ChallengesRow {
  id: string;
  trainer_id: string;
  title: string;
  description: string | null;
  starts_at: ISO8601;
  ends_at: ISO8601;
  reward_xp: number;
  reward_badge: string | null;
}
export interface ChallengeParticipantsRow {
  challenge_id: string;
  student_id: string;
  progress: number;
}

// ---------- Auditoria ----------
export interface AuditLogRow {
  id: string;
  user_id: string;
  resource_type: string;
  resource_id: string | null;
  action: string;
  ip: string | null;
  user_agent: string | null;
  metadata: Json | null;
  created_at: ISO8601;
}

// ---------- Agenda ----------
export interface AppointmentTypesRow {
  id: string;
  trainer_id: string;
  name: string;
  duration_minutes: number;
  type: AppointmentType;
  price_cents: number | null;
  color: string;
  active: boolean;
  created_at: ISO8601;
}
export interface AppointmentsRow {
  id: string;
  trainer_id: string;
  student_id: string | null;
  appointment_type_id: string | null;
  title: string;
  starts_at: ISO8601;
  ends_at: ISO8601;
  status: AppointmentStatus;
  location: string | null;
  notes: string | null;
  created_at: ISO8601;
}
export interface TrainerAvailabilityRow {
  id: string;
  trainer_id: string;
  weekday: number;
  start_time: TimeStr;
  end_time: TimeStr;
  created_at: ISO8601;
}

// ---------- Hábitos ----------
export interface HabitsRow {
  id: string;
  trainer_id: string;
  student_id: string;
  name: string;
  icon: string | null;
  frequency: HabitFrequency;
  target_count: number;
  unit: string | null;
  active: boolean;
  created_at: ISO8601;
}
export interface HabitLogsRow {
  id: string;
  habit_id: string;
  student_id: string;
  logged_at: DateStr;
  count: number;
  notes: string | null;
  created_at: ISO8601;
}

// ---------- WOD ----------
export interface WodsRow {
  id: string;
  trainer_id: string;
  title: string;
  description: string | null;
  scheduled_for: DateStr;
  created_at: ISO8601;
}
export interface WodParticipantsRow {
  wod_id: string;
  student_id: string;
  result_time_seconds: number | null;
  result_rounds: number | null;
  result_notes: string | null;
  completed_at: ISO8601 | null;
}

// ---------- Lista de compras ----------
export interface ShoppingListsRow {
  id: string;
  student_id: string;
  trainer_id: string;
  diet_id: string | null;
  week_start: DateStr;
  generated_at: ISO8601;
}
export interface ShoppingListItemsRow {
  id: string;
  shopping_list_id: string;
  food_name: string;
  total_grams: number;
  category: string | null;
  checked: boolean;
  created_at: ISO8601;
}

// ---------- Push ----------
export interface PushSubscriptionsRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: ISO8601;
}

// ---------- Anamnese ----------
export interface AnamnesisRow {
  id: string;
  student_id: string;
  trainer_id: string | null;
  answers: Json;
  completed_at: ISO8601 | null;
  created_at: ISO8601;
}
export interface AnamnesisTemplatesRow {
  id: string;
  trainer_id: string;
  title: string;
  questions: Json;
  active: boolean;
  created_at: ISO8601;
}

// ---------- Convites ----------
export interface StudentInvitesRow {
  id: string;
  trainer_id: string;
  code: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  goal: string | null;
  notes: string | null;
  status: "pending" | "accepted" | "revoked";
  accepted_by: string | null;
  accepted_at: ISO8601 | null;
  expires_at: ISO8601 | null;
  created_at: ISO8601;
}

// ---------- Webhook dedup (MP/Evolution) ----------
export interface PaymentWebhookEventsRow {
  id: string;
  gateway: string;
  external_payment_id: string;
  event_type: string;
  payload: Json;
  processed_at: ISO8601 | null;
  created_at: ISO8601;
}

// ---------- Rate limit (substitui memória → escala em cluster) ----------
export interface RateLimitAttemptsRow {
  id: string;
  key: string;
  ip: string | null;
  user_id: string | null;
  attempted_at: ISO8601;
}

// ============================================================
// Schema wrapper — formato esperado pelo supabase-js 2.x
// ============================================================

type Insertable<T> = Partial<T>;
type Updatable<T> = Partial<T>;

interface TableSchema<Row, Insert = Insertable<Row>, Update = Updatable<Row>> {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
}

interface PublicSchema {
  Tables: {
    profiles: TableSchema<ProfilesRow, { id: string; role?: UserRole; full_name: string }>;
    trainer_profiles: TableSchema<TrainerProfilesRow, { user_id: string }, Partial<TrainerProfilesRow>>;
    student_profiles: TableSchema<StudentProfilesRow, { user_id: string; trainer_id: string; full_name: string }>;
    exercises: TableSchema<ExercisesRow, { name: string; trainer_id?: string | null }>;
    workouts: TableSchema<WorkoutsRow, { trainer_id: string; title: string; student_id?: string | null; goal?: string | null }>;
    workout_days: TableSchema<WorkoutDaysRow, { workout_id: string; day_of_week: number; title?: string | null }>;
    workout_items: TableSchema<WorkoutItemsRow, { workout_day_id: string; exercise_id: string; position: number; sets: number; reps: string }>;
    workout_sessions: TableSchema<WorkoutSessionsRow, { workout_id: string; student_id: string; date: DateStr; status?: string }>;
    workout_recurrences: TableSchema<WorkoutRecurrencesRow, { workout_id: string; student_id: string; start_date: DateStr; recurrence?: RecurrenceType }>;
    foods: TableSchema<FoodsRow, { name: string }>;
    diet_templates: TableSchema<DietTemplatesRow, { title: string }>;
    diet_template_meals: TableSchema<DietTemplateMealsRow, { template_id: string; name: string }>;
    diet_template_items: TableSchema<DietTemplateItemsRow, { meal_id: string; food_name: string; grams: number }>;
    diets: TableSchema<DietsRow, { trainer_id: string; title: string; student_id?: string | null }>;
    meals: TableSchema<MealsRow, { diet_id: string; position: number; name: string; time?: TimeStr | null }>;
    meal_items: TableSchema<MealItemsRow, { meal_id: string; food_id: string; grams: number }>;
    measurements: TableSchema<MeasurementsRow, { student_id: string; date: DateStr }>;
    payments: TableSchema<PaymentsRow, { trainer_id: string; student_id: string; amount: number; due_date: DateStr; gateway?: "pix_direto" | "mercadopago" | "manual" }>;
    payment_templates: TableSchema<PaymentTemplatesRow, { trainer_id: string; name: string }>;
    payment_links: TableSchema<PaymentLinksRow, { trainer_id: string; description: string; amount_cents: number }>;
    payment_messages: TableSchema<PaymentMessagesRow, { trainer_id: string; resolved_text: string }>;
    trainer_settings: TableSchema<TrainerSettingsRow, { user_id: string }>;
    evolution_instances: TableSchema<EvolutionInstancesRow, { trainer_id: string; instance_name: string }>;
    evolution_templates: TableSchema<EvolutionTemplatesRow, { trainer_id: string; key: string; name: string; content: string }>;
    evolution_messages: TableSchema<EvolutionMessagesRow, { trainer_id: string; direction: string; type: string }>;
    evolution_webhook_events: TableSchema<EvolutionWebhookEventsRow, { instance: string; event_type: string; payload_jsonb: Json }>;
    payment_webhook_events: TableSchema<PaymentWebhookEventsRow, { gateway: string; external_payment_id: string; event_type: string; payload: Json }>;
    rate_limit_attempts: TableSchema<RateLimitAttemptsRow, { key: string; attempted_at: ISO8601 }>;
    community_posts: TableSchema<CommunityPostsRow, { trainer_id: string; author_id: string; content: string; audience?: string }>;
    community_likes: TableSchema<CommunityLikesRow, { post_id: string; user_id: string }>;
    community_comments: TableSchema<CommunityCommentsRow, { post_id: string; author_id: string; content: string }>;
    badges: TableSchema<BadgesRow, { slug: string; name: string }>;
    student_badges: TableSchema<StudentBadgesRow, { student_id: string; badge_id: string }>;
    challenges: TableSchema<ChallengesRow, { trainer_id: string; title: string; starts_at: ISO8601; ends_at: ISO8601 }>;
    challenge_participants: TableSchema<ChallengeParticipantsRow, { challenge_id: string; student_id: string }>;
    audit_log: TableSchema<AuditLogRow, { user_id: string; resource_type: string; action: string }>;
    appointment_types: TableSchema<AppointmentTypesRow, { trainer_id: string; name: string }>;
    appointments: TableSchema<AppointmentsRow, { trainer_id: string; title: string; starts_at: ISO8601; ends_at: ISO8601 }>;
    trainer_availability: TableSchema<TrainerAvailabilityRow, { trainer_id: string; weekday: number; start_time: TimeStr; end_time: TimeStr }>;
    habits: TableSchema<HabitsRow, { trainer_id: string; student_id: string; name: string }>;
    habit_logs: TableSchema<HabitLogsRow, { habit_id: string; student_id: string }>;
    wods: TableSchema<WodsRow, { trainer_id: string; title: string; scheduled_for: DateStr }>;
    wod_participants: TableSchema<WodParticipantsRow, { wod_id: string; student_id: string }>;
    shopping_lists: TableSchema<ShoppingListsRow, { student_id: string; trainer_id: string; week_start: DateStr }>;
    shopping_list_items: TableSchema<ShoppingListItemsRow, { shopping_list_id: string; food_name: string }>;
    push_subscriptions: TableSchema<PushSubscriptionsRow, { user_id: string; endpoint: string; p256dh: string; auth: string }>;
    anamnesis: TableSchema<AnamnesisRow, { student_id: string; answers: Json }>;
    anamnesis_templates: TableSchema<AnamnesisTemplatesRow, { trainer_id: string; title: string; questions: Json }>;
    student_invites: TableSchema<StudentInvitesRow, { trainer_id: string; code: string; full_name: string }>;
  };
  Views: {
    student_invites_safe: TableSchema<StudentInvitesRow>;
    trainer_settings_safe: TableSchema<TrainerSettingsRow>;
  };
  Functions: {
    accept_invite: {
      Args: { invite_code: string };
      Returns: Json;
    };
  };
  Enums: {
    user_role: UserRole;
    plan_tier: PlanTier;
    student_status: StudentStatus;
    payment_status: PaymentStatus;
    evolution_instance_state: EvolutionInstanceState;
    billing_type: BillingType;
    appointment_status: AppointmentStatus;
    appointment_type: AppointmentType;
    habit_frequency: HabitFrequency;
    recurrence_type: RecurrenceType;
  };
  CompositeTypes: Record<string, never>;
}

export interface Database {
  public: PublicSchema;
}

// Helper de tipagem para query results: converte `never` em `Row` quando
// não há inferência automática (comum em joins complexos).
export type TableRow<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TableInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TableUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
