/** Skeleton genérico root. Mostra em navegação inicial ou Suspense boundary. */
export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="size-12 rounded-full border-4 border-white/10 border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    </main>
  );
}
