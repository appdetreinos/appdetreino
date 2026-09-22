import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, ArrowUpRight, UserPlus, CheckCircle2, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DeleteInviteButton } from "./delete-invite-button";

/**
 * Lista de alunos do trainer.
 * Mostra:
 *  - Convites pendentes (aluno ainda não aceitou) com código + link WhatsApp
 *  - Alunos ativos (já aceitaram convite)
 */

export default async function StudentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Convites do trainer
  const { data: invitesRaw } = await supabase
    .from("student_invites")
    .select("id, code, full_name, phone, goal, status, created_at, accepted_at")
    .eq("trainer_id", user.id)
    .order("created_at", { ascending: false });

  // Alunos já vinculados
  const { data: studentsRaw } = await supabase
    .from("student_profiles")
    .select("user_id, full_name, status, goal, joined_at, phone")
    .eq("trainer_id", user.id)
    .order("joined_at", { ascending: false });

  const invites = invitesRaw ?? [];
  const students = studentsRaw ?? [];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Alunos</h1>
            <p className="text-xs text-foreground/65">
              {students.length} ativo{students.length === 1 ? "" : "s"} ·{" "}
              {invites.filter((i) => i.status === "pending").length} convite
              {invites.filter((i) => i.status === "pending").length === 1 ? "" : "s"} pendente
              {invites.filter((i) => i.status === "pending").length === 1 ? "" : "s"}
            </p>
          </div>
          <ButtonLink href="/app/students/new" className="font-semibold">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Novo aluno</span>
          </ButtonLink>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto space-y-6">
        {students.length === 0 && invites.length === 0 ? (
          <EmptyStudents />
        ) : (
          <>
            {invites.length > 0 && (
              <Card className="bg-card/80 border-white/10 p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Clock className="size-5 text-primary" />
                  Convites pendentes
                </h2>
                <div className="divide-y divide-white/5">
                  {invites.map((inv) => (
                    <div
                      key={inv.id}
                      className="py-3.5 first:pt-0 last:pb-0 flex items-center gap-4"
                    >
                      <Avatar className="size-10 border border-white/10">
                        <AvatarFallback className="bg-primary/15 text-primary font-bold">
                          {inv.full_name?.[0]?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{inv.full_name}</div>
                        <div className="text-sm text-foreground/65 truncate">
                          {inv.status === "accepted" ? (
                            <>
                              <CheckCircle2 className="inline size-3.5 text-emerald-500" /> Aceito em{" "}
                              {new Date(inv.accepted_at!).toLocaleDateString("pt-BR")}
                            </>
                          ) : (
                            <>
                              Código{" "}
                              <code className="px-1.5 py-0.5 rounded bg-background text-foreground">
                                {inv.code}
                              </code>
                              {" · "}
                              <a
                                href={`${appUrl}/invite/${inv.code}`}
                                className="text-primary hover:underline"
                                target="_blank"
                              >
                                link de convite
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          inv.status === "accepted"
                            ? "border-emerald-500/30 text-emerald-500"
                            : "border-white/10 text-foreground/65"
                        }
                      >
                        {inv.status === "accepted" ? "Aceito" : "Aguardando"}
                      </Badge>
                      {inv.status !== "accepted" && <DeleteInviteButton inviteId={inv.id} />}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {students.length > 0 && (
              <Card className="bg-card/80 border-white/10 p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-emerald-500" />
                  Alunos ativos
                </h2>
                <div className="divide-y divide-white/5">
                  {students.map((s) => (
                    <Link
                      key={s.user_id}
                      href={`/app/students/${s.user_id}`}
                      className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0 hover:opacity-80 transition-opacity"
                    >
                      <Avatar className="size-10 border border-white/10">
                        <AvatarFallback className="bg-primary/15 text-primary font-bold">
                          {s.full_name?.[0]?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{s.full_name}</div>
                        <div className="text-sm text-foreground/65 truncate">
                          {s.goal || "Sem objetivo definido"}
                          {s.phone ? ` · ${formatPhone(s.phone)}` : ""}
                        </div>
                      </div>
                      <ArrowUpRight className="size-4 text-foreground/60 shrink-0" />
                    </Link>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function EmptyStudents() {
  return (
    <Card className="bg-card/80 border-white/10 p-12 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary mx-auto">
        <UserPlus className="size-7" />
      </div>
      <h2 className="mt-4 text-xl font-bold">Adiciona teu primeiro aluno aqui 👇</h2>
      <p className="mt-2 text-sm text-foreground/65 max-w-md mx-auto">
        Cria um aluno, manda o link de convite no WhatsApp e ele entra no painel sozinho.
      </p>
      <ButtonLink href="/app/students/new" className="mt-6 font-semibold">
        <Plus className="size-4" />
        Novo aluno
      </ButtonLink>
    </Card>
  );
}

function formatPhone(p: string): string {
  // 11999998888 → (11) 99999-8888
  const digits = p.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return p;
}
