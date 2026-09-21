import { z } from "zod";

export const pixKeyTypeSchema = z.enum(["cpf", "cnpj", "email", "phone", "random"]);

export const paymentCreateSchema = z.object({
  student_id: z.string().uuid(),
  amount_cents: z.number().int().min(100, "Mínimo R$ 1,00").max(1_000_000_00, "Máximo R$ 1.000.000,00"),
  description: z.string().trim().min(2).max(200),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data YYYY-MM-DD"),
  payment_type: z.enum(["monthly", "single", "package"]).default("monthly"),
});

export const paymentUpdateSafeSchema = z.object({
  status: z.enum(["pending", "paid", "overdue", "cancelled"]).optional(),
  paid_at: z.string().optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  // Note: student_id, amount_cents, trainer_id NÃO podem ser alterados via trainer (Fase 10)
});

export const trainerSettingsSchema = z.object({
  pix_key: z.string().trim().max(120),
  pix_key_type: pixKeyTypeSchema,
  beneficiary_name: z.string().trim().max(120),
  message_template: z.string().trim().max(500).optional().nullable(),
});

export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
export type PaymentUpdateSafeInput = z.infer<typeof paymentUpdateSafeSchema>;
export type TrainerSettingsInput = z.infer<typeof trainerSettingsSchema>;
