/* ============================================================
   SERVICE WORKER · Piñatería Laureles
   ============================================================
   - Cachea los assets para que la app abra sin internet.
   - Estrategia: stale-while-revalidate para HTML/CSS/JS,
     cache-first para iconos.
   - Maneja eventos de notificación push y clicks.
   - Permite mensajería desde la app (showOrderNotification).
   ============================================================ */

const CACHE_VERSION = "pinata-v1.3.0";
const APP_SHELL = [
  "/",
  "/index.html",
  "/styles.css",
  "/script.js",
  "/supabase-config.js",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon-32.png",
];

/* ─────────── Install ─────────── */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(APP_SHELL).catch(() => {})
    )
  );
  self.skipWaiting();
});

/* ─────────── Activate ─────────── */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION && k.startsWith("pinata-"))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* ─────────── Fetch ─────────── */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Nunca cachear llamadas a Supabase ni APIs externas
  if (url.origin !== self.location.origin) return;

  // Evitar cachear extensiones del navegador
  if (url.protocol === "chrome-extension:" || url.protocol === "moz-extension:") return;

  // Stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(req);
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.ok && (res.type === "basic" || res.type === "default")) {
            cache.put(req, res.clone()).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

/* ─────────── Mensajes desde la app ─────────── */
// La app envía: { type: 'show-notification', title, body, tag }
self.addEventListener("message", (event) => {
  const data = event.data || {};

  if (data.type === "show-notification") {
    self.registration.showNotification(data.title || "Nueva orden", {
      body: data.body || "Tienes una nueva orden de piñata",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "orden-nueva",
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: false,
      renotify: true,
      data: { url: "/?source=pwa&action=admin" },
    });
  }

  if (data.type === "skip-waiting") {
    self.skipWaiting();
  }
});

/* ─────────── Push (futuro: notificaciones aunque la app esté cerrada) ─────────── */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { title: "Nueva orden", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Piñatería Laureles";
  const opts  = {
    body:  payload.body  || "Nueva orden recibida",
    icon:  "/icon-192.png",
    badge: "/icon-192.png",
    tag:   payload.tag   || "orden-nueva",
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    data: { url: payload.url || "/?source=pwa&action=admin" },
  };

  event.waitUntil(self.registration.showNotification(title, opts));
});

/* ─────────── Click en notificación → abrir admin ─────────── */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/?source=pwa&action=admin";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url && new URL(c.url).origin === self.location.origin) {
          c.focus();
          c.navigate(targetUrl).catch(() => {});
          return;
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
