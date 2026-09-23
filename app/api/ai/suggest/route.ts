import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";
import { safeLog } from "@/lib/log/safe";

const bodySchema = z
  .object({
    goal: z.string().min(2).max(120),
    level: z.enum(["beginner", "intermediate", "advanced"]),
    days: z.number().int().min(1).max(7),
  })
  .strict();

const LEVEL_PT = { beginner: "iniciante", intermediate: "intermediário", advanced: "avançado" } as const;

/**
 * POST /api/ai/suggest — prescrição facilitada com IA (plano Pro).
 * Sem OPENAI_API_KEY, retorna fallback honesto com divisão clássica.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const { data: me } = await auth.supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();
  const role = (me as { role?: string } | null)?.role;
  if (role !== "trainer" && role !== "admin") {
    return NextResponse.json({ ok: false, error: "Só profissional." }, { status: 403 });
  }

  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  const { goal, level, days } = body.data;

  // Biblioteca de exercícios do trainer (contexto real pra IA)
  const { data: exercises } = await auth.supabase
    .from("exercises")
    .select("name, muscle_group, equipment")
    .limit(60);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      ok: true,
      ai: false,
      suggestion: fallbackSuggestion(goal, level, days),
      note: "IA desligada (sem OPENAI_API_KEY). Divisão clássica aplicada.",
    });
  }

  const exList = ((exercises ?? []) as Array<{ name: string; muscle_group: string | null; equipment: string | null }>)
    .map((e) => `- ${e.name}${e.muscle_group ? ` (${e.muscle_group})` : ""}`)
    .join("\n");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content:
              "Você é um prescritor de treino experiente. Responda em português, direto e prático. Use SÓ exercícios da lista quando possível. Formato: para cada dia, título + 5-7 exercícios com séries x reps. Sem avisos genéricos.",
          },
          {
            role: "user",
            content: `Monta divisão de ${days}x/semana, objetivo ${goal}, nível ${LEVEL_PT[level]}.\nExercícios disponíveis:\n${exList || "(lista vazia — usa exercícios clássicos com peso livre e máquina)"}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      safeLog.warn("[ai] openai failed", { status: res.status });
      return NextResponse.json({
        ok: true,
        ai: false,
        suggestion: fallbackSuggestion(goal, level, days),
        note: "IA indisponível no momento. Divisão clássica aplicada.",
      });
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content?.trim() || fallbackSuggestion(goal, level, days);
    return NextResponse.json({ ok: true, ai: true, suggestion: text });
  } catch (e) {
    safeLog.error("[ai] unhandled", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({
      ok: true,
      ai: false,
      suggestion: fallbackSuggestion(goal, level, days),
      note: "Falha de conexão com IA. Divisão clássica aplicada.",
    });
  }
}

function fallbackSuggestion(goal: string, level: string, days: number): string {
  const splits: Record<number, string[]> = {
    1: ["Full Body"],
    2: ["Full Body A", "Full Body B"],
    3: ["Full Body A", "Upper", "Lower"],
    4: ["Upper A", "Lower A", "Upper B", "Lower B"],
    5: ["Push", "Pull", "Legs", "Upper", "Lower"],
    6: ["Push", "Pull", "Legs", "Push", "Pull", "Legs"],
    7: ["Push", "Pull", "Legs", "Descanso ativo", "Upper", "Lower", "Full Body"],
  };
  const plan = (splits[days] ?? splits[3]).map((d) => `Dia — ${d}: 6 exercícios, 3-4 séries x 8-12 reps`).join("\n");
  return `Objetivo: ${goal} · Nível: ${level}\n${plan}\n\nAjusta carga pra RPE 7-8 e progride 2,5% por semana.`;
}
