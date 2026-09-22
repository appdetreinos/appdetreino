import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/server";
import { getTrainerTrialState } from "@/lib/billing/trial";
import { TrialBanner } from "./_components/trial-banner";

/**
 * Layout do app autenticado (trainer).
 *
 * Server component pra conseguir fazer:
 *  1. Lockout do trial (3 dias grátis): se expirou e trainer nunca pagou,
 *     redireciona pra /app/checkout.
 *  2. Banner de trial ativo acima do header (renderiza em qualquer /app/*).
 *
 * O <SidebarProvider>/<SidebarInset>/<AppSidebar> continuam client; este
 * layout passa o banner como wrapper (children) — client components aceitam
 * server-rendered children sem problema.
 */

// Rotas em que o lockout NÃO deve redirecionar (senão loop infinito, e o
// trainer precisa ver o checkout pra pagar e destravar).
const LOCKOUT_EXEMPT_PATHS = new Set([
  "/app/checkout",
  "/app/settings/upgrade",
  "/app/login",
]);

function isLockoutExempt(pathname: string): boolean {
  // Match exato OU prefixo com `/` (evita `/app/checkout-old`).
  if (LOCKOUT_EXEMPT_PATHS.has(pathname)) return true;
  for (const p of LOCKOUT_EXEMPT_PATHS) {
    if (pathname === p || pathname.startsWith(p + "/")) return true;
  }
  return false;
}

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const trial = await getTrainerTrialState(user.id);
    const hdrs = await headers();
    // `x-pathname` é setado pelo proxy.ts. Fallback vazio significa
    // "rota não identificada" — nesse caso, lockout por segurança (não
    // exime o redirect mesmo que seja checkout, mas se cair em /app/checkout
    // o proxy/setSecurityHeaders garante que ele aparece corretamente).
    const pathname = hdrs.get("x-pathname") ?? "";

    if (trial.locked && !isLockoutExempt(pathname)) {
      // Trial expirou sem pagamento → força checkout. O layout cobre QUALQUER
      // outra rota /app/* (workouts, diets, students…) sem duplicar checagem.
      redirect("/app/checkout?reason=trial_expired");
    }

    return (
      <SidebarProvider>
        <AppSidebar role="trainer" />
        <SidebarInset className="bg-background">
          {trial.inTrial && <TrialBanner daysLeft={trial.daysLeft} />}
          {children}
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // Sem user — deixa o children renderizar; o proxy.ts já redireciona pra /login.
  return (
    <SidebarProvider>
      <AppSidebar role="trainer" />
      <SidebarInset className="bg-background">{children}</SidebarInset>
    </SidebarProvider>
  );
}
