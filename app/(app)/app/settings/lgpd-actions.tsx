"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ShieldAlert, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

const DELETE_PHRASE = "DELETE_MY_ACCOUNT";

export function LgpdActions() {
  return (
    <Card className="bg-card/80 border-white/10 p-6">
      <div className="flex items-start gap-3">
        <ShieldAlert className="size-5 mt-0.5 text-amber-500" aria-hidden />
        <div>
          <h2 className="text-lg font-bold">Seus dados (LGPD)</h2>
          <p className="mt-1 text-sm text-foreground/65">
            Você tem direito de acessar e excluir seus dados pessoais a qualquer momento,
            conforme art. 18 da LGPD.
          </p>
        </div>
      </div>

      <div className="mt-5 grid sm:grid-cols-2 gap-3">
        <ExportDataCard />
        <DeleteAccountCard />
      </div>
    </Card>
  );
}

function ExportDataCard() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/me/export-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          toast.error(data?.error ?? "Falha ao exportar dados");
          return;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const stamp = new Date().toISOString().slice(0, 10);
        a.download = `vivafit-export-${stamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success("Dados exportados");
        setOpen(false);
      } catch {
        toast.error("Erro de rede ao exportar");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="h-12 justify-start">
            <Download className="size-4" />
            Exportar meus dados
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar todos os seus dados</DialogTitle>
          <DialogDescription>
            Vamos montar um arquivo JSON com seu perfil, alunos, treinos, dietas, mensagens
            e cobranças e baixar pra você. Pode demorar alguns segundos.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={isPending}>
            {isPending ? "Gerando arquivo…" : "Baixar JSON"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAccountCard() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [isPending, startTransition] = useTransition();

  const canDelete = confirm === DELETE_PHRASE;

  function handleDelete() {
    if (!canDelete) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/me/delete-account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmation: DELETE_PHRASE }),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          toast.error(data?.error ?? "Falha ao excluir conta");
          return;
        }

        toast.success("Conta excluída. Redirecionando…");
        // Hard reload to limpar qualquer state client-side.
        setTimeout(() => {
          window.location.href = "/";
        }, 1200);
      } catch {
        toast.error("Erro de rede ao excluir conta");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirm(""); }}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="h-12 justify-start border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="size-4" />
            Excluir minha conta
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir conta (irreversível)</DialogTitle>
          <DialogDescription>
            Sua conta será marcada como deletada, seus dados pessoais serão anonimizados e
            os dados financeiros preservados por 5 anos conforme exigência legal.
            <br />
            <br />
            Para confirmar, digite{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">
              {DELETE_PHRASE}
            </code>{" "}
            abaixo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmação</Label>
          <Input
            id="confirm"
            autoComplete="off"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={DELETE_PHRASE}
            className="font-mono"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleDelete}
            disabled={!canDelete || isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isPending ? "Excluindo…" : "Excluir definitivamente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
