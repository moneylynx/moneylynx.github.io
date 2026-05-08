import { useState, useEffect, useCallback } from 'react';

// ─── useServiceWorker ─────────────────────────────────────────────────────────
// Works with vite-plugin-pwa generated service worker (Workbox).
//
// Capabilities:
//   1. SW update detection + prompt
//   2. Push notification permission request
//   3. Payment reminder scheduling via SW
// ─────────────────────────────────────────────────────────────────────────────

export function useServiceWorker() {
  const [swUpdate,   setSwUpdate]   = useState(null);
  const [pushStatus, setPushStatus] = useState(
    () => 'Notification' in window ? Notification.permission : 'unsupported'
  );

  // ── SW Registration ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;

    let reg;
    const onControllerChange = () => window.location.reload();
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((r) => {
      reg = r;
      if (r.waiting) setSwUpdate(r.waiting);
      r.addEventListener('updatefound', () => {
        const nw = r.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) setSwUpdate(nw);
        });
      });
      const poll = setInterval(() => r.update().catch(() => null), 60 * 60 * 1000);
      r._pollId = poll;
    }).catch(() => null);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      if (reg?._pollId) clearInterval(reg._pollId);
    };
  }, []);

  // ── Apply update ──────────────────────────────────────────────────────────
  const applySwUpdate = useCallback(() => {
    swUpdate?.postMessage({ type: 'SKIP_WAITING' });
  }, [swUpdate]);

  // ── Push permission ───────────────────────────────────────────────────────
  const requestPushPermission = useCallback(async () => {
    if (!('Notification' in window)) { setPushStatus('unsupported'); return 'unsupported'; }
    if (Notification.permission !== 'default') { setPushStatus(Notification.permission); return Notification.permission; }
    setPushStatus('requesting');
    const result = await Notification.requestPermission();
    setPushStatus(result);
    return result;
  }, []);

  // ── Show / schedule notification ──────────────────────────────────────────
  const scheduleReminder = useCallback(async ({ title, body, delayMs = 0, tag = 'ml_reminder' }) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const show = async () => {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (reg?.showNotification) {
        reg.showNotification(title, {
          body, tag,
          icon: '/icons/icon-192.png',
          data: { url: '/?action=transactions' },
          actions: [{ action: 'open', title: 'Otvori' }, { action: 'dismiss', title: 'Zatvori' }],
        });
      } else {
        new Notification(title, { body, tag, icon: '/icons/icon-192.png' });
      }
    };
    if (delayMs <= 0) { await show(); }
    else { setTimeout(show, delayMs); }
  }, []);

  // ── Bulk schedule for upcoming payments ──────────────────────────────────
  const schedulePaymentReminders = useCallback(async (todoItems, t = s => s) => {
    if (!todoItems?.length || Notification.permission !== 'granted') return;
    const now = Date.now();
    const THREE_DAYS = 3 * 86400000;
    const ONE_DAY    = 86400000;
    for (const item of todoItems) {
      const dueTs = new Date(item.date + 'T08:00:00').getTime();
      const msUntilDue = dueTs - now;
      if (msUntilDue <= 0 || msUntilDue > THREE_DAYS) continue;
      const delayMs = Math.max(0, dueTs - ONE_DAY - now);
      await scheduleReminder({
        title: t('Plaćanje dospijeva'),
        body: `${item.description} — ${parseFloat(item.amount).toFixed(2).replace('.', ',')} €`,
        tag: `ml_due_${item.id}`,
        delayMs,
      });
    }
  }, [scheduleReminder]);

  return { swUpdate, applySwUpdate, pushStatus, requestPushPermission, scheduleReminder, schedulePaymentReminders };
}
