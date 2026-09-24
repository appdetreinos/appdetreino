import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTrainerScopeIds } from "@/lib/supabase/scope";

/**
 * Caixa de entrada: todas as conversas 1:1 com não-lidas primeiro.
 * Acaba com o caça-aluno-por-aluno pra responder.
 */
export default async function InboxPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const scopeIds = await getTrainerScopeIds(supabase, user.id);

  const { data: messages } = await supabase
    .from("direct_messages")
    .select("student_id, sender_id, text, created_at, read_at")
    .in("trainer_id", scopeIds)
    .order("created_at", { ascending: false })
    .limit(200);

  type Msg = {
    student_id: string;
    sender_id: string;
    text: string;
    created_at: string;
    read_at: string | null;
  };

  const threads = new Map<
    string,
    { last: Msg; unread: number }
  >();
  for (const m of ((messages ?? []) as Msg[])) {
    const t = threads.get(m.student_id);
    if (!t) {
      threads.set(m.student_id, {
        last: m,
        unread: m.sender_id !== user.id && !m.read_at ? 1 : 0,
      });
    } else if (m.sender_id !== user.id && !m.read_at) {
      t.unread++;
    }
  }

  const ids = Array.from(threads.keys());
  let names = new Map<string, string>();
  if (ids.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    names = new Map(
      ((profiles ?? []) as Array<{ id: string; full_name: string }>).map((p) => [
        p.id,
        p.full_name ?? "Aluno",
      ]),
    );
  }

  const list = Array.from(threads.entries()).map(([student_id, t]) => ({
    student_id,
    name: names.get(student_id) ?? "Aluno",
    last: t.last,
    unread: t.unread,
  }));

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-4 sm:px-6 h-14 sm:h-16 flex items-center gap-3">
          <h1 className="text-lg sm:text-xl font-bold">Mensagens</h1>
          {list.reduce((s, c) => s + c.unread, 0) > 0 && (
            <Badge className="bg-primary text-primary-foreground">
              {list.reduce((s, c) => s + c.unread, 0)} novas
            </Badge>
          )}
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-3xl mx-auto">
        {list.length === 0 ? (
          <Card className="bg-card/80 border-dashed border-white/10 p-10 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground mx-auto">
              <MessageSquare className="size-6" />
            </div>
            <h3 className="mt-4 font-semibold">Nenhuma conversa ainda</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Quando um aluno te chamar, aparece aqui.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {list.map((c) => (
              <Link
                key={c.student_id}
                href={`/app/students/${c.student_id}/mensagens`}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-card p-3.5 hover:border-primary/40 transition-colors"
              >
                <Avatar className="size-10 border border-white/10 shrink-0">
                  <AvatarFallback className="bg-primary/15 text-primary font-bold">
                    {c.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{c.name}</span>
                    {c.unread > 0 && (
                      <Badge className="bg-primary text-primary-foreground shrink-0">
                        {c.unread}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{c.last.text}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(c.last.created_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
                <ArrowUpRight className="size-4 text-foreground/40 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
