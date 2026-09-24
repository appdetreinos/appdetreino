import { redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Logo } from "../../_components/logo";
import { ArrowRight, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function InvitePage({ params }: PageProps) {
  const { code } = await params;
  const normalizedCode = code.toUpperCase();

  const supabase = await createClient();

  // 1. Verificamos se o convite é válido primeiro (independente de quem está acessando)
  const { data: invite, error } = await supabase
    .from("student_invites_safe")
    .select("id, full_name, code, status, trainer_id, expires_at")
    .eq("code", normalizedCode)
    .maybeSingle();

  if (error || !invite) {
    return (
      <Shell>
        <Card className="bg-card/80 border-white/10 p-8 text-center max-w-md">
          <h1 className="text-xl font-bold">Convite não encontrado</h1>
          <p className="mt-2 text-sm text-foreground/65">
            Esse código não existe ou está incorreto. Confira o link enviado pelo seu personal.
          </p>
        </Card>
      </Shell>
    );
  }

  if (invite.status === "accepted") {
    return (
      <Shell>
        <Card className="bg-card/80 border-white/10 p-8 text-center max-w-md">
          <h1 className="text-xl font-bold">Convite já utilizado</h1>
          <p className="mt-2 text-sm text-foreground/65">
            Este convite já foi aceito. Se você é o aluno,{" "}
            <Link href="/login" className="text-primary hover:underline">
              faça login aqui
            </Link>
            .
          </p>
        </Card>
      </Shell>
    );
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return (
      <Shell>
        <Card className="bg-card/80 border-white/10 p-8 text-center max-w-md">
          <h1 className="text-xl font-bold">Convite expirado</h1>
          <p className="mt-2 text-sm text-foreground/65">
            Este convite expirou. Por favor, solicite um novo link ao seu personal.
          </p>
        </Card>
      </Shell>
    );
  }

  // Busca o nome do trainer para personalizar a mensagem
  const { data: trainerProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", invite.trainer_id)
    .maybeSingle();

  const trainerName = trainerProfile?.full_name?.split(" ")[0] ?? "seu personal";

  // 2. Agora verificamos a sessão do usuário
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Se já está logado, mandamos para a página de aceite de aluno
    redirect(`/aluno?invite=${normalizedCode}`);
  }

  // 3. Fluxo Principal: Não logado -> Página de Cadastro com o código do convite
  const registerUrl = `/register?role=student&invite=${normalizedCode}`;

  return (
    <Shell>
      <Card className="bg-card/80 border-white/10 p-8 max-w-md w-full">
        <div className="text-center">
          <div className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary mx-auto">
            <UserPlus className="size-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Treinar com {trainerName}?</h1>
          <p className="mt-2 text-foreground/65 text-sm">
            <strong className="text-foreground">{invite.full_name}</strong>, seu personal te convidou para entrar no painel de treinos.
          </p>
        </div>
        <Link
          href={registerUrl}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Criar minha conta e entrar
          <ArrowRight className="size-4" />
        </Link>
        <p className="mt-4 text-xs text-foreground/50 text-center">
          Já possui uma conta?{" "}
          <Link href={`/login?redirect=/aluno?invite=${normalizedCode}`} className="text-primary hover:underline">
            Faça login
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
