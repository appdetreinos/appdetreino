import { NextResponse, type NextRequest } from "next/server";
import { requireAuthenticated } from "@/lib/security/guards";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { evoFetch } from "@/lib/evolution/client";

/**
 * GET /api/evolution/status — estado da conexão (open/close/connecting).
 * Sincroniza evolution_instances.state com a Evolution.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const { data: inst } = await auth.supabase
    .from("evolution_instances")
    .select("instance_name, state")
    .eq("trainer_id", auth.user.id)
    .maybeSingle();

  if (!inst) return NextResponse.json({ ok: true, state: "disconnected", instance: null });

  const row = inst as { instance_name: string; state: string };
  const remote = await evoFetch<{ instance?: { state?: string } }>(
    `/instance/connectionState/${row.instance_name}`,
  );
  const state = remote.data?.instance?.state ?? row.state;

  if (state !== row.state) {
    const admin = createSbClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    await admin
      .from("evolution_instances")
      .update({ state, last_seen_at: new Date().toISOString() })
      .eq("trainer_id", auth.user.id);
  }

  return NextResponse.json({ ok: true, state, instance: row.instance_name });
}

/**
 * POST /api/evolution/status {action: "disconnect"}
 * Desconecta e apaga a instância.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const { data: inst } = await auth.supabase
    .from("evolution_instances")
    .select("instance_name")
    .eq("trainer_id", auth.user.id)
    .maybeSingle();
  if (!inst) return NextResponse.json({ ok: true, state: "disconnected" });

  const row = inst as { instance_name: string };
  await evoFetch(`/instance/delete/${row.instance_name}`, { method: "DELETE" }).catch(() => null);

  const admin = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  await admin.from("evolution_instances").delete().eq("trainer_id", auth.user.id);

  return NextResponse.json({ ok: true, state: "disconnected" });
}
