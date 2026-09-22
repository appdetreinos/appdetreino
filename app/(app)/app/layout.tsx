export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // LIMPEZA ATÔMICA: Sem Providers, sem Sidebars, sem nada.
  return (
    <div className="bg-black text-white min-h-screen">
      {children}
    </div>
  );
}
