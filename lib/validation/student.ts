import { z } from "zod";
import { phoneSchema } from "./auth";

export const studentInviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(254),
  phone: phoneSchema,
  full_name: z.string().trim().min(2).max(120),
  notes: z.string().trim().max(500).optional().nullable(),
  plan_tier: z.enum(["basic", "pro", "elite"]).default("basic"),
});

export const studentProfileUpdateSchema = z.object({
  full_name: z.string().trim().min(2).max(120).optional(),
  phone: phoneSchema,
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data YYYY-MM-DD").optional().nullable(),
  goals: z.string().trim().max(500).optional().nullable(),
  status: z.enum(["active", "paused", "cancelled"]).optional(),
});

export const measurementSchema = z.object({
  weight_kg: z.number().nonnegative().max(500).optional().nullable(),
  body_fat_pct: z.number().nonnegative().max(100).optional().nullable(),
  chest_cm: z.number().nonnegative().max(300).optional().nullable(),
  waist_cm: z.number().nonnegative().max(300).optional().nullable(),
  hip_cm: z.number().nonnegative().max(300).optional().nullable(),
  arm_cm: z.number().nonnegative().max(100).optional().nullable(),
  thigh_cm: z.number().nonnegative().max(150).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type StudentInviteInput = z.infer<typeof studentInviteSchema>;
export type StudentProfileUpdateInput = z.infer<typeof studentProfileUpdateSchema>;
export type MeasurementInput = z.infer<typeof measurementSchema>;
