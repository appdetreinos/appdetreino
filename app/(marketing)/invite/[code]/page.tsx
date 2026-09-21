import { redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Logo } from "../../_components/logo";
import { ArrowRight, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ code: string }>;
}

/**
 * Página pública `/invite/[code]`.
 *
 * Mostra o convite do trainer (nome da academia/trainer + aluno que será criado)
 * e oferece o botão "Aceitar e entrar" → leva pro /register com params
 * pré-preenchidos (signUp com role='student' → trigger cria profile → após
 * signup, o cliente chama RPC accept_invite).
 */
export default async function InvitePage({ params }: PageProps) {
  const { code } = await params;
  const normalizedCode = code.toUpperCase();

  const supabase = await createClient();

  // Se já tá logado, vai direto pro /aluno (o cliente cuida do accept)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Lê o invite (RLS permite SELECT público)
  const { data: invite, error } = await supabase
    .from("student_invites")
    .select("id, full_name, code, status, trainer_id")
    .eq("code", normalizedCode)
    .maybeSingle();

  // Busca nome do trainer (profile via trainer_id)
  const { data: trainerProfile } = invite
    ? await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", invite.trainer_id)
        .maybeSingle()
    : { data: null };

  if (error || !invite) {
    return (
      <Shell>
        <Card className="bg-card/80 border-white/10 p-8 text-center max-w-md">
          <h1 className="text-xl font-bold">Convite não encontrado</h1>
          <p className="mt-2 text-sm text-foreground/65">
            Esse código não existe, expirou ou já foi usado. Pede um novo convite pro teu personal.
          </p>
        </Card>
      </Shell>
    );
  }

  if (invite.status === "accepted") {
    return (
      <Shell>
        <Card className="bg-card/80 border-white/10 p-8 text-center max-w-md">
          <h1 className="text-xl font-bold">Convite já usado</h1>
          <p className="mt-2 text-sm text-foreground/65">
            Esse convite já foi aceito. Se você já tem conta,{" "}
            <Link href="/login" className="text-primary hover:underline">
              entra aqui
            </Link>
            .
          </p>
        </Card>
      </Shell>
    );
  }

  const trainerName = trainerProfile?.full_name ?? "seu personal";

  if (user) {
    // Logado: redireciona pra /aluno e o cliente mostra botão "Aceitar convite"
    redirect(`/aluno?invite=${normalizedCode}`);
  }

  // Não logado: leva pro register com query string do convite
  const registerUrl = `/register?role=student&invite=${normalizedCode}`;

  return (
    <Shell>
      <Card className="bg-card/80 border-white/10 p-8 max-w-md w-full">
        <div className="text-center">
          <div className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary mx-auto">
            <UserPlus className="size-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Bora treinar com {trainerName.split(" ")[0]}?</h1>
          <p className="mt-2 text-foreground/65 text-sm">
            <strong className="text-foreground">{invite.full_name}</strong>, seu personal te
            convocou pro painel dele. Clica abaixo pra aceitar e entrar.
          </p>
        </div>
        <Link
          href={registerUrl}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Aceitar e entrar
          <ArrowRight className="size-4" />
        </Link>
        <p className="mt-4 text-xs text-foreground/50 text-center">
          Já tem conta?{" "}
          <Link href={`/login?redirect=/aluno?invite=${normalizedCode}`} className="text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </Card>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/10 bg-background/85 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 h-16 flex items-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Logo />
          </Link>
        </div>
      </header>
      <main className="flex-1 grid place-items-center px-5 py-10">{children}</main>
    </div>
  );
}
