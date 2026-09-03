/**
 * Service Worker.
 *
 * Zweck: die App startet auch ohne Netz und laedt schneller. Er kann keine
 * Erinnerungen verschicken, wenn die App geschlossen ist. Dafuer braucht es
 * Web Push mit einem Server oder eine native App.
 */
const CACHE = "daevo-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./js/app.js",
  "./js/storage.js",
  "./lib/core/index.js",
  "./lib/coach/index.js",
  "./icons/icon-192.png",
  "./icons/apple-touch-icon.png",
  "./brand/daevo-lockup-light.svg",
  "./brand/daevo-lockup-dark.svg",
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
