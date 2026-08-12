const CACHE = "tim-con-heo-shell-v0.7.0";
const SCOPE_PATH = new URL(self.registration.scope).pathname;
const CORE = [SCOPE_PATH, `${SCOPE_PATH}manifest.webmanifest`, `${SCOPE_PATH}version.json`];

async function precacheBuild() {
  const cache = await caches.open(CACHE);
  await cache.addAll(CORE);
  const response = await fetch(SCOPE_PATH, { cache: "no-store" });
  const html = await response.text();
  const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => new URL(match[1], self.registration.scope))
    .filter((url) => url.origin === self.location.origin)
    .map((url) => url.href);
  await Promise.allSettled(urls.map((url) => cache.add(url)));
}

self.addEventListener("install", (event) => event.waitUntil(precacheBuild()));

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith(`${SCOPE_PATH}api/`)) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) caches.open(CACHE).then((cache) => cache.put(SCOPE_PATH, response.clone()));
          return response;
        })
        .catch(() => caches.match(SCOPE_PATH)),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ??
        fetch(event.request).then((response) => {
          if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
          return response;
        }),
    ),
  );
});
