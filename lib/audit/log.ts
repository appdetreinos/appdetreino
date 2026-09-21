/**
 * Audit log helper — centraliza inserções em audit_log.
 *
 * Uso:
 *   import { auditLog } from "@/lib/audit/log";
 *   await auditLog({
 *     userId: user.id,
 *     action: "pix_key_changed",
 *     resourceType: "trainer_settings",
 *     resourceId: user.id,
 *     metadata: { key_type: "cpf" }
 *   });
 *
 * Segurança:
 *   - Nunca aceitar PII cru em metadata (use hash ou mascarado).
 *   - Logs falham silenciosamente (não quebram fluxo principal).
 */

import { createClient } from "@/lib/supabase/server";

export type AuditAction =
  | "login_success"
  | "login_failed"
  | "logout"
  | "signup"
  | "invite_created"
  | "invite_accepted"
  | "student_deleted"
  | "workout_created"
  | "workout_updated"
  | "workout_deleted"
  | "diet_created"
  | "pix_key_changed"
  | "payment_created"
  | "payment_marked_paid"
  | "webhook_mp"
  | "webhook_evolution"
  | "rate_limit_exceeded"
  | "data_export"
  | "account_deletion_requested"
  | "forgot_password_requested"
  | "cron_reminders_run";

export interface AuditEvent {
  userId: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

/** Mascara um telefone deixando só DDI + DDD + últimos 2 dígitos. */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `****${digits.slice(-2)}`;
}

/** Mascara chave Pix deixando só últimos 4. */
export function maskPixKey(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.length <= 4) return "****";
  return `****${key.slice(-4)}`;
}

export async function auditLog(event: AuditEvent): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("audit_log").insert({
      user_id: event.userId,
      action: event.action,
      resource_type: event.resourceType,
      resource_id: event.resourceId ?? null,
      metadata: event.metadata ?? {},
      ip: event.ip ?? null,
      user_agent: event.userAgent ?? null,
    });
  } catch (err) {
    // Audit log nunca deve quebrar o fluxo principal
    console.error("[audit] failed to log event", event.action, err);
  }
}
