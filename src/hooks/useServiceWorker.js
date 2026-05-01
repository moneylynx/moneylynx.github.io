import { useState, useEffect } from 'react';

// ─── useServiceWorker ─────────────────────────────────────────────────────────
// Registers /sw.js on production and surfaces an update banner when a new
// Service Worker is waiting to activate.
//
// Returns:
//   swUpdate      — the waiting ServiceWorker, or null
//   applySwUpdate — call to skipWaiting → the 'controllerchange' listener
//                   in this hook will reload the page once the new SW takes over
// ─────────────────────────────────────────────────────────────────────────────
export function useServiceWorker() {
  const [swUpdate, setSwUpdate] = useState(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    // Skip registration on localhost (Vite HMR handles reloads in dev).
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;

    let registration;

    const onControllerChange = () => { window.location.reload(); };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      registration = reg;

      // A waiting worker may already exist if the user missed a previous update.
      if (reg.waiting) setSwUpdate(reg.waiting);

      // Watch for a new SW that installs while the page is open.
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            setSwUpdate(nw);
          }
        });
      });

      // Poll for updates every hour while the tab is open.
      const poll = setInterval(() => reg.update().catch(() => null), 60 * 60 * 1000);
      registration._pollId = poll;
    }).catch(() => null);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      if (registration && registration._pollId) clearInterval(registration._pollId);
    };
  }, []);

  const applySwUpdate = () => {
    if (!swUpdate) return;
    swUpdate.postMessage({ type: 'SKIP_WAITING' });
    // 'controllerchange' listener above handles the reload.
  };

  return { swUpdate, applySwUpdate };
}
