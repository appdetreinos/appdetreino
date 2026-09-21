import { describe, it, expect } from "vitest";
import { sanitizePhone, sanitizeText } from "@/lib/security/sanitize";

describe("sanitizePhone", () => {
  it("preserves digits, +, -, space, (, )", () => {
    expect(sanitizePhone("+55 (11) 91234-5678")).toBe("+55 (11) 91234-5678");
    expect(sanitizePhone("11912345678")).toBe("11912345678");
  });

  it("removes any character that could be PostgREST syntax", () => {
    // Vírgula, aspas, ponto, letras -> tudo removido; ficam só dígitos
    expect(sanitizePhone(`123",.eq.456`)).toBe("123456");
    // Aspas, espaço, letras -> só dígitos
    expect(sanitizePhone(`+55 (11) 9`)).toBe("+55 (11) 9");
  });

  it("truncates to 32 chars", () => {
    const huge = "1".repeat(100);
    expect(sanitizePhone(huge).length).toBeLessThanOrEqual(32);
  });

  it("returns empty string for null/undefined", () => {
    expect(sanitizePhone(null)).toBe("");
    expect(sanitizePhone(undefined)).toBe("");
    expect(sanitizePhone("")).toBe("");
  });
});

describe("sanitizeText", () => {
  it("trims and truncates", () => {
    expect(sanitizeText("  hello  ", 10)).toBe("hello");
    expect(sanitizeText("a".repeat(20), 5)).toBe("aaaaa");
  });

  it("returns empty string for null/undefined", () => {
    expect(sanitizeText(null)).toBe("");
    expect(sanitizeText(undefined)).toBe("");
  });
});
