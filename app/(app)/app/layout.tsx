export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // REMOVIDO: Tudo. Sidebar, Providers, Auth.
  // Se isso abrir, o erro está nos componentes de Sidebar ou Providers.
  return (
    <div className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}
