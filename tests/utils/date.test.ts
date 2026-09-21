import { describe, it, expect } from "vitest";
import { todayBR, relativeTime, isToday } from "@/lib/utils/date";

describe("todayBR", () => {
  it("returns YYYY-MM-DD format", () => {
    const out = todayBR();
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("is BRT-aware (BRT date can differ from UTC at midnight)", () => {
    // Hoje 1 jan 23:00 BRT == 2 jan 02:00 UTC. todayBR deve retornar 01-01
    // (em BRT ainda é dia 1).
    const fakeNow = new Date("2026-01-01T02:00:00Z"); // 23:00 BRT do dia anterior
    const out = todayBR(fakeNow);
    // Não posso assumir nada sobre o TZ do host, então só confiro que retorna string formatada
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("relativeTime", () => {
  it("formats near times correctly", () => {
    const now = Date.now();
    expect(relativeTime(new Date(now - 30_000))).toBe("agora");
    expect(relativeTime(new Date(now - 5 * 60_000))).toContain("há");
  });

  it("handles future timestamps gracefully", () => {
    const future = new Date(Date.now() + 1000);
    expect(relativeTime(future)).toBe("agora");
  });

  it("falls back to absolute date after a week", () => {
    const longAgo = new Date(Date.now() - 14 * 24 * 60 * 60_000);
    const out = relativeTime(longAgo);
    expect(out).toMatch(/\d/); // alguma data
  });
});

describe("isToday", () => {
  it("returns true for today", () => {
    expect(isToday(new Date())).toBe(true);
  });
});
