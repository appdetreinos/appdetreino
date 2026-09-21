/* Service Worker stub — Viva FIT PWA
 *
 * Estratégia: network-first pra API, cache-first pra assets.
 * Em produção, versionar CACHE_NAME e limpar caches antigos.
 */

const CACHE_NAME = "viva-fit-v1";
const PRECACHE = ["/", "/logo.svg", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass pra webhooks e API mutante
  if (url.pathname.startsWith("/api/")) {
    return; // default network
  }

  // Network-first pra navegação
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((r) => r ?? caches.match("/"))),
    );
    return;
  }

  // Cache-first pra assets
  event.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request)),
  );
});
