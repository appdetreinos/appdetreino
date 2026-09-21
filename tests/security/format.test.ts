import { describe, it, expect } from "vitest";
import { formatCents, formatBRL } from "@/lib/types/billing";

describe("formatCents", () => {
  it("converts real to cents without rounding errors", () => {
    expect(formatCents(59.9)).toBe(5990);
    expect(formatCents(119.0)).toBe(11900);
    expect(formatCents(159.9)).toBe(15990);
    expect(formatCents(0)).toBe(0);
  });

  it("rounds correctly", () => {
    // Impede trainer pagar R$ 59,89 (sonegaria 1 centavo)
    expect(formatCents(59.899)).toBe(5990);
    expect(formatCents(59.901)).toBe(5990);
  });
});

describe("formatBRL", () => {
  it("formats as BRL currency", () => {
    expect(formatBRL(59.9)).toContain("59,90");
    expect(formatBRL(0)).toContain("R$");
  });
});
