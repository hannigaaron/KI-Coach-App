/**
 * Service Worker.
 *
 * Zweck: die App startet auch ohne Netz und laedt schneller. Ausserdem nimmt
 * er die Push Nachrichten entgegen, die der Cron in GitHub Actions schickt.
 * Das ist der einzige Weg, den Nutzer zu erreichen, waehrend die App
 * geschlossen ist. Siehe scripts/push-senden.mjs.
 */
const CACHE = "daevo-v35";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./js/app.js",
  "./js/storage.js",
  "./js/assistant.js",
  "./js/brain.js",
  "./js/orb.js",
  "./js/voice.js",
  "./js/anamnese.js",
  "./js/silhouette.js",
  "./js/setup-ui.js",
  "./js/media.js",
  "./js/rings.js",
  "./js/push.js",
  "./lib/core/index.js",
  "./lib/coach/index.js",
  "./icons/icon-192.png",
  "./icons/apple-touch-icon.png",
  "./brand/daevo-lockup-light.svg",
  "./brand/daevo-lockup-dark.svg",
  "./brand/daevo-lockup-deep.svg",
  "./brand/daevo-wordmark.svg",
  "./brand/daevo-wordmark-deep.svg",
  "./brand/daevo-mark.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Netz zuerst, damit ein neues Deployment sofort ankommt. Cache als Rueckfall.
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match("./index.html"))),
  );
});

/* ---------- Push ---------- */

/**
 * Eine Nachricht vom Push Dienst.
 *
 * Der Browser verlangt, dass jede Push Nachricht sichtbar wird. Ein
 * stiller Empfang kostet die Erlaubnis. Deshalb steht am Ende jedes Pfades
 * ein showNotification, auch wenn die Nutzlast unbrauchbar ist.
 */
self.addEventListener("push", (event) => {
  let inhalt = {};
  try {
    inhalt = event.data ? event.data.json() : {};
  } catch {
    inhalt = { titel: "daevo", text: event.data ? event.data.text() : "" };
  }

  const titel = inhalt.titel || "daevo";
  const optionen = {
    body: inhalt.text || "",
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    // Gleiche Marke ersetzt die aeltere Nachricht, statt sich zu stapeln.
    // Ein doppelt gestarteter Cron erzeugt so keine zweite Zeile.
    tag: inhalt.marke || "daevo",
    renotify: Boolean(inhalt.marke),
    data: { ziel: inhalt.ziel || "./", ...(inhalt.daten || {}) },
  };
  event.waitUntil(self.registration.showNotification(titel, optionen));
});

/**
 * Ein Tipp auf die Nachricht.
 *
 * Ist die App schon offen, wird das offene Fenster nach vorn geholt und der
 * Zielpfad als Nachricht hineingegeben. Ein zweites Fenster fuer dieselbe App
 * ist das, was Nutzer als kaputt empfinden.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const ziel = event.notification.data?.ziel || "./";
  const url = new URL(ziel, self.location.href).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenster) => {
      for (const f of fenster) {
        if (new URL(f.url).origin !== self.location.origin) continue;
        f.postMessage({ typ: "impuls", daten: event.notification.data || {} });
        return f.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
