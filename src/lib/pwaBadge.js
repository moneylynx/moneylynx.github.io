// ─── PWA Badge + Shortcuts ────────────────────────────────────────────────────
// Manages the app icon badge count (shows overdue items on the home screen icon)
// and handles URL shortcuts from the manifest (action=add, action=overdue).
//
// Badge API: supported on Chrome 81+ (Android/Desktop), Edge 81+.
// On unsupported browsers this is a no-op (no errors).
//
// Lock screen widget note:
// True lock screen widgets are not available for PWAs on iOS or Android without
// a native wrapper (Capacitor/TWA). This module provides the closest available
// approximation:
//   • App icon badge count visible on the home screen
//   • App Shortcuts (long-press on icon) → "Novi unos" and "Za platiti danas"
//   • Periodic background sync to keep badge fresh (Chrome Android only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update the app icon badge count.
 * @param {number} count — 0 clears the badge
 */
export function updateBadge(count) {
  try {
    if (typeof navigator === 'undefined') return;
    if (count > 0) {
      navigator.setAppBadge?.(count);
    } else {
      navigator.clearAppBadge?.();
    }
    // Also notify Service Worker so it can refresh badge after periodic sync.
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'UPDATE_BADGE', count });
    }
    // Persist count in Cache Storage as SW fallback.
    if ('caches' in self) {
      caches.open('moneylynx-v1.1').then(cache =>
        cache.put('/__ml_badge__', new Response(String(count)))
      ).catch(() => {});
    }
  } catch {}
}

/**
 * Request periodic background sync registration.
 * Called once on app startup — silently ignored on unsupported browsers.
 */
export async function registerPeriodicSync() {
  try {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    if (!reg.periodicSync) return;
    // Check permission first.
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (status.state !== 'granted') return;
    // Register with a 1-hour minimum interval.
    await reg.periodicSync.register('ml-badge-refresh', { minInterval: 60 * 60 * 1000 });
  } catch {}
}

/**
 * Parse the start_url action parameter and return the target page/filter.
 * Used to handle manifest shortcut deep links.
 *
 * Returns: { page, filter } | null
 */
export function parseShortcutAction() {
  try {
    const url    = new URL(window.location.href);
    const action = url.searchParams.get('action');
    if (!action) return null;
    // Clean the URL so it doesn't persist on navigation.
    window.history.replaceState({}, '', '/');
    if (action === 'add')     return { page: 'add',          filter: null };
    if (action === 'overdue') return { page: 'transactions', filter: 'overdue' };
  } catch {}
  return null;
}

/**
 * Compute the overdue item count from transaction + recurring data.
 * Used to update the badge count.
 */
export function computeOverdueCount(txs, lists) {
  try {
    const today = new Date(); today.setHours(23, 59, 59, 999);
    let count = txs.filter(x =>
      x.type === 'Isplata' &&
      (x.status === 'Čeka plaćanje' || x.status === 'U obradi') &&
      new Date(x.date) <= today
    ).length;

    // Add recurring obligations not yet paid this month.
    const rec     = lists.recurring || [];
    const now     = new Date();
    const cm      = now.getMonth();
    const cy      = now.getFullYear();
    const paidIds = new Set(
      txs.filter(x => {
        const d = new Date(x.date);
        return d.getMonth() === cm && d.getFullYear() === cy && x.recurringId;
      }).map(x => x.recurringId)
    );
    count += rec.filter(r => !paidIds.has(r.id)).length;

    return count;
  } catch {
    return 0;
  }
}
