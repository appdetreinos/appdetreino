import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";
import { safeLog } from "@/lib/log/safe";

/**
 * POST /api/me/diets
 *
 * Trainer cria uma dieta (template OU atribuída) com N refeições e N itens.
 * Pra MVP: usa food_id = NULL em meal_items, criando foods on-demand pelo nome.
 */
const mealItemSchema = z.object({
  food_name: z.string().min(1).max(120),
  grams: z.number().int().min(0).max(5000),
  position: z.number().int().min(0),
});

const mealSchema = z.object({
  name: z.string().min(1).max(120),
  time: z.string().nullable().optional(),
  position: z.number().int().min(0),
  items: z.array(mealItemSchema).min(1).max(30),
});

const bodySchema = z
  .object({
    title: z.string().min(1).max(120),
    goal: z.string().max(80).nullable().optional(),
    kcal_target: z.number().int().min(0).max(20000).nullable().optional(),
    p_target: z.number().int().min(0).max(1000).nullable().optional(),
    c_target: z.number().int().min(0).max(2000).nullable().optional(),
    g_target: z.number().int().min(0).max(1000).nullable().optional(),
    student_id: z.string().uuid().nullable().optional(),
    meals: z.array(mealSchema).min(1).max(15),
  })
  .strict();

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  // Se atribuiu aluno, confirma que é do trainer logado
  if (body.data.student_id) {
    const { data: sp } = await auth.supabase
      .from("student_profiles")
      .select("trainer_id")
      .eq("user_id", body.data.student_id)
      .maybeSingle();
    if (!sp || sp.trainer_id !== auth.user.id) {
      return NextResponse.json(
        { ok: false, error: "Aluno não pertence a esse trainer." },
        { status: 403 },
      );
    }
  }

  // 1. Cria diet
  const { data: diet, error: dietError } = await auth.supabase
    .from("diets")
    .insert({
      trainer_id: auth.user.id,
      student_id: body.data.student_id ?? null,
      title: body.data.title,
      goal: body.data.goal ?? null,
      kcal_target: body.data.kcal_target ?? null,
      p_target: body.data.p_target ?? null,
      c_target: body.data.c_target ?? null,
      g_target: body.data.g_target ?? null,
    })
    .select("id")
    .single();

  if (dietError || !diet) {
    safeLog.error("[diets] insert failed", dietError?.message);
    return NextResponse.json(
      { ok: false, error: dietError?.message ?? "Erro ao criar dieta" },
      { status: 500 },
    );
  }

  // 2. Cria meals + items. Pra food_id, busca/cria por nome via RPC
  for (const meal of body.data.meals) {
    const { data: createdMeal, error: mealError } = await auth.supabase
      .from("meals")
      .insert({
        diet_id: diet.id,
        name: meal.name,
        time: meal.time ?? null,
        position: meal.position,
      })
      .select("id")
      .single();

    if (mealError || !createdMeal) {
      safeLog.error("[diets] meal insert failed", mealError?.message);
      continue;
    }

    // Pra cada item, busca/cria food_id e insere meal_item
    const itemRows: { meal_id: string; food_id: string; grams: number; position: number }[] = [];
    for (const it of meal.items) {
      const { data: foodId } = await auth.supabase.rpc("get_or_create_food", {
        p_name: it.food_name,
      });
      if (!foodId) continue;
      itemRows.push({
        meal_id: createdMeal.id,
        food_id: foodId as string,
        grams: it.grams,
        position: it.position,
      });
    }
    if (itemRows.length > 0) {
      const { error: itemsError } = await auth.supabase.from("meal_items").insert(itemRows);
      if (itemsError) {
        safeLog.error("[diets] meal_items insert failed", itemsError.message);
      }
    }
  }

  return NextResponse.json({ ok: true, id: diet.id });
}
