// MoneyLynx Service Worker
const CACHE_NAME = "moneylynx-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
