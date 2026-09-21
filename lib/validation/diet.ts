import { z } from "zod";

export const mealItemSchema = z.object({
  food_id: z.string().uuid().optional().nullable(),
  custom_name: z.string().trim().max(120).optional().nullable(),
  grams: z.number().nonnegative().max(5000),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const mealSchema = z.object({
  name: z.string().trim().min(1).max(80),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário HH:MM").optional().nullable(),
  items: z.array(mealItemSchema).max(30),
});

export const dietSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  kcal_target: z.number().int().min(800).max(6000).optional().nullable(),
  protein_g: z.number().int().min(0).max(500).optional().nullable(),
  carbs_g: z.number().int().min(0).max(800).optional().nullable(),
  fat_g: z.number().int().min(0).max(300).optional().nullable(),
  student_id: z.string().uuid().optional().nullable(),
  meals: z.array(mealSchema).max(10).optional(),
});

export type MealItemInput = z.infer<typeof mealItemSchema>;
export type MealInput = z.infer<typeof mealSchema>;
export type DietInput = z.infer<typeof dietSchema>;
