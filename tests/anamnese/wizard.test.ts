import { describe, it, expect } from "vitest";

// Espelha a constante WIZARD_THRESHOLD em page.tsx — se mudar lá, mude aqui
// também. Mantida como teste de regressão: ≥ 4 perguntas => wizard.
const WIZARD_THRESHOLD = 4;

function shouldUseWizard(questionCount: number): boolean {
  return Math.max(0, questionCount) >= WIZARD_THRESHOLD;
}

describe("anamnese wizard threshold", () => {
  it("usa form contínuo para templates curtos", () => {
    expect(shouldUseWizard(0)).toBe(false);
    expect(shouldUseWizard(1)).toBe(false);
    expect(shouldUseWizard(3)).toBe(false);
  });

  it("usa wizard para templates longos", () => {
    expect(shouldUseWizard(4)).toBe(true);
    expect(shouldUseWizard(8)).toBe(true);
    expect(shouldUseWizard(20)).toBe(true);
  });
});
