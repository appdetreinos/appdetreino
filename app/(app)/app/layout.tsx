import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TrialBanner } from "./_components/trial-banner";
import { TrialGate } from "./_components/trial-gate";
import { OnboardingWizard } from "./_components/onboarding-wizard";
import { createClient } from "@/lib/supabase/server";
import { getTrainerTrialState } from "@/lib/billing/trial";

/**
 * Layout do trainer: sidebar + trial banner + onboarding wizard.
 *
 * - Role guard: aluno vai pra /aluno, admin pra /admin.
 * - TrialBanner aparece enquanto daysLeft > 0 (server, sem JS).
 * - OnboardingWizard abre quando onboarding_completed_at é null.
 * - Lockout total (redirect) acontece no dashboard (/app); aqui não
 *   bloqueamos pra não prender checkout/upgrade em loop.
 */
export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile as { role?: string } | null)?.role;
  if (role === "student") redirect("/aluno");
  if (role === "admin") redirect("/admin");

  let daysLeft = 0;
  let showOnboarding = false;
  let trialLocked = false;
  try {
    const [trial, trainer] = await Promise.all([
      getTrainerTrialState(user.id),
      supabase
        .from("trainer_profiles")
        .select("onboarding_completed_at")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    daysLeft = trial.daysLeft;
    // Sem linha de trainer (conta em criação) não trava — o wizard resolve
    trialLocked = trial.locked && trainer.data != null;
    showOnboarding =
      (trainer.data as { onboarding_completed_at?: string | null } | null)
        ?.onboarding_completed_at == null;
  } catch {
    // Layout nunca quebra por causa de trial/onboarding
  }

  return (
    <SidebarProvider>
      <AppSidebar role="trainer" />
      <SidebarInset className="bg-background">
        {daysLeft > 0 && <TrialBanner daysLeft={daysLeft} />}
        <TrialGate locked={trialLocked} />
        {showOnboarding && <OnboardingWizard />}
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
