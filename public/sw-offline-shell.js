/* Minimal offline shell — navigation fallback only; no API or RSC caching. */
const CACHE_NAME = "aipoker-offline-shell-v1";
const OFFLINE_SHELL = new URL("./offline-shell.html", self.location.href).pathname;
const SHELL_ASSETS = [OFFLINE_SHELL, new URL("./icon-512.png", self.location.href).pathname];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(SHELL_ASSETS).catch(() => cache.add(OFFLINE_SHELL)),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (url.pathname.includes("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(OFFLINE_SHELL)) ?? (await cache.match("./offline-shell.html"));
      }),
    );
  }
});
