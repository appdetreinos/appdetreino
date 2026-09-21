import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, CheckCircle2, QrCode } from "lucide-react";

export default function WhatsAppPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">WhatsApp</h1>
        <p className="text-sm text-muted-foreground">
          Conecta teu chip e deixa o Viva FIT APP disparar treino, dieta e cobrança por você.
        </p>
      </header>

      <Card className="bg-card border-white/5 p-6">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-xl bg-yellow-500/15 text-yellow-500">
            <QrCode className="size-6" />
          </div>
          <div className="flex-1">
            <div className="font-bold">Conectar chip</div>
            <div className="text-xs text-muted-foreground">
              Escaneie o QR Code com o WhatsApp do seu celular.
            </div>
          </div>
          <Badge className="bg-yellow-500/15 text-yellow-500 border-yellow-500/30">
            Desconectado
          </Badge>
        </div>

        <div className="mt-6 grid place-items-center rounded-2xl border-2 border-dashed border-white/10 bg-background/40 p-10">
          <div className="text-center">
            <div className="grid size-32 mx-auto place-items-center rounded-2xl bg-white/5">
              <QrCode className="size-12 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              QR Code aparece aqui após clicar em "Gerar conexão"
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Button size="lg" className="font-semibold">
            Gerar QR Code
          </Button>
        </div>
      </Card>

      <Card className="bg-card border-white/5 p-6">
        <h2 className="font-bold flex items-center gap-2">
          <CheckCircle2 className="size-5 text-primary" />
          Depois de conectar você pode:
        </h2>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>• Disparar treino e dieta em PDF para cada aluno</li>
          <li>• Mandar cobrança automática todo dia 5</li>
          <li>• Receber áudio/foto do aluno direto no painel</li>
          <li>• Lembrar de bater meta de água e sono</li>
        </ul>
      </Card>
    </div>
  );
}