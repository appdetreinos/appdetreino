import { createClient } from "@/lib/supabase/server";
import { getTrainerScopeIds } from "@/lib/supabase/scope";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { PostComposer } from "./post-composer";
import { PushSender } from "./push-sender";
import { Heart, MessageCircle, Plus, Trophy, Flame } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/ui/stagger";

export default async function CommunityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Posts do trainer
  const { data: posts } = await supabase
    .from("community_posts")
    .select(
      `id, content, audience, pinned, created_at,
       likes:community_likes(count),
       comments:community_comments(count)`,
    )
    .in("trainer_id", await getTrainerScopeIds(supabase, user.id))
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30);

  type Post = {
    id: string;
    content: string;
    audience: string;
    pinned: boolean;
    created_at: string;
    likes: { count: number }[] | null;
    comments: { count: number }[] | null;
  };

  // Push configurado?
  const pushConfigured = Boolean(
    process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
  );

  const list = ((posts ?? []) as Post[]).map((p) => ({
    id: p.id,
    content: p.content,
    audience: p.audience,
    pinned: p.pinned,
    createdAt: p.created_at,
    likes: (p.likes ?? []).reduce((acc, x) => acc + (x.count ?? 0), 0),
    comments: (p.comments ?? []).reduce((acc, x) => acc + (x.count ?? 0), 0),
  }));

  // Desafios do trainer
  const { data: challenges } = await supabase
    .from("challenges")
    .select("id, title, description, ends_at, reward_xp")
    .in("trainer_id", await getTrainerScopeIds(supabase, user.id))
    .order("created_at", { ascending: false })
    .limit(5);

  // Top 5 alunos por XP (best-effort)
  const { data: topStudents } = await supabase
    .from("student_profiles")
    .select("user_id, full_name, xp_total")
    .in("trainer_id", await getTrainerScopeIds(supabase, user.id))
    .order("xp_total", { ascending: false })
    .limit(5);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Comunidade</h1>
          <p className="text-sm text-muted-foreground">
            {list.length} post{list.length === 1 ? "" : "s"} publicados
          </p>
        </div>
        <ButtonLink href="/app/community/challenges/new" variant="outline">
          <Plus className="size-4" />
          Novo desafio
        </ButtonLink>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Feed + composer */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-card border-white/5 p-5">
            <h2 className="font-semibold mb-3">Novo post</h2>
            <PostComposer />
          </Card>

          {list.length === 0 ? (
            <Card className="bg-card border-dashed border-white/10 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Você ainda não publicou. Comece agora.
              </p>
            </Card>
          ) : (
            <Stagger className="space-y-4" delay={0.05}>
              {list.map((p) => (
                <StaggerItem key={p.id}>
                  <Card className="bg-card border-white/5 p-5 hover:border-primary/30 transition-colors">
                    {p.pinned && (
                      <div className="text-xs text-primary font-semibold mb-2 flex items-center gap-1">
                        <Flame className="size-3" />
                        Fixado
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-line">{p.content}</p>
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 hover:text-primary transition-colors cursor-default">
                        <Heart className="size-3.5" />
                        {p.likes}
                      </span>
                      <span className="flex items-center gap-1 hover:text-primary transition-colors cursor-default">
                        <MessageCircle className="size-3.5" />
                        {p.comments}
                      </span>
                      <span className="ml-auto">
                        {new Date(p.createdAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {p.audience}
                      </Badge>
                    </div>
                  </Card>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <PushSender configured={pushConfigured} />
          {/* Desafios */}
          <Card className="bg-card border-white/5 p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Trophy className="size-4 text-orange-500" />
              Desafios
            </h2>
            {(!challenges || challenges.length === 0) ? (
              <p className="text-sm text-muted-foreground">Nenhum desafio.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {challenges.map((c) => (
                  <li key={c.id} className="border-b border-white/5 last:border-0 pb-2 last:pb-0">
                    <div className="font-medium">{c.title}</div>
                    {c.reward_xp ? (
                      <div className="text-xs text-muted-foreground">
                        +{c.reward_xp} XP · até{" "}
                        {new Date(c.ends_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Ranking */}
          <Card className="bg-card border-white/5 p-5">
            <h2 className="font-semibold mb-3">Top alunos</h2>
            {(!topStudents || topStudents.length === 0) ? (
              <p className="text-sm text-muted-foreground">Sem ranking ainda.</p>
            ) : (
              <ol className="space-y-2 text-sm">
                {topStudents.map((s, i) => (
                  <li key={s.user_id} className="flex items-center gap-2">
                    <span className="font-mono font-bold w-5 text-muted-foreground">
                      {i + 1}º
                    </span>
                    <span className="flex-1 truncate">{s.full_name}</span>
                    <span className="font-mono text-xs text-primary">
                      {(s.xp_total ?? 0).toLocaleString("pt-BR")} XP
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
