import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import webpush from "web-push";
import { requireAuthenticated, parseJsonBody } from "@/lib/security/guards";
import { safeLog } from "@/lib/log/safe";

const sendSchema = z
  .object({
    title: z.string().min(2).max(80),
    body: z.string().min(2).max(200),
    url: z.string().max(200).optional(),
  })
  .strict();

function vapidConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT,
  );
}

/**
 * POST /api/push/send {title, body, url?}
 * Trainer dispara aviso pra TODOS os alunos ativos.
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

  const body = await parseJsonBody(request, sendSchema);
  if (!body.ok) return body.response;

  if (!vapidConfigured()) {
    return NextResponse.json({ ok: false, error: "push_not_configured" }, { status: 503 });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );

  const { data: students } = await auth.supabase
    .from("student_profiles")
    .select("user_id")
    .eq("trainer_id", auth.user.id)
    .eq("status", "active");

  const ids = (students ?? []).map((s) => s.user_id as string);
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, targets: 0 });
  }

  const { data: subs } = await auth.supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", ids);

  const payload = JSON.stringify({
    title: body.data.title,
    body: body.data.body,
    url: body.data.url ?? "/aluno",
  });

  let sent = 0;
  for (const s of (subs ?? []) as Array<{ endpoint: string; p256dh: string; auth: string }>) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      );
      sent++;
    } catch (e) {
      safeLog.warn("[push] send failed, pruning?", e instanceof Error ? e.message : "unknown");
      // Endpoint morto (410/404): remove pra não tentar de novo
      const msg = e instanceof Error ? e.message : "";
      if (/410|404/.test(msg)) {
        await auth.supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }
  }

  return NextResponse.json({ ok: true, sent, targets: ids.length });
}
