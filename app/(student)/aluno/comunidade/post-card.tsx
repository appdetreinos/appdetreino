"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Heart, MessageCircle } from "lucide-react";
import { safeLog } from "@/lib/log/safe";

type PostCardProps = {
  postId: string;
  authorName: string;
  content: string;
  createdAt: string;
  initialLikes: number;
  initialLiked: boolean;
  initialComments: number;
};

export function PostCard({
  postId,
  authorName,
  content,
  createdAt,
  initialLikes,
  initialLiked,
  initialComments,
}: PostCardProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(initialLiked);
  const [pending, startTransition] = useTransition();

  function toggleLike() {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikes((n) => n + (nextLiked ? 1 : -1));
    startTransition(async () => {
      try {
        const res = await fetch(`/api/community/${postId}/like`, {
          method: nextLiked ? "POST" : "DELETE",
        });
        if (!res.ok) {
          setLiked(!nextLiked);
          setLikes((n) => n + (nextLiked ? -1 : 1));
          safeLog.warn("[community] like toggle failed", { status: res.status });
        }
      } catch (e) {
        setLiked(!nextLiked);
        setLikes((n) => n + (nextLiked ? -1 : 1));
        safeLog.error("[community] like error", e instanceof Error ? e.message : "unknown");
      }
    });
  }

  return (
    <Card className="bg-card border-white/5 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="size-10 rounded-full bg-primary/10 text-primary grid place-items-center text-sm font-bold">
          {authorName.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{authorName}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(createdAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>

      <p className="text-sm whitespace-pre-line">{content}</p>

      <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-4 text-sm">
        <button
          type="button"
          onClick={toggleLike}
          disabled={pending}
          className={`flex items-center gap-1.5 transition-colors ${
            liked ? "text-rose-500" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Heart className={`size-4 ${liked ? "fill-current" : ""}`} />
          <span>{likes}</span>
        </button>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <MessageCircle className="size-4" />
          <span>{initialComments}</span>
        </span>
      </div>
    </Card>
  );
}
