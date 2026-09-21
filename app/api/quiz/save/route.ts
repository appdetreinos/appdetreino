import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { safeLog } from "@/lib/log/safe";

// Schema enxuto: salvamos só as 4 respostas. Validamos client+server.
const QuizAnswerSchema = z.object({
  studentCount: z.number().int().min(0).max(10000).nullable(),
  experience: z.enum(["less_6m", "6m_2y", "2y_5y", "more_5y"]).nullable(),
  revenue: z.number().min(0).max(1_000_000).nullable(),
  struggle: z
    .enum(["cobranca", "treino_dieta", "adesao", "organizacao"])
    .nullable(),
});

const COOKIE_NAME = "quiz_answers";
const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = QuizAnswerSchema.safeParse(json);
  if (!parsed.success) {
    safeLog.warn("quiz.save: validation failed", { issues: parsed.error.issues });
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: JSON.stringify(parsed.data),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_WEEK_SECONDS,
  });

  return NextResponse.json({ ok: true });
}
