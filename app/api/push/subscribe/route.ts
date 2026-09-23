import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";

const subSchema = z
  .object({
    endpoint: z.string().url().max(1000),
    p256dh: z.string().min(10).max(300),
    auth: z.string().min(10).max(300),
  })
  .strict();

/**
 * POST /api/push/subscribe — aluno (ou trainer) ativa notificações.
 * Idempotente por endpoint.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticated(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, subSchema);
  if (!body.ok) return body.response;

  const ua = request.headers.get("user-agent")?.slice(0, 200) ?? null;

  const { error } = await auth.supabase.from("push_subscriptions").upsert(
    {
      user_id: auth.user.id,
      endpoint: body.data.endpoint,
      p256dh: body.data.p256dh,
      auth: body.data.auth,
      user_agent: ua,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
