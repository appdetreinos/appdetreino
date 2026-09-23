import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { safeLog } from "@/lib/log/safe";

const rowSchema = z.object({
  full_name: z.string().min(2).max(120),
  email: z.string().email().max(200).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  goal: z.string().max(200).nullable().optional(),
});

const bodySchema = z.object({ rows: z.array(rowSchema).min(1).max(200) }).strict();

/**
 * POST /api/trainer/import-students
 * Migração Prime: cola a lista de alunos (CSV) e cria todos os
 * convites de uma vez. O code é gerado pelo trigger 0007.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const { data: me } = await auth.supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (me?.role !== "trainer" && me?.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Só profissional." }, { status: 403 });
  }

  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;

  const admin = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let created = 0;
  const errors: string[] = [];

  for (const r of body.data.rows) {
    const { error } = await admin.from("student_invites").insert({
      trainer_id: auth.user.id,
      code: null,
      full_name: r.full_name.trim(),
      email: r.email?.trim() || null,
      phone: r.phone?.trim() || null,
      goal: r.goal?.trim() || null,
      status: "pending",
    });
    if (error) {
      safeLog.warn("[import-students] row failed", error.message);
      errors.push(`${r.full_name}: ${error.message}`);
    } else {
      created++;
    }
  }

  return NextResponse.json({ ok: true, created, failed: errors.length, errors: errors.slice(0, 10) });
}
