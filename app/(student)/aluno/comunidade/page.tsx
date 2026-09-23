import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { PostCard } from "./post-card";
import { ChallengeJoin } from "./challenge-join";
import { Trophy, Award, Users } from "lucide-react";

export default async function ComunidadeAlunoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Posts da audiência "students" do trainer do aluno
  const { data: posts } = await supabase
    .from("community_posts")
    .select(
      `id, content, created_at, audience, pinned,
       author:author_id(full_name),
       likes:community_likes(count),
       comments:community_comments(count)`,
    )
    .eq("audience", "students")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30);

  // Posts que o aluno curtiu
  const { data: myLikes } = await supabase
    .from("community_likes")
    .select("post_id")
    .eq("user_id", user.id);
  const likedSet = new Set((myLikes ?? []).map((l) => l.post_id));

  type Post = {
    id: string;
    content: string;
    created_at: string;
    audience: string;
    pinned: boolean;
    author: { full_name: string } | { full_name: string }[] | null;
    likes: { count: number }[] | null;
    comments: { count: number }[] | null;
  };

  const list = ((posts ?? []) as Post[]).map((p) => {
    const author = Array.isArray(p.author) ? p.author[0] : p.author;
    const likeCount = (p.likes ?? []).reduce((acc, x) => acc + (x.count ?? 0), 0);
    const commentCount = (p.comments ?? []).reduce((acc, x) => acc + (x.count ?? 0), 0);
    return {
      id: p.id,
      content: p.content,
      createdAt: p.created_at,
      authorName: author?.full_name ?? "Personal",
      likes: likeCount,
      liked: likedSet.has(p.id),
      comments: commentCount,
      pinned: p.pinned,
    };
  });

  // Desafio ativo
  const now = new Date().toISOString();
  const { data: challenge } = await supabase
    .from("challenges")
    .select("id, title, description, ends_at, reward_xp")
    .lte("starts_at", now)
    .gte("ends_at", now)
    .limit(1)
    .maybeSingle();

  // Minha participação + total de participantes
  const ch = challenge as { id: string } | null;
  const [{ data: myPart }, { count: partCount }] = ch
    ? await Promise.all([
        supabase
          .from("challenge_participants")
          .select("progress")
          .eq("challenge_id", ch.id)
          .eq("student_id", user.id)
          .maybeSingle(),
        supabase
          .from("challenge_participants")
          .select("challenge_id", { count: "exact", head: true })
          .eq("challenge_id", ch.id),
      ])
    : [{ data: null }, { count: 0 }];

  // Badges do aluno
  const { data: myBadges } = await supabase
    .from("student_badges")
    .select(
      `earned_at,
       badge:badge_id(slug, name, description, icon_url)`,
    )
    .eq("student_id", user.id)
    .order("earned_at", { ascending: false })
    .limit(8);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Comunidade</h1>
        <p className="text-sm text-muted-foreground">
          {list.length} post{list.length === 1 ? "" : "s"} da turma
        </p>
      </header>

      {/* Sidebar: desafio + badges */}
      <div className="grid sm:grid-cols-2 gap-3">
        {challenge && (
          <Card className="bg-gradient-to-br from-orange-500/10 to-rose-500/10 border-orange-500/30 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="size-4 text-orange-500" />
              <span className="text-xs uppercase tracking-wider font-semibold text-orange-500">
                Desafio ativo
              </span>
            </div>
            <h3 className="font-bold">{challenge.title}</h3>
            {challenge.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {challenge.description}
              </p>
            )}
            {challenge.reward_xp ? (
              <p className="text-xs mt-2">
                <span className="font-mono font-bold text-primary">
                  +{challenge.reward_xp} XP
                </span>
                {(partCount ?? 0) > 0 && (
                  <span className="text-muted-foreground"> · {partCount} participando</span>
                )}
              </p>
            ) : null}
            <ChallengeJoin
              challengeId={challenge.id}
              initialProgress={(myPart as { progress: number } | null)?.progress ?? null}
            />
          </Card>
        )}

        <Card className="bg-card border-white/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="size-4 text-amber-500" />
            <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
              Suas conquistas
            </span>
          </div>
          {(!myBadges || myBadges.length === 0) ? (
            <p className="text-xs text-muted-foreground">
              Continue treinando pra desbloquear suas primeiras badges.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {myBadges.map((b) => {
                const badge = Array.isArray(b.badge) ? b.badge[0] : b.badge;
                return (
                  <span
                    key={badge?.slug ?? Math.random()}
                    className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs px-2 py-1 rounded-full"
                  >
                    🏅 {badge?.name ?? "Badge"}
                  </span>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Feed */}
      <section>
        {list.length === 0 ? (
          <Card className="bg-card border-dashed border-white/10 p-8 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground mx-auto">
              <Users className="size-6" />
            </div>
            <h3 className="mt-4 font-semibold">Nenhum post ainda</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Seu personal ainda não publicou. Em breve você verá novidades aqui.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {list.map((p) => (
              <div key={p.id}>
                {p.pinned && (
                  <div className="text-xs text-primary font-semibold mb-1">
                    📌 Fixado
                  </div>
                )}
                <PostCard
                  postId={p.id}
                  authorName={p.authorName}
                  content={p.content}
                  createdAt={p.createdAt}
                  initialLikes={p.likes}
                  initialLiked={p.liked}
                  initialComments={p.comments}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
