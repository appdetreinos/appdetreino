import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";
import { safeLog } from "@/lib/log/safe";

const bodySchema = z.object({ diet_id: z.string().uuid() }).strict();

/** Segunda-feira da semana atual (YYYY-MM-DD). */
function weekStartMonday(): string {
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dow + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

/**
 * POST /api/trainer/shopping-generate {diet_id}
 * Gera a lista de compras da semana a partir da dieta do aluno
 * (soma os itens × 7 dias). Idempotente na semana: regenera.
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

  const { data: diet } = await auth.supabase
    .from("diets")
    .select(
      `id, student_id, trainer_id,
       meals:meals(id, meal_items(id, grams, foods:food_id(name)))`,
    )
    .eq("id", body.data.diet_id)
    .maybeSingle();

  const d = diet as {
    id: string;
    student_id: string | null;
    trainer_id: string;
    meals: Array<{
      id: string;
      meal_items: Array<{
        id: string;
        grams: number;
        foods: { name: string } | { name: string }[] | null;
      }> | null;
    }> | null;
  } | null;

  if (!d || !d.student_id) {
    return NextResponse.json({ ok: false, error: "Dieta não encontrada ou sem aluno." }, { status: 404 });
  }

  // Agrega por alimento (× 7 dias)
  const totals = new Map<string, number>();
  for (const meal of d.meals ?? []) {
    for (const it of meal.meal_items ?? []) {
      const food = Array.isArray(it.foods) ? it.foods[0] : it.foods;
      const name = food?.name ?? "Alimento";
      totals.set(name, (totals.get(name) ?? 0) + (it.grams ?? 0) * 7);
    }
  }
  if (totals.size === 0) {
    return NextResponse.json({ ok: false, error: "Dieta sem alimentos." }, { status: 400 });
  }

  const weekStart = weekStartMonday();

  // Lista da semana (reutiliza se já existe)
  const { data: existing } = await auth.supabase
    .from("shopping_lists")
    .select("id")
    .eq("student_id", d.student_id)
    .eq("week_start", weekStart)
    .maybeSingle();

  let listId = (existing as { id: string } | null)?.id;
  if (!listId) {
    const { data: created, error } = await auth.supabase
      .from("shopping_lists")
      .insert({
        student_id: d.student_id,
        trainer_id: d.trainer_id,
        diet_id: d.id,
        week_start: weekStart,
      })
      .select("id")
      .single();
    if (error || !created) {
      safeLog.error("[shopping-generate] list failed", error?.message ?? "unknown");
      return NextResponse.json({ ok: false, error: "Não deu pra criar a lista." }, { status: 500 });
    }
    listId = (created as { id: string }).id;
  } else {
    // Regenera: limpa itens antigos
    await auth.supabase.from("shopping_list_items").delete().eq("shopping_list_id", listId);
    await auth.supabase.from("shopping_lists").update({ diet_id: d.id }).eq("id", listId);
  }

  const { error: itemsErr } = await auth.supabase.from("shopping_list_items").insert(
    Array.from(totals.entries()).map(([food_name, total_grams]) => ({
      shopping_list_id: listId as string,
      food_name,
      total_grams: Math.round(total_grams),
      checked: false,
    })),
  );
  if (itemsErr) {
    safeLog.error("[shopping-generate] items failed", itemsErr.message);
    return NextResponse.json({ ok: false, error: "Não deu pra gerar os itens." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, items: totals.size, week_start: weekStart });
}
