import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import { PixSettingsForm } from "./pix-settings-form";
import { ProfileForm } from "./profile-form";
import { LgpdActions } from "./lgpd-actions";
import { PwaInstallButton } from "@/components/pwa-install";

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

  const { data: settings } = await supabase
    .from("trainer_settings")
    .select("pix_key, pix_key_type, pix_beneficiary_name, default_charge_message, default_overdue_message")
    .eq("user_id", user.id)
    .maybeSingle();

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

        {/* Conta */}
        <Card className="bg-card/80 border-white/10 p-6">
          <h2 className="text-lg font-bold">Conta</h2>
          <p className="mt-1 text-sm text-foreground/65">{user.email}</p>
          <div className="mt-3">
            <PwaInstallButton />
          </div>
          <div className="mt-3">
            <LogoutButton />
          </div>
        </Card>

        {/* LGPD */}
        <LgpdActions />
      </main>
    </div>
  );
}
