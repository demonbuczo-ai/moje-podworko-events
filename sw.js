// ============================================================
// Moje Podworko - Service Worker
// ============================================================

const CACHE_NAME = "moje-podworko-v5";

const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/app.js",
  "/events.js",
  "/install.js",
  "/feedback.js",
  "/manifest.json",
  "/icons/icon.svg",
];

self.addEventListener("install", function(event) {
  console.log("[sw] Instalacja");
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(FILES_TO_CACHE);
    }).then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(event) {
  console.log("[sw] Aktywacja");
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.map(function(name) {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(event) {
  const url = new URL(event.request.url);

  // API zawsze do sieci
  if (url.pathname.startsWith("/api/") || url.port === "8100") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        if (event.request.method === "GET" && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function() {
        if (event.request.mode === "navigate") {
          return caches.match("/index.html");
        }
      });
    })
  );
});

console.log("[sw] Gotowy");



