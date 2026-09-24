"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, X, Share } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const SNOOZE_KEY = "pwa-banner-snooze";
const COUNT_KEY = "pwa-banner-count";
const SNOOZE_DAYS = 7;
const MAX_IMPRESSIONS = 5;

function isInstalled(): boolean {
  if (typeof window === "undefined") return true;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if ((navigator as Navigator & { standalone?: boolean }).standalone === true) return true;
  return false;
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

function mayShow(): boolean {
  try {
    if (isInstalled()) return false;
    const count = Number(localStorage.getItem(COUNT_KEY) ?? 0);
    if (count >= MAX_IMPRESSIONS) return false;
    const snooze = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
    if (Date.now() < snooze) return false;
    return true;
  } catch {
    return false;
  }
}

function markShown() {
  try {
    localStorage.setItem(COUNT_KEY, String(Number(localStorage.getItem(COUNT_KEY) ?? 0) + 1));
  } catch {
    // ignore
  }
}

function snooze() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000));
  } catch {
    // ignore
  }
}

/**
 * Popup de instalação do PWA (bottom-sheet) — aparece de vez em quando,
 * nunca toda hora: some por 7 dias ao dispensar, no máximo 5 exibições.
 * No iOS (sem prompt nativo) mostra o passo a passo manual, com GIF
 * tutorial opcional (prop `gifUrl`).
 */
export function PwaBanner({ gifUrl }: { gifUrl?: string }) {
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [ios] = useState(isIOS);
  const [tab, setTab] = useState<"auto" | "ios">("auto");

  useEffect(() => {
    if (!mayShow()) return;
    setTab(isIOS() ? "ios" : "auto");
    const t = setTimeout(() => {
      setVisible(true);
      markShown();
    }, 5000);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    snooze();
    setVisible(false);
  };

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setVisible(false);
        return;
      }
    }
    dismiss();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Instalar aplicativo"
      className="fixed inset-0 z-50 flex items-end justify-center p-4"
    >
      <button
        type="button"
        aria-label="Dispensar"
        onClick={dismiss}
        className="absolute inset-0 bg-black/60 animate-fade-in"
      />
      <Card className="relative w-full max-w-sm bg-card border-primary/20 p-5 animate-fade-in-up">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fechar"
          className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground"
        >
          <X className="size-4" />
        </button>
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-primary/15 text-primary shrink-0">
            <Download className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold">Instala o Viva FIT</div>
            <div className="text-xs text-muted-foreground">
              Acesso direto na tela inicial, sem baixar nada.
            </div>
          </div>
        </div>

        {/* Android/PC (automático) x iPhone (manual) */}
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-full border border-white/10 bg-background/40 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab("auto")}
            aria-pressed={tab === "auto"}
            className={`rounded-full px-3 py-2 transition-colors ${
              tab === "auto" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Android / PC
          </button>
          <button
            type="button"
            onClick={() => setTab("ios")}
            aria-pressed={tab === "ios"}
            className={`rounded-full px-3 py-2 transition-colors ${
              tab === "ios" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            iPhone
          </button>
        </div>

        {tab === "auto" ? (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground">
              Um toque e vira app de verdade, com ícone na tela inicial.
            </p>
            <div className="mt-3 flex gap-2">
              <Button onClick={install} disabled={!deferred} className="flex-1 font-bold min-h-[48px]">
                Instalar agora
              </Button>
              <Button variant="ghost" onClick={dismiss} className="shrink-0">
                Depois
              </Button>
            </div>
            {!deferred && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                O botão libera sozinho aqui no Chrome/Edge. No menu do navegador (⋮)
                também tem “Instalar app”.
              </p>
            )}
          </div>
        ) : gifUrl ? (
          <div className="mt-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gifUrl}
              alt="Como instalar no iPhone"
              loading="lazy"
              className="w-full rounded-xl border border-white/10"
            />
            <div className="mt-3 flex gap-2">
              <Button onClick={dismiss} className="flex-1 font-bold min-h-[48px]">
                Entendi
              </Button>
              <Button variant="ghost" onClick={dismiss} className="shrink-0">
                Depois
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <div className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-muted-foreground flex items-start gap-1.5">
              <Share className="size-3.5 mt-0.5 shrink-0" />
              <span>
                No Safari, toca em <strong>Compartilhar</strong> e depois em
                “<strong>Adicionar à Tela de Início</strong>”.
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <Button onClick={dismiss} className="flex-1 font-bold min-h-[48px]">
                Entendi
              </Button>
              <Button variant="ghost" onClick={dismiss} className="shrink-0">
                Depois
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/** Botão manual (ex: Configurações) — instala na hora ou ensina. */
export function PwaInstallButton() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [done, setDone] = useState(false);
  const [ios] = useState(isIOS);

  useEffect(() => {
    if (isInstalled()) {
      setDone(true);
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (done) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setDone(true);
  }

  if (!deferred) {
    return (
      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <Share className="size-3.5 mt-0.5 shrink-0" />
        {ios
          ? "No iPhone: Compartilhar → Adicionar à Tela de Início."
          : "No menu do navegador (⋮), toca em “Instalar app”."}
      </p>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={install} className="font-semibold">
      <Download className="size-4" />
      Instalar app
    </Button>
  );
}
