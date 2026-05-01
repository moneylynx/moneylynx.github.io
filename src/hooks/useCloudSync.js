import { useState, useEffect, useRef, useCallback } from 'react';
import { DEF_LISTS } from '../lib/constants.js';
import { supabase } from '../lib/supabase.js';
import { uploadAll, downloadAll } from '../lib/sync.js';

// ─── useCloudSync ─────────────────────────────────────────────────────────────
// Manages cloud synchronisation with Supabase:
//   • Online / offline detection
//   • Initial sync after login (merge local ↔ cloud)
//   • Debounced batch queue for individual transaction changes
//   • Full upload helper for manual sync / login sync
//   • Realtime listener that refreshes transactions when another device changes them
//
// Parameters:
//   supaUser  — Supabase User | null
//   txs, lists, user  — current local data (used for upload payloads)
//   setTxs, setLists, setUser — setters to apply cloud data locally
//   t         — translation function
// ─────────────────────────────────────────────────────────────────────────────
export function useCloudSync({ supaUser, txs, lists, user, setTxs, setLists, setUser, t }) {
  const [syncing,   setSyncing]   = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [isOnline,  setIsOnline]  = useState(
    () => typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // ── Online / offline detection ────────────────────────────────────────────
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      setSyncError(null);
      // Auto-retry sync when reconnecting.
      if (supaUser) handleSyncAfterLogin(supaUser.id);
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supaUser?.id]);

  // ── Initial sync after login ──────────────────────────────────────────────
  const handleSyncAfterLogin = async (userId) => {
    if (!navigator.onLine) {
      setSyncError(t('Nema internetske veze. Podaci su lokalni.'));
      return;
    }
    setSyncing(true);
    setSyncError(null);
    try {
      const cloudData   = await downloadAll(userId, DEF_LISTS);
      const cloudTxs    = cloudData.txs || [];
      if (cloudTxs.length > 0) {
        const merged = [
          ...cloudTxs,
          ...txs.filter(lt => !cloudTxs.find(ct => ct.id === lt.id)),
        ];
        setTxs(merged);
        if (cloudData.lists && Object.keys(cloudData.lists).length > 0) setLists(cloudData.lists);
        if (cloudData.user  && cloudData.user.firstName)                 setUser(cloudData.user);
        if (txs.length > 0) {
          await uploadAll(userId, {
            txs:   merged,
            lists: cloudData.lists || lists,
            user:  cloudData.user  || user,
          });
        }
      } else if (txs.length > 0) {
        await uploadAll(userId, { txs, lists, user });
      }
    } catch (e) {
      console.error('Sync error:', e);
      setSyncError(t('Greška pri sinkronizaciji. Pokušaj ponovo.'));
    } finally {
      setSyncing(false);
    }
  };

  // ── Auto-sync when user logs in ───────────────────────────────────────────
  useEffect(() => {
    if (supaUser) {
      const needsSync = localStorage.getItem('ml_sync_needed');
      if (needsSync) localStorage.removeItem('ml_sync_needed');
      handleSyncAfterLogin(supaUser.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supaUser?.id]);

  // ── Debounced batch sync queue ────────────────────────────────────────────
  // Collects changed transactions within an 800ms window and sends them in a
  // single Supabase upsert call — prevents 12 individual calls for installments.
  const syncQueueRef  = useRef([]);
  const syncTimerRef  = useRef(null);

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, []);

  const queueSync = useCallback((changedTxs) => {
    if (!supaUser) return;
    changedTxs.forEach(tx => {
      const idx = syncQueueRef.current.findIndex(q => q.id === tx.id);
      if (idx >= 0) syncQueueRef.current[idx] = tx;
      else          syncQueueRef.current.push(tx);
    });
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      const batch = syncQueueRef.current.splice(0);
      if (!batch.length) return;
      try {
        const { syncTransactions } = await import('../lib/sync.js');
        await syncTransactions(supaUser.id, batch);
      } catch (e) { console.error('queueSync error:', e); }
    }, 800);
  }, [supaUser]);

  // ── Full upload (used for manual sync and login sync) ─────────────────────
  const cloudSync = useCallback(async (newTxs) => {
    if (!supaUser) return;
    try { await uploadAll(supaUser.id, { txs: newTxs, lists, user }); }
    catch (e) { console.error('cloudSync error:', e); }
  }, [supaUser, lists, user]);

  // ── Single-transaction delete ─────────────────────────────────────────────
  const cloudDel = async (localId) => {
    if (!supaUser) return;
    try {
      const { deleteTransaction } = await import('../lib/sync.js');
      await deleteTransaction(supaUser.id, localId);
    } catch (e) { console.error('cloudDel error:', e); }
  };

  // ── Realtime listener ─────────────────────────────────────────────────────
  // Debounced: refreshes local transactions when another device makes a change.
  useEffect(() => {
    if (!supaUser) return;
    let debounceTimer;
    const channel = supabase
      .channel('transactions-changes')
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'transactions',
        filter: `user_id=eq.${supaUser.id}`,
      }, () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          try {
            const { fetchTransactions } = await import('../lib/sync.js');
            const cloudTxs = await fetchTransactions(supaUser.id);
            if (cloudTxs) setTxs(cloudTxs);
          } catch (e) { console.error('Realtime fetch error:', e); }
        }, 1500);
      })
      .subscribe();
    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [supaUser?.id]);

  return {
    syncing, setSyncing,
    syncError, setSyncError,
    isOnline,
    handleSyncAfterLogin,
    queueSync,
    cloudSync,
    cloudDel,
  };
}
