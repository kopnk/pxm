const CACHE_NAME = "pxm-cache-__PXM_BUILD_ID__";
const APP_SHELL = [
  "/manifest.webmanifest",
  "/offline.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("pxm-cache-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

function isStaticAsset(request, url) {
  // Only public build assets may persist; authenticated files and avatars must not.
  return url.pathname.startsWith("/_nuxt/") &&
    ["style", "script", "image", "font"].includes(request.destination);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isApiRequest(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match("/offline.html")) || Response.error();
        }),
    );
    return;
  }

  if (isStaticAsset(request, url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && !response.redirected &&
              !/\b(?:no-store|private)\b/i.test(response.headers.get("cache-control") || "")) {
            const copy = response.clone();
            event.waitUntil(
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(request, copy))
                .catch(() => {}),
            );
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match(request)) || Response.error();
        }),
    );
  }
});
