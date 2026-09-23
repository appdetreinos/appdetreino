import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";
import { createClient } from "@/lib/supabase/server";
import { safeLog } from "@/lib/log/safe";

type Sb = Awaited<ReturnType<typeof createClient>>;

const createSchema = z
  .object({
    name: z.string().min(2).max(80),
    amount: z.number().min(1).max(100000),
    billing_type: z.enum(["PIX", "CREDIT_CARD", "BOLETO"]).optional(),
  })
  .strict();

async function requireTrainer(supabase: Sb, userId: string) {
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  const role = (me as { role?: string } | null)?.role;
  return role === "trainer" || role === "admin";
}

/**
 * GET — lista modelos de cobrança recorrente do trainer.
 * POST — cria modelo {name, amount, billing_type}.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;
  if (!(await requireTrainer(auth.supabase, auth.user.id))) {
    return NextResponse.json({ ok: false, error: "Só profissional." }, { status: 403 });
  }
  const { data, error } = await auth.supabase
    .from("payment_templates")
    .select("id, name, amount, cycle, billing_type")
    .eq("trainer_id", auth.user.id)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, templates: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;
  if (!(await requireTrainer(auth.supabase, auth.user.id))) {
    return NextResponse.json({ ok: false, error: "Só profissional." }, { status: 403 });
  }
  const body = await parseJsonBody(request, createSchema);
  if (!body.ok) return body.response;

  const { data, error } = await auth.supabase
    .from("payment_templates")
    .insert({
      trainer_id: auth.user.id,
      name: body.data.name.trim(),
      amount: body.data.amount,
      cycle: "monthly",
      billing_type: body.data.billing_type ?? "PIX",
    })
    .select("id, name, amount, cycle, billing_type")
    .single();

  if (error) {
    safeLog.error("[payment-templates] insert failed", error.message);
    return NextResponse.json({ ok: false, error: "Não deu pra salvar o modelo." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, template: data });
}
