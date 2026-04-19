// Moja lova — Service Worker
// Strategy: cache-first for app shell, network-first for navigations.
// Bump CACHE_VERSION whenever app shell files change so clients pick up updates.

const CACHE_VERSION = "ml-v1";
const CACHE_NAME    = `moja-lova-${CACHE_VERSION}`;

// App shell — the minimum files needed to boot the app offline.
// Vite hashes JS/CSS filenames on each build, so we cannot list them here; instead
// we cache them opportunistically at runtime (fetch handler below).
const SHELL_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

// ─── Install: precache shell ──────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use no-cache to bypass any intermediate HTTP cache while precaching.
      return Promise.all(
        SHELL_URLS.map((url) =>
          cache.add(new Request(url, { cache: "no-cache" })).catch(() => null)
        )
      );
    })
  );
  // Activate immediately on first install so we don't wait a page-reload.
  self.skipWaiting();
});

// ─── Activate: drop old caches ────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("moja-lova-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      // Take control of any open tabs without requiring a reload.
      await self.clients.claim();
    })()
  );
});

// ─── Fetch: routing by request type ───────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET requests; everything else (POST, etc.) passes through.
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Skip cross-origin requests (CDN fonts, Capacitor, etc.) — let the browser
  // handle them normally. Caching third-party responses can cause CORS issues.
  if (url.origin !== self.location.origin) return;

  // Strategy 1 — Navigation (HTML) requests: network-first, fall back to cache.
  // This ensures users get the newest index.html when online; offline they see
  // the cached shell.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const net = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, net.clone());
          return net;
        } catch {
          const cached = await caches.match(req);
          return cached || caches.match("/index.html");
        }
      })()
    );
    return;
  }

  // Strategy 2 — Static assets (JS, CSS, images, icons): cache-first.
  // Vite fingerprints JS/CSS so their URLs change per build; old files stay in
  // cache until the `activate` step purges them.
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const net = await fetch(req);
        // Only cache OK responses (not 404/500) — avoids caching errors.
        if (net && net.ok && net.type === "basic") {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, net.clone());
        }
        return net;
      } catch {
        // Offline and not in cache — let the browser show its offline page.
        return Response.error();
      }
    })()
  );
});

// ─── Message channel: lets the app trigger skipWaiting to pick up new SW ─────
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
