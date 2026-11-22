/*
 * Fast service worker.
 *
 * The whole site keeps working with no connection: pages are cached as they
 * are visited, hashed build assets and the local animated emojis are cached
 * first visit, and the live data endpoint falls back to the last successful
 * payload. Navigation requests time out fast so visitors on flaky mobile
 * networks never wait on a dead connection.
 */

const VERSION = "fast-v3";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const LIVE_CACHE = `${VERSION}-live`;
const PRECACHE = ["/offline.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await Promise.allSettled(PRECACHE.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC_CACHE, PAGE_CACHE, LIVE_CACHE]);
      const names = await caches.keys();
      await Promise.all(names.filter((n) => !keep.has(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

async function fetchWithTimeout(request, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Network first with a hard timeout, then the cache, then the fallback. */
async function networkFirst(request, cacheName, fallbackUrl, timeoutMs) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetchWithTimeout(request, timeoutMs);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl);
      if (fallback) return fallback;
    }
    throw new Error("offline and uncached");
  }
}

/** Cache first, refresh quietly in the background for next time. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => undefined);
  if (cached) {
    void refresh;
    return cached;
  }
  const fresh = await refresh;
  if (!fresh || !fresh.ok) throw new Error("not cacheable");
  return fresh;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Live data: fresh when possible, last payload when not.
  if (url.pathname === "/api/live") {
    event.respondWith(networkFirst(request, LIVE_CACHE, null, 4500));
    return;
  }

  // Navigations: render fresh, fall back to the cached page, then offline.
  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, PAGE_CACHE, "/offline.html", 3500).catch(
        () =>
          new Response("<h1>Offline</h1>", {
            status: 503,
            headers: { "Content-Type": "text/html" },
          }),
      ),
    );
    return;
  }

  // Immutable build output, local emojis and icons: cache first.
  const cacheable =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/emojis/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(css|js|png|jpg|jpeg|webp|svg|ico|woff|woff2)$/.test(url.pathname);

  if (cacheable) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  }
  // Everything else goes to the network untouched.
});
