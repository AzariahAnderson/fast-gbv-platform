/*
 * Fast service worker.
 *
 * The whole site keeps working with no connection: pages are cached as they
 * are visited, hashed build assets, the local animated emojis and the icons
 * are precached on install, and the live data endpoint falls back to the last
 * successful payload. Navigation requests time out fast so visitors on flaky
 * mobile networks never wait on a dead connection.
 *
 * v17 adds an asset-integrity guard: a response served for a script, style,
 * worker or font request is verified to actually be that kind of resource.
 * If a deployment transition makes the network answer a hashed asset with a
 * 404 HTML page (the classic "module script returned text/html" console
 * error), the wrong bytes are never delivered or cached — the request fails
 * cleanly instead and every open tab is told that a fresher build exists so
 * it can guide the visitor to reload.
 */

const VERSION = "fast-v17";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const LIVE_CACHE = `${VERSION}-live`;

/**
 * Authenticated app surfaces. Their HTML is never written to any cache:
 * a signed-in person's dashboard, messages or safety plans must not stay
 * readable in Cache Storage after they sign out — on a shared device that
 * cached HTML would be exactly the trace a survivor needs gone. These
 * routes go network-only (with the usual flaky-network timeout) and fall
 * back to the offline page; only public pages are ever cached.
 */
const PRIVATE_PREFIXES = [
  "/home",
  "/messages",
  "/family",
  "/map",
  "/safety",
  "/ai",
  "/contacts",
  "/profile",
  "/notifications",
  "/settings",
  "/onboarding",
];

function isPrivateRoute(url) {
  return PRIVATE_PREFIXES.some((p) => url.pathname === p || url.pathname.startsWith(p + "/"));
}

const PRECACHE = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  // The animated emojis: small local webp files, precached on install so
  // the hero frame, the support messages and the onboarding flow render
  // even on a first offline visit. Every shipped animation is visible in
  // all of its frames — the seedling, the star, the rainbow and the raised
  // hands blink fully transparent mid-loop and read broken, so they never
  // ship. The list always matches the set referenced in src/ exactly.
  "/emojis/2728-128.webp",
  "/emojis/1f496-128.webp",
  "/emojis/1f338-128.webp",
  "/emojis/1f340-128.webp",
  "/emojis/1f64f-128.webp",
  "/emojis/1f49b-128.webp",
  "/emojis/1f4aa-128.webp",
  "/emojis/1f91d-128.webp",
  "/emojis/1fac2-128.webp",
  "/emojis/1f49a-128.webp",
  "/emojis/1f31e-128.webp",
  "/emojis/1f49c-128.webp",
  "/emojis/1f495-128.webp",
  "/emojis/1f337-128.webp",
  "/emojis/1f54a-128.webp",
  "/emojis/1f98b-128.webp",
  "/emojis/1f490-128.webp",
  "/emojis/1f339-128.webp",
  "/emojis/1f388-128.webp",
  "/emojis/1f30a-128.webp",
  "/emojis/1f981-128.webp",
  "/emojis/1f38a-128.webp",
  "/emojis/1f31d-128.webp",
  "/emojis/1f381-128.webp",
  "/emojis/1f49f-128.webp",
  "/emojis/1f30d-128.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // cache:"reload" bypasses the HTTP cache, so a version bump always
      // installs the true bytes of every asset even when the server sends
      // long-lived Cache-Control headers for the artwork directories.
      await Promise.allSettled(
        PRECACHE.map((url) => cache.add(new Request(url, { cache: "reload" }))),
      );
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

/**
 * Tell every open tab that the build it is running against can no longer
 * be fully served (a hashed chunk disappeared from the deployment). The
 * app listens for this and offers a calm one-tap reload instead of failing
 * with console errors.
 */
async function notifyStaleBuild() {
  try {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clients) client.postMessage({ type: "fast:stale-build" });
  } catch {
    /* messaging is best effort */
  }
}

function isHtmlResponse(response) {
  const type = (response.headers.get("content-type") || "").toLowerCase();
  return type.includes("text/html");
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
      // The fallback page lives in the install precache (STATIC_CACHE), not
      // in this request's own cache: before this fix an offline first visit
      // could never reach offline.html and died on the last-resort page.
      const fallback = await caches.open(STATIC_CACHE).then((c) => c.match(fallbackUrl));
      if (fallback) return fallback;
    }
    throw new Error("offline and uncached");
  }
}

/**
 * Cache first, refresh quietly in the background for next time.
 *
 * `kind` marks requests whose response must be the real asset. For those,
 * an HTML body (deployment skew) or a 404/410 (hash no longer deployed)
 * is never delivered or cached: the answer is an empty body with the
 * honest status, so a module loader sees a failed fetch — never markup.
 */
async function cacheFirst(request, cacheName, kind) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((res) => {
      if (res && res.ok && !(kind === "asset" && isHtmlResponse(res))) {
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
  if (fresh && fresh.ok) {
    if (kind === "asset" && isHtmlResponse(fresh)) {
      void notifyStaleBuild();
      return new Response("", {
        status: 404,
        statusText: "Stale build asset",
        headers: { "Content-Type": "text/plain" },
      });
    }
    return fresh;
  }
  if (fresh && (fresh.status === 404 || fresh.status === 410) && kind === "asset") {
    // This tab runs HTML from an older deployment; its hashed chunk is
    // gone. Fail the fetch cleanly (no HTML body) and invite a reload.
    void notifyStaleBuild();
    return new Response("", {
      status: fresh.status,
      statusText: "Stale build asset",
      headers: { "Content-Type": "text/plain" },
    });
  }
  if (!fresh || !fresh.ok) {
    // Nothing cached and the network failed: answer with a clean 504 so the
    // request fails visibly instead of throwing an uncaught rejection.
    return new Response("", { status: 504, statusText: "Offline" });
  }
  return fresh;
}

/** Network only: never store the response, fall back to the offline page. */
async function networkOnly(request, fallbackUrl, timeoutMs) {
  try {
    return await fetchWithTimeout(request, timeoutMs);
  } catch {
    if (fallbackUrl) {
      const fallback = await caches.open(STATIC_CACHE).then((c) => c.match(fallbackUrl));
      if (fallback) return fallback;
    }
    throw new Error("offline and uncached");
  }
}

/**
 * Requests that must resolve to their real bytes: hashed build output and
 * anything the browser loads as a script, style, worker or font. A wrong
 * content-type here is exactly the "Failed to load module script: …
 * text/html" error, so these get the guarded cache-first path.
 */
function isAssetRequest(request, url) {
  if (url.pathname.startsWith("/_next/static/")) return true;
  const dest = request.destination;
  if (dest === "script" || dest === "style" || dest === "worker" || dest === "font") return true;
  return /\.(css|js|mjs|woff|woff2|ttf|otf|map)$/.test(url.pathname);
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
    if (isPrivateRoute(url)) {
      // Signed-in HTML is never cached — see PRIVATE_PREFIXES above.
      event.respondWith(
        networkOnly(request, "/offline.html", 3500).catch(
          () =>
            new Response("<h1>Offline</h1>", {
              status: 503,
              headers: { "Content-Type": "text/html" },
            }),
        ),
      );
      return;
    }
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

  // Immutable build output and local artwork: cache first, guarded.
  const cacheable =
    isAssetRequest(request, url) ||
    url.pathname.startsWith("/emojis/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(png|jpg|jpeg|webp|svg|ico)$/.test(url.pathname);

  if (cacheable) {
    event.respondWith(cacheFirst(request, STATIC_CACHE, isAssetRequest(request, url) ? "asset" : undefined));
  }
  // Everything else goes to the network untouched.
});
