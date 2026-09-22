import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowUpRight, UserPlus } from "lucide-react";

interface FocusItem {
  id: string;
  nome: string;
  letra: string;
  oque: string;
  quando: string;
}

interface RecentItem {
  nome: string;
  letra: string;
  oque: string;
  quando: string;
}

interface Props {
  focus: { pergunta: string; itens: FocusItem[] };
  recentes: RecentItem[];
  totalAlunos: number;
  temAluno: boolean;
}

/**
 * Componente que recebe dados reais do Supabase (server-fetched em
 * page.tsx) e renderiza com animações de entrada via CSS (delay inline).
 *
 * Migrado de motion/react → CSS keyframes (motion v13.4.0 quebra com
 * Next 16 + React 19).
 */
export function DashboardEntrance({ focus, recentes, totalAlunos, temAluno }: Props) {
  return (
    <>
      {/* 1) Foco do dia — pergunta + lista de alunos OU empty-state */}
      <div
        className="animate-fade-in-up"
        style={{ animationDelay: "100ms", animationFillMode: "both" }}
      >
        <Card className="bg-card/80 border-white/10 p-6">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-lg font-bold">{focus.pergunta}</h2>
            {temAluno && (
              <Link
                href="/app/students"
                className="text-xs text-foreground/65 hover:text-foreground inline-flex items-center gap-1 transition-colors"
              >
                ver todos <ArrowUpRight className="size-3" />
              </Link>
            )}
          </div>

          {temAluno ? (
            <div className="divide-y divide-white/5">
              {focus.itens.map((p, i) => (
                <div
                  key={p.id}
                  className="animate-fade-in-up"
                  style={{
                    animationDelay: `${200 + i * 80}ms`,
                    animationFillMode: "both",
                  }}
                >
                  <Link
                    href="/app/students"
                    className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0 hover:opacity-80 transition-opacity"
                  >
                    <Avatar className="size-10 border border-white/10">
                      <AvatarFallback className="bg-primary/15 text-primary font-bold">
                        {p.letra}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{p.nome}</div>
                      <div className="text-sm text-foreground/65 truncate">{p.oque}</div>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-white/10 text-foreground/75 shrink-0"
                    >
                      {p.quando}
                    </Badge>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyFocus />
          )}
        </Card>
      </div>

      {/* 2) Atividade recente — mesma estrutura */}
      <div
        className="animate-fade-in-up"
        style={{ animationDelay: "450ms", animationFillMode: "both" }}
      >
        <Card className="bg-card/80 border-white/10 p-6">
          <h2 className="text-lg font-bold mb-4">O que seus alunos fizeram</h2>
          {recentes.length > 0 ? (
            <div className="divide-y divide-white/5">
              {recentes.map((r, i) => (
                <div
                  key={`${r.nome}-${i}`}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 animate-fade-in-up"
                  style={{
                    animationDelay: `${550 + i * 80}ms`,
                    animationFillMode: "both",
                  }}
                >
                  <Avatar className="size-9 border border-white/10">
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-bold">
                      {r.letra}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{r.nome}</span>
                    <span className="text-foreground/70"> · {r.oque}</span>
                  </div>
                  <span className="text-xs text-foreground/60 shrink-0">{r.quando}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-foreground/65">
              Nenhuma atividade ainda. Quando teu primeiro aluno concluir um treino, aparece aqui.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}

function EmptyFocus() {
  return (
    <div className="flex flex-col items-center text-center py-8 px-4">
      <div className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
        <UserPlus className="size-7" />
      </div>
      <h3 className="mt-4 font-bold text-base">Adiciona teu primeiro aluno aqui 👇</h3>
      <p className="mt-1.5 text-sm text-foreground/65 max-w-md">
        Cria um aluno, manda o link de convite no WhatsApp e ele entra no painel sozinho.
      </p>
      <ButtonLink href="/app/students/new" className="mt-5 font-semibold">
        <UserPlus className="size-4" />
        Novo aluno
      </ButtonLink>
    </div>
  );
}
