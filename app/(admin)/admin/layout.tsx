import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Shield } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin");

  // Garante que é admin (role = 'admin' em profiles)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    // 404 fake — não revela que /admin existe
    redirect("/app");
  }

  return (
    <div className="min-h-svh flex flex-col">
      <header className="border-b border-white/5">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link href="/admin/trainers" className="font-extrabold flex items-center gap-2">
            <Shield className="size-4 text-rose-500" />
            Admin · Viva FIT
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin/trainers" className="hover:text-primary">
              Trainers
            </Link>
            <Link href="/admin/metrics" className="hover:text-primary">
              Métricas
            </Link>
            <Link href="/app" className="text-muted-foreground hover:text-foreground">
              ← App
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
