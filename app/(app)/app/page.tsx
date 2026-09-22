import { createClient } from "@/lib/supabase/server";

/**
 * VERSÃO DE DIAGNÓSTICO (2026-09-22).
 *
 * /app estava crashando com ref: 3162866030 mesmo após todos os fixes
 * aplicados. Esta versão MINIMAL tem zero imports pesados, zero
 * componentes client, zero JSX complexo — só HTML estático + log do
 * estado do user. Se isto carregar, o problema é em algum componente
 * client que essa rota usa (DashboardEntrance, OnboardingChecklist etc).
 *
 * Se ESTA versão também crashar com a MESMA ref, o problema é
 * provavelmente:
 *   - Cache de CDN da Vercel servindo build antigo
 *   - Layout.tsx (SidebarProvider) crashando
 *   - Proxy.ts / auth
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TrainerDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date().toISOString();
  const buildTag = "DIAG-MIN-2026-09-22T13:30";

  if (!user) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        <h1>Sem user (build: {buildTag})</h1>
        <p>timestamp: {now}</p>
      </div>
    );
  }

  // Pegar 1 query mínima pra confirmar que servidor funciona
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>✅ Funciona! (build: {buildTag})</h1>
      <p>
        <strong>User:</strong> {user.email}
      </p>
      <p>
        <strong>Profile:</strong> {JSON.stringify(profile)}
      </p>
      <p>
        <strong>Timestamp:</strong> {now}
      </p>
      <hr style={{ margin: "24px 0", opacity: 0.2 }} />
      <p style={{ color: "#888" }}>
        Se você está vendo esta página, o problema está em algum componente
        client específico (DashboardEntrance, OnboardingChecklist, motion, etc).
      </p>
    </div>
  );
}
