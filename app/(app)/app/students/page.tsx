import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, ArrowUpRight, UserPlus, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DeleteInviteButton } from "./delete-invite-button";
import { ClaimStudentForm } from "./claim-student-form";

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

  // Convites pendentes (só pending aparecem aqui).
  // Aceitos somem daqui e aparecem em "Alunos ativos" via student_profiles.
  const { data: invitesRaw } = await supabase
    .from("student_invites")
    .select("id, code, full_name, phone, goal, status, created_at, accepted_at, accepted_by")
    .eq("trainer_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  // Convites aceitos sem perfil criado (órfãos) — pra mostrar o ClaimStudentForm
  const { data: acceptedOrphans } = await supabase
    .from("student_invites")
    .select("id, accepted_by")
    .eq("trainer_id", user.id)
    .eq("status", "accepted");

  // Alunos já vinculados
  const { data: studentsRaw, error: studentsError } = await supabase
    .from("student_profiles")
    .select("user_id, full_name, status, goal, joined_at, phone")
    .eq("trainer_id", user.id)
    .order("joined_at", { ascending: false });

  if (studentsError) {
    console.error("Erro ao buscar alunos:", studentsError);
  }

  const invites = invitesRaw ?? [];
  const students = studentsRaw ?? [];
  const acceptedList = acceptedOrphans ?? [];
  const acceptedIds = new Set(acceptedList.map((a) => a.accepted_by).filter(Boolean));
  const studentIds = new Set(students.map((s) => s.user_id));
  const hasOrphanAccepted = acceptedList.some((a) => a.accepted_by && !studentIds.has(a.accepted_by as string));

  // Convites "stale": pending há mais de 3 dias (aluno provavelmente
  // cadastrou com email diferente ou esqueceu). Marca visual diferente.
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const stalePendingIds = new Set(
    invites
      .filter((i) => i.status === "pending" && new Date(i.created_at).getTime() < threeDaysAgo)
      .map((i) => i.id),
  );

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
            </p>
          </div>
          <ButtonLink href="/app/students/new" className="font-semibold">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Novo aluno</span>
          </ButtonLink>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Card "vincular manualmente" — aparece quando tem convite pending
            OU quando tem convite aceito mas o vínculo em student_profiles
            não foi criado (órfão). */}
        {(invites.filter((i) => i.status === "pending").length > 0 ||
          (hasOrphanAccepted && students.length === 0)) && (
          <ClaimStudentForm />
        )}

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
                  {invites.map((inv) => {
                    const isStale = stalePendingIds.has(inv.id);
                    return (
                      <div
                        key={inv.id}
                        className="py-3.5 first:pt-0 last:pb-0 flex items-center gap-4"
                      >
                        <Avatar className="size-10 border border-white/10">
                          <AvatarFallback
                            className={`font-bold ${
                              isStale
                                ? "bg-amber-500/15 text-amber-500"
                                : "bg-primary/15 text-primary"
                            }`}
                          >
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
                            ) : isStale ? (
                              <>
                                <span className="text-amber-500">
                                  Criado há mais de 3 dias
                                </span>
                                {" · "}
                                <a
                                  href={`${appUrl}/invite/${inv.code}`}
                                  className="text-primary hover:underline"
                                  target="_blank"
                                >
                                  reenviar link
                                </a>
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
                              : isStale
                                ? "border-amber-500/30 text-amber-500"
                                : "border-white/10 text-foreground/65"
                          }
                        >
                          {inv.status === "accepted"
                            ? "Aceito"
                            : isStale
                              ? "Parado"
                              : "Aguardando"}
                        </Badge>
                        {inv.status !== "accepted" && <DeleteInviteButton inviteId={inv.id} />}
                      </div>
                    );
                  })}
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
