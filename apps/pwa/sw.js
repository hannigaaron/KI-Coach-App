/**
 * Service Worker.
 *
 * Zweck: die App startet auch ohne Netz und laedt schneller. Ausserdem nimmt
 * er die Push Nachrichten entgegen, die der Cloudflare Worker schickt. Das
 * ist der einzige Weg, den Nutzer zu erreichen, waehrend die App geschlossen
 * ist. Siehe workers/push.
 */
const CACHE = "daevo-v53";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./schrift/poppins-500.woff2",
  "./schrift/poppins-600.woff2",
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
  "./js/luecke.js",
  "./js/gesundheit.js",
  "./js/zip.js",
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
    data: {
      ziel: inhalt.ziel || "./",
      titel,
      frageText: inhalt.text || "",
      aktionen: inhalt.aktionen || [],
      ...(inhalt.daten || {}),
    },
  };

  // Knoepfe in der Nachricht. Damit laesst sich antworten, ohne die App zu
  // oeffnen. Wie viele das System zeigt, steht in Notification.maxActions,
  // und ueberzaehlige laesst es stillschweigend weg. Deshalb wird hier
  // gekuerzt statt gehofft: sonst faellt bei manchen Systemen die Reihenfolge
  // auseinander. Auf dem iPhone zeigt Safari derzeit keine Knoepfe an. Der
  // Tipp auf die Nachricht selbst bleibt deshalb immer ein Weg.
  const aktionen = Array.isArray(inhalt.aktionen) ? inhalt.aktionen : [];
  if (aktionen.length) {
    const platz = typeof Notification !== "undefined" && Number.isFinite(Notification.maxActions)
      ? Notification.maxActions
      : 2;
    optionen.actions = aktionen.slice(0, Math.max(0, platz));
  }
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
  const daten = event.notification.data || {};

  // Ein Tipp auf einen Knopf ist eine fertige Antwort. Sie wird hier abgelegt
  // und die App bleibt zu: genau das war der Zweck der Knoepfe. Der Service
  // Worker kommt nicht an den localStorage der App heran, deshalb der Umweg
  // ueber den Cache. Die App holt es beim naechsten Oeffnen ab.
  if (event.action) {
    event.waitUntil(antwortAblegen(event.action, daten));
    return;
  }

  const ziel = daten.ziel || "./";
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

/* ---------- Antworten aus der Benachrichtigung ---------- */

/** Wo die Antworten liegen, bis die App sie abholt. */
const ANTWORT_CACHE = "daevo-antworten";

/**
 * Legt eine Antwort ab, ohne die App zu oeffnen.
 *
 * Der Cache ist hier der einzige Speicher, der beiden Seiten offen steht.
 * IndexedDB ginge auch, kostet aber eine Schemaverwaltung fuer drei Felder.
 * Ist ein Fenster offen, bekommt es die Antwort zusaetzlich sofort: sonst
 * sieht der Nutzer seine eigene Antwort erst nach einem Neustart.
 */
async function antwortAblegen(aktion, daten) {
  const eintrag = {
    aktion,
    art: daten.art || "",
    frage: daten.titel || "",
    frageText: daten.frageText || "",
    at: Date.now(),
  };
  try {
    const cache = await caches.open(ANTWORT_CACHE);
    await cache.put(
      new Request(`${self.location.origin}/daevo-antwort/${eintrag.at}-${aktion}`),
      new Response(JSON.stringify(eintrag), { headers: { "content-type": "application/json" } }),
    );
  } catch {
    // Ohne Cache geht die Antwort verloren. Das ist schlecht, aber besser als
    // eine Benachrichtigung, die beim Antippen einen Fehler wirft.
  }
  const fenster = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const f of fenster) f.postMessage({ typ: "antwort", daten: eintrag });
}
