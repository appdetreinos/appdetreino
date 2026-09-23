"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { csrfFetch } from "@/lib/security/client";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * Opt-in de push no app do aluno.
 * Sem VAPID configurada, o card nem aparece (page.tsx controla).
 */
export function PushOptIn({ vapidKey }: { vapidKey: string }) {
  const [state, setState] = useState<"idle" | "done" | "blocked" | "unsupported">("idle");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
    }
  }, []);

  async function enable() {
    setLoading(true);
    try {
      if (Notification.permission === "denied") {
        setState("blocked");
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState("blocked");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
      const json = sub.toJSON();
      const res = await csrfFetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      });
      if (res.ok) setState("done");
    } catch {
      setState("blocked");
    } finally {
      setLoading(false);
    }
  }

  if (state === "unsupported" || state === "done") return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
      <div className="grid size-9 place-items-center rounded-full bg-primary/15 text-primary shrink-0">
        {state === "blocked" ? <BellOff className="size-4" /> : <Bell className="size-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">Avisos do coach no celular</div>
        <div className="text-xs text-muted-foreground">
          {state === "blocked"
            ? "Notificação bloqueada no navegador — libera nas configurações do site."
            : "Treino novo, cobrança e recados chegam na hora."}
        </div>
      </div>
      {state === "idle" && (
        <Button size="sm" onClick={enable} disabled={loading} className="shrink-0">
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : "Ativar"}
        </Button>
      )}
    </div>
  );
}
