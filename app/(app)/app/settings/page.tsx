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

        {/* Plano */}
        <Card className="bg-card/80 border-white/10 p-6">
          <h2 className="text-lg font-bold">Plano</h2>
          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/10 p-4 flex items-center justify-between">
            <div>
              <div className="font-extrabold capitalize">{currentPlan.name} · R$ {currentPlan.priceMonthly.toFixed(2).replace(".", ",")}/mês</div>
              <div className="text-xs text-foreground/65">
                {currentPlan.studentLimit
                  ? `${currentPlan.studentLimit} alunos ativos`
                  : "Alunos ilimitados"}
                {trainer?.trial_ends_at
                  ? ` · trial até ${new Date(trainer.trial_ends_at).toLocaleDateString("pt-BR")}`
                  : ""}
              </div>
            </div>
            <Link
              href="/app/settings/upgrade"
              className="inline-flex items-center justify-center rounded-md border border-white/10 bg-background/60 px-3 py-1.5 text-sm font-semibold hover:border-primary/40 transition-colors"
            >
              Upgrade
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
