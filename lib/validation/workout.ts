import { z } from "zod";
import { phoneSchema } from "./auth";

export const workoutItemSchema = z.object({
  exercise_id: z.string().uuid().optional().nullable(),
  custom_name: z.string().trim().max(120).optional().nullable(),
  sets: z.number().int().min(1).max(20),
  reps: z.string().trim().min(1).max(20),
  load_kg: z.number().nonnegative().max(1000).optional().nullable(),
  rest_seconds: z.number().int().min(0).max(900).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const workoutDaySchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  title: z.string().trim().max(80).optional().nullable(),
  items: z.array(workoutItemSchema).max(50),
});

export const workoutSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  goal: z.enum(["strength", "hypertrophy", "endurance", "weight_loss", "recomposition"]).optional(),
  student_id: z.string().uuid().optional().nullable(),
  days: z.array(workoutDaySchema).max(7).optional(),
});

export type WorkoutItemInput = z.infer<typeof workoutItemSchema>;
export type WorkoutDayInput = z.infer<typeof workoutDaySchema>;
export type WorkoutInput = z.infer<typeof workoutSchema>;
