import { z } from "zod";

/**
 * Respostas do questionário landing. Persistidas em cookie httpOnly
 * (`quiz_answers`) durante o funil, lidas pelo server component da página
 * `/app/questionario/resultado` para calcular o plano recomendado sem
 * precisar de autenticação ou URL poluída.
 */
export const QuizAnswerSchema = z.object({
  studentCount: z.number().int().min(0).max(10000).nullable(),
  experience: z
    .enum(["less_6m", "6m_2y", "2y_5y", "more_5y"])
    .nullable(),
  revenue: z.number().min(0).max(1_000_000).nullable(),
  struggle: z
    .enum(["cobranca", "treino_dieta", "adesao", "organizacao"])
    .nullable(),
});

export type QuizAnswers = z.infer<typeof QuizAnswerSchema>;
