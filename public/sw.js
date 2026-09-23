/* Service worker — push notifications do Viva FIT APP. */
self.addEventListener("push", (event) => {
  let data = { title: "Viva FIT APP", body: "Você tem novidade no app.", url: "/aluno" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // mantém defaults
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/aluno";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("navigate" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
