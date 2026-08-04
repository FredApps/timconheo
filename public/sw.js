// Versioned cache name: bumping it evicts everything the previous build cached,
// including the pre-server static shell.
const CACHE = "tim-con-heo-shell-v0.6.0";
const SCOPE_PATH = new URL(self.registration.scope).pathname;
const SHELL = [SCOPE_PATH, `${SCOPE_PATH}manifest.webmanifest`];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache the API. Those responses are per-account and session-scoped, so
  // a stale one would show the previous user's words, or keep a signed-in
  // session alive after logout. Always go to the network.
  if (url.pathname.startsWith(`${SCOPE_PATH}api/`)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fresh = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached || (event.request.mode === "navigate" ? caches.match(SCOPE_PATH) : undefined));
      return cached || fresh;
    }),
  );
});
