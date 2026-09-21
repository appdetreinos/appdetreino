"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  variant?: "sidebar" | "ghost";
  label?: string;
}

/**
 * Botão de logout unificado — chama signOut() e manda pra /login.
 * Renderiza como item de sidebar (variant="sidebar") ou como botão simples.
 */
export function LogoutButton({ className, variant = "sidebar", label = "Sair" }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (variant === "ghost") {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-card transition-colors",
        )}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <LogOut className="size-4" />
        )}
        <span>{label}</span>
      </button>
    );
  }

  // variant="sidebar" — combina com o SidebarMenuItem do shadcn
  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={cn(
        "flex w-full items-center gap-2 rounded-md p-2 text-sm text-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
        className,
      )}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <LogOut className="size-4" />
      )}
      <span>{label}</span>
    </button>
  );
}
