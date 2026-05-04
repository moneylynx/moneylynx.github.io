// Moja Lova Service Worker v1.0
// Handles: cache-first strategy, background badge updates, SKIP_WAITING

const CACHE_NAME = "moneylynx-v1.0";
const BADGE_STORAGE_KEY = "ml_overdue_count";

// ── Install + Activate ───────────────────────────────────────────────────────
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

// ── Message handler ──────────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (!event.data) return;

  // App requests SW to skip waiting and activate new version
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  // App reports overdue item count so SW can update the badge
  if (event.data.type === "UPDATE_BADGE") {
    const count = event.data.count || 0;
    try {
      if (navigator.setAppBadge) {
        if (count > 0) navigator.setAppBadge(count);
        else navigator.clearAppBadge();
      }
    } catch {}
    return;
  }
});

// ── Periodic background sync ─────────────────────────────────────────────────
// Wakes up the SW periodically (on browsers that support it — Chrome Android)
// to refresh the badge count from localStorage.
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "ml-badge-refresh") {
    event.waitUntil(refreshBadge());
  }
});

async function refreshBadge() {
  try {
    // Can't access localStorage from SW directly — post message to all clients.
    const clients = await self.clients.matchAll({ type: "window" });
    if (clients.length > 0) {
      clients[0].postMessage({ type: "REQUEST_BADGE_COUNT" });
    } else {
      // No open client — try to read count from Cache Storage as fallback.
      const cache = await caches.open(CACHE_NAME);
      const resp  = await cache.match("/__ml_badge__");
      if (resp) {
        const count = parseInt(await resp.text()) || 0;
        if (navigator.setAppBadge) {
          if (count > 0) navigator.setAppBadge(count);
          else navigator.clearAppBadge();
        }
      }
    }
  } catch {}
}
