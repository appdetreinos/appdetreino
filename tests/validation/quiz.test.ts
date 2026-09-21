import { describe, it, expect } from "vitest";
import { QuizAnswerSchema } from "@/lib/validation/quiz";

describe("QuizAnswerSchema", () => {
  it("accepts valid answer set", () => {
    const result = QuizAnswerSchema.safeParse({
      studentCount: 12,
      experience: "6m_2y",
      revenue: 8000,
      struggle: "cobranca",
    });
    expect(result.success).toBe(true);
  });

  it("accepts nulls (start of quiz)", () => {
    const result = QuizAnswerSchema.safeParse({
      studentCount: null,
      experience: null,
      revenue: null,
      struggle: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid experience enum", () => {
    const result = QuizAnswerSchema.safeParse({
      studentCount: 1,
      experience: "WRONG",
      revenue: null,
      struggle: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects revenue over 1M", () => {
    const result = QuizAnswerSchema.safeParse({
      studentCount: 1,
      experience: null,
      revenue: 100_000_000,
      struggle: null,
    });
    expect(result.success).toBe(false);
  });
});
