import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTrainerScopeIds } from "@/lib/supabase/scope";
import { notFound } from "next/navigation";
import { DirectThread } from "@/components/direct-thread";

type Props = { params: Promise<{ id: string }> };

/** Conversa 1:1 do trainer com o aluno. */
export default async function StudentChatPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: sp } = await supabase
    .from("student_profiles")
    .select("user_id, trainer_id, full_name")
    .eq("user_id", id)
    .in("trainer_id", await getTrainerScopeIds(supabase, user.id))
    .maybeSingle();

  if (!sp) notFound();
  const row = sp as { user_id: string; trainer_id: string; full_name: string };

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center gap-3">
          <Link href={`/app/students/${id}`} className="text-foreground/70 hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Conversa</h1>
            <p className="text-xs text-foreground/65">{row.full_name}</p>
          </div>
        </div>
      </header>
      <main className="p-6 max-w-2xl mx-auto">
        <DirectThread
          trainerId={row.trainer_id}
          studentId={row.user_id}
          emptyHint="Começa a conversa — feedback direto pro aluno."
        />
      </main>
    </div>
  );
}
