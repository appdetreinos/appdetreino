import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10 bg-background text-foreground">
      <Card className="bg-card/80 border-white/10 p-8 max-w-md w-full text-center space-y-4">
        <div className="font-extrabold tracking-tight">
          <span className="text-7xl">4</span>
          <span className="text-primary">0</span>
          <span className="text-7xl">4</span>
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">Página não encontrada</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            O endereço que você abriu não existe ou foi movido.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <ButtonLink href="/" variant="outline" size="sm">
            Voltar ao início
          </ButtonLink>
          <ButtonLink href="/app" size="sm">
            Ir para o painel
          </ButtonLink>
        </div>
      </Card>
    </main>
  );
}
