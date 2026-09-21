import { z } from "zod";

/**
 * Schemas Zod compartilhados entre client (form) e server (API route).
 *
 * Single source of truth: se mudar aqui, valida em todo lugar.
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "E-mail muito longo")
  .email("E-mail inválido");

/** Senha forte: 8+ chars, pelo menos 1 número. */
export const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .max(128, "Senha muito longa")
  .regex(/\d/, "Precisa ter pelo menos 1 número");

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{7,14}$/, "Telefone inválido (formato E.164: +5511999998888)")
  .optional()
  .or(z.literal(""));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Senha obrigatória").max(128),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  full_name: z.string().trim().min(2, "Nome muito curto").max(120),
  role: z.enum(["trainer", "student"]),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
