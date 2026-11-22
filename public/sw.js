/*
 * Fast service worker.
 *
 * The whole site keeps working with no connection: pages are cached as they
 * are visited, hashed build assets, the local animated emojis and the icons
 * are precached on install, and the live data endpoint falls back to the last
 * successful payload. Navigation requests time out fast so visitors on flaky
 * mobile networks never wait on a dead connection.
 */

const VERSION = "fast-v5";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const LIVE_CACHE = `${VERSION}-live`;
const PRECACHE = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  // The animated encouragement emojis: small local webp files, precached on
  // install so the support messages render even on a first offline visit.
  "/emojis/2728-128.webp",
  "/emojis/1f49b-128.webp",
  "/emojis/1f331-128.webp",
  "/emojis/1f4aa-128.webp",
  "/emojis/1f91d-128.webp",
  "/emojis/1fac2-128.webp",
  "/emojis/1f49a-128.webp",
  "/emojis/1f31f-128.webp",
];

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
    if (fresh && fresh.ok) {
      // cache.put can reject for non-cacheable responses; never let it
      // surface as an uncaught rejection.
      cache.put(request, fresh.clone()).catch(() => undefined);
    }
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
      if (res && res.ok) {
        cache.put(request, res.clone()).catch(() => undefined);
      }
      return res;
    })
    .catch(() => undefined);
  if (cached) {
    void refresh;
    return cached;
  }
  const fresh = await refresh;
  if (!fresh || !fresh.ok) {
    // Nothing cached and the network failed: answer with a clean 504 so the
    // request fails visibly instead of throwing an uncaught rejection.
    return new Response("", { status: 504, statusText: "Offline" });
  }
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
