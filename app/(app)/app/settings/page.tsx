import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import { PixSettingsForm } from "./pix-settings-form";
import { ProfileForm } from "./profile-form";
import { LgpdActions } from "./lgpd-actions";
import Link from "next/link";
import { PLANS } from "@/lib/types/billing";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, cref")
    .eq("id", user.id)
    .single();

  const { data: trainer } = await supabase
    .from("trainer_profiles")
    .select("plan_tier, trial_ends_at")
    .eq("user_id", user.id)
    .single();

  const { data: settings } = await supabase
    .from("trainer_settings")
    .select("pix_key, pix_key_type, pix_beneficiary_name, default_charge_message, default_overdue_message")
    .eq("user_id", user.id)
    .maybeSingle();

  const currentPlan = PLANS.find((p) => p.id === trainer?.plan_tier) ?? PLANS[0];

  // Status do trial: pending, active, expired, none
  const trialEnd = trainer?.trial_ends_at ? new Date(trainer.trial_ends_at) : null;
  const isInTrial = trialEnd ? trialEnd > new Date() : false;
  const trialDaysLeft = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold">Configurações</h1>
          <LogoutButton />
        </div>
      </header>

      <main className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Perfil */}
        <ProfileForm fullName={profile?.full_name ?? ""} phone={profile?.phone ?? ""} cref={profile?.cref ?? ""} />

        {/* Cobrança — chave Pix + templates de mensagem */}
        <Card id="cobranca" className="bg-card/80 border-white/10 p-6">
          <h2 className="text-lg font-bold flex items-center gap-2">💸 Cobrança</h2>
          <p className="mt-1 text-sm text-foreground/65">
            O app <strong className="text-foreground">não</strong> intermedia pagamento. Você cadastra
            tua chave Pix e a gente dispara a mensagem no WhatsApp pra você.
          </p>
          <PixSettingsForm
            initial={{
              pix_key: settings?.pix_key ?? "",
              pix_key_type: (settings?.pix_key_type ?? "cpf") as
                | "cpf"
                | "cnpj"
                | "email"
                | "phone"
                | "random",
              pix_beneficiary_name: settings?.pix_beneficiary_name ?? "",
              default_charge_message: settings?.default_charge_message ?? "",
              default_overdue_message: settings?.default_overdue_message ?? "",
            }}
          />
        </Card>

        {/* Plano — com lógica de trial separada */}
        <Card className="bg-card/80 border-white/10 p-6">
          <h2 className="text-lg font-bold">Plano</h2>
          <div
            className={`mt-4 rounded-xl border p-4 flex items-center justify-between ${
              isInTrial
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-primary/30 bg-primary/10"
            }`}
          >
            <div>
              <div className="font-extrabold capitalize">
                {isInTrial
                  ? `🎁 Trial grátis · ${trialDaysLeft} dia${trialDaysLeft === 1 ? "" : "s"} restante${trialDaysLeft === 1 ? "" : "s"}`
                  : `${currentPlan.name} · R$ ${currentPlan.priceMonthly.toFixed(2).replace(".", ",")}/mês`}
              </div>
              <div className="text-xs text-foreground/65">
                {isInTrial
                  ? `Você tem até ${trialEnd?.toLocaleDateString("pt-BR")} pra explorar tudo. Sem cartão, sem cobrança.`
                  : `${currentPlan.studentLimit ? `${currentPlan.studentLimit} alunos ativos` : "Alunos ilimitados"}`}
              </div>
            </div>
            <Link
              href="/app/settings/upgrade"
              className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                isInTrial
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border border-white/10 bg-background/60 hover:border-primary/40"
              }`}
            >
              {isInTrial ? "Escolher plano" : "Upgrade"}
            </Link>
          </div>
        </Card>

        {/* Conta */}
        <Card className="bg-card/80 border-white/10 p-6">
          <h2 className="text-lg font-bold">Conta</h2>
          <p className="mt-1 text-sm text-foreground/65">{user.email}</p>
          <LogoutButton />
        </Card>

        {/* LGPD */}
        <LgpdActions />
      </main>
    </div>
  );
}
