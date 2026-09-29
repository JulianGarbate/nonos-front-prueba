/* Service worker de NONOS: recibe las notificaciones push del backend (Web Push)
   y las muestra aunque la pestaña esté cerrada. El backend envía { title, body }. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "NONOS", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "NONOS";
  const urgente = /emergencia|ayuda|sos/i.test(title);

  // Si la app está abierta, que refresque las notificaciones al instante.
  const avisarApp = self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((ventanas) => ventanas.forEach((v) => v.postMessage({ type: "nonos:push" })));

  event.waitUntil(
    Promise.all([avisarApp, self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/pwa-icon/192",
      badge: "/pwa-icon/96",
      lang: "es",
      tag: urgente ? "nonos-urgente" : undefined,
      renotify: urgente,
      requireInteraction: urgente,
      vibrate: urgente ? [300, 120, 300, 120, 300] : [120],
      data: { url: "/avisos" },
    })]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const v of ventanas) {
        if ("focus" in v) {
          await v.focus();
          if ("navigate" in v) await v.navigate(url).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
