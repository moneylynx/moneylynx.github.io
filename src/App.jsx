import { useState, useEffect, useMemo, useCallback, useRef } from "react";

// ─── Lib ──────────────────────────────────────────────────────────────────────
import { K, DEF_LISTS, T, MONTHS, MSHORT, MSHORT_EN, BACKUP_SNOOZE_MS } from "./lib/constants.js";
import { createT, EN_DICT } from "./lib/i18n.js";
import { load, save, saveRaw, loadRaw, fmtEur, fmtCurrency, fDateTZ, curYear } from "./lib/helpers.js";
import {
  bytesToHex, deriveEncKey, hashPinV2, hashPinLegacy,
  encryptJSON, encryptAndSaveAll, loadAndDecryptAll,
  cacheKeyToSession, loadKeyFromSession, clearSessionKey,
} from "./lib/crypto.js";
import { supabase, signOut, onAuthChange } from "./lib/supabase.js";
import { uploadAll, downloadAll } from "./lib/sync.js";

// ─── Components ───────────────────────────────────────────────────────────────
import { Ic, QuickAddModal, ActionHubModal } from "./components/ui.jsx";
import { LockScreen, SetupPin, OnboardingScreen, LanguageScreen } from "./components/auth.jsx";
import AuthScreen from "./components/AuthScreen.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Dashboard from "./components/Dashboard.jsx";
import TxForm from "./components/TxForm.jsx";
import TxList from "./components/TxList.jsx";
import Charts from "./components/Charts.jsx";
import Settings from "./components/Settings.jsx";
import { RecurringScreen } from "./components/Settings.jsx";

export default function App() {
  const _sec = load(K.sec, {});
  const _hasPin = !!_sec.pinHash;

  const [txs, setTxs] = useState(() => _hasPin ? [] : load(K.db, []));
  const [drafts, setDrafts] = useState(() => _hasPin ? [] : load(K.drf, []));
  const [prefs,setPrefs]= useState(()=>load(K.prf,{theme:"auto",year:curYear(), onboarded:false, lang:"hr", currency:"EUR", timezone:"Europe/Zagreb"}));
  const [user, setUser] = useState(()=> _hasPin ? {} : load(K.usr,{firstName:"",lastName:"",phone:"",email:""}));
  const [sec,  setSec]  = useState(()=>load(K.sec,{pinHash:null,bioEnabled:false,bioCredId:null,attempts:0,totalFailed:0,lockedUntil:null}));
  const [lists,setLists] = useState(() => _hasPin ? DEF_LISTS : load(K.lst, DEF_LISTS));

  const [encKey, setEncKey] = useState(null);
  const secRef = useRef(sec);
  useEffect(() => { secRef.current = sec; }, [sec]);

  // ─── Supabase auth state ───────────────────────────────────────────────────
  const [supaUser, setSupaUser]   = useState(null);  // logged-in Supabase user
  const [authReady, setAuthReady] = useState(false); // auth state resolved
  const [syncing, setSyncing]     = useState(false);
  const [syncError, setSyncError] = useState(null);  // null | string
  const [isOnline, setIsOnline]   = useState(()=> typeof navigator !== "undefined" ? navigator.onLine : true);

  // ─── Online / offline detection ───────────────────────────────────────────
  useEffect(() => {
    const goOnline  = () => {
      setIsOnline(true);
      setSyncError(null);
      // Auto-retry sync when coming back online
      if (supaUser) handleSyncAfterLogin(supaUser.id);
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const [page, setPage] = useState("dashboard");
  const [editId,setEditId]   = useState(null);
  const [draftEdit,setDraftEdit] = useState(null);
  const [subPg, setSubPg]    = useState(null);
  const [unlocked,setUnlocked] = useState(()=>!load(K.sec,{}).pinHash);
  const [setupMode, setSetupMode] = useState(false);
  const [swUpdate, setSwUpdate] = useState(null);

  // Modal controls
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showActionHub, setShowActionHub] = useState(false);

  // Filters
  const [txFilter, setTxFilter]           = useState("pending");
  const [statTab, setStatTab]             = useState("expected");
  const [statMonth, setStatMonth]         = useState(()=>MONTHS[new Date().getMonth()]);
  const [statExpFilter, setStatExpFilter] = useState({recurring:true, rate:true, kredit:true, processing:true});

  const lang = prefs.lang || "hr";
  
  // HR fallback map — when a translation key doesn't read well as-is in Croatian
  // (e.g. "Obveze (short)"), this maps to a clean Croatian display text.
  // Keys present here apply only to Croatian; English uses EN_DICT as before.
  const HR_OVERRIDE = {
    "Obveze (short)": "Obveze",
    "Obroci (short)": "Obroci",
    "Rate (short)": "Rate",
    "Ostalo (short)": "Ostalo",
  };

  const t = useCallback((key) => {
    if (lang === "en" && EN_DICT[key]) return EN_DICT[key];
    if (lang === "hr" && HR_OVERRIDE[key]) return HR_OVERRIDE[key];
    return key;
  }, [lang]);

  const theme = useMemo(()=>{
    if (prefs.theme==="auto") return window.matchMedia?.("(prefers-color-scheme:dark)").matches?"dark":"light";
    return prefs.theme;
  },[prefs.theme]);
  const C = T[theme] ?? T.dark;

  // Crypto-aware save: encrypt if encKey is active, plaintext if no PIN.
  // SAFETY: if PIN exists but encKey is null (not yet unlocked), do NOT save —
  // prevents accidentally overwriting encrypted ciphertext with plaintext.
  useEffect(()=>{
    if (encKey)         { encryptJSON(encKey,txs).then(e=>saveRaw(K.db,e)); }
    else if (!sec.pinHash) { save(K.db,txs); }
  },[txs]);
  useEffect(()=>{
    if (encKey)         { encryptJSON(encKey,drafts).then(e=>saveRaw(K.drf,e)); }
    else if (!sec.pinHash) { save(K.drf,drafts); }
  },[drafts]);
  useEffect(()=>save(K.prf,prefs),[prefs]);   // always plaintext
  useEffect(()=>{
    if (encKey)         { encryptJSON(encKey,lists).then(e=>saveRaw(K.lst,e)); }
    else if (!sec.pinHash) { save(K.lst,lists); }
  },[lists]);
  useEffect(()=>{
    if (encKey)         { encryptJSON(encKey,user).then(e=>saveRaw(K.usr,e)); }
    else if (!sec.pinHash) { save(K.usr,user); }
  },[user]);
  useEffect(()=>save(K.sec,sec),[sec]);        // always plaintext

  // ─── Supabase auth listener ────────────────────────────────────────────────
  useEffect(() => {
    // Check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupaUser(session?.user ?? null);
      setAuthReady(true);
    });
    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupaUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ─── Sync: upload local data after login ──────────────────────────────────
  const handleSyncAfterLogin = async (userId) => {
    if (!navigator.onLine) { setSyncError(t("Nema internetske veze. Podaci su lokalni.")); return; }
    setSyncing(true); setSyncError(null);
    try {
      const cloudData = await downloadAll(userId, DEF_LISTS);
      const cloudTxs = cloudData.txs || [];
      if (cloudTxs.length > 0) {
        const merged = [
          ...cloudTxs,
          ...txs.filter(t => !cloudTxs.find(c => c.id === t.id))
        ];
        setTxs(merged);
        if (cloudData.lists && Object.keys(cloudData.lists).length > 0) setLists(cloudData.lists);
        if (cloudData.user && cloudData.user.firstName) setUser(cloudData.user);
        if (txs.length > 0) {
          await uploadAll(userId, { txs: merged, lists: cloudData.lists || lists, user: cloudData.user || user });
        }
      } else if (txs.length > 0) {
        await uploadAll(userId, { txs, lists, user });
      }
    } catch (e) {
      console.error('Sync error:', e);
      setSyncError(t("Greška pri sinkronizaciji. Pokušaj ponovo."));
    } finally {
      setSyncing(false);
    }
  };

  // ─── Auto-sync when user logs in ──────────────────────────────────────────
  useEffect(() => {
    if (supaUser && unlocked) {
      const needsSync = localStorage.getItem("ml_sync_needed");
      if (needsSync) localStorage.removeItem("ml_sync_needed");
      handleSyncAfterLogin(supaUser.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supaUser?.id]);


  // Clean up sync debounce timer on unmount
  useEffect(() => () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current); }, []);

  // Clean up old localStorage session key (from previous implementation).
  useEffect(()=>{ try { localStorage.removeItem("ml_sk"); } catch {} }, []);

  // ─── Realtime sync listener ────────────────────────────────────────────────
  // Listens for changes in Supabase and refreshes local transactions.
  useEffect(() => {
    if (!supaUser) return;
    let debounceTimer;
    const channel = supabase
      .channel('transactions-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${supaUser.id}`,
      }, () => {
        // Debounce 1.5s to avoid multiple rapid fetches
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          try {
            const { fetchTransactions } = await import('./lib/sync.js');
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

  useEffect(()=>{
    const fn = async () => {
      if (!secRef.current.pinHash) return;
      if (document.hidden) {
        setUnlocked(false);
        setPage("dashboard"); // always return to home when app goes to background
      } else {
        const hasBio = secRef.current.bioEnabled && secRef.current.bioCredId;
        if (!hasBio) setUnlocked(false);
        else {
          try {
            const cachedKey = await loadKeyFromSession();
            if (cachedKey) {
              const data = await loadAndDecryptAll(cachedKey, DEF_LISTS);
              setTxs(data.txs); setDrafts(data.drafts);
              setLists(data.lists); setUser(data.user);
              setEncKey(cachedKey);
              setUnlocked(true);
            }
          } catch { /* stay locked */ }
        }
      }
    };
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
  },[]);

  // ─── Backfill firstUseAt for users who onboarded before this feature ──────
  // Without this, existing users would never see the backup reminder because
  // lastBackupAt is 0 and firstUseAt is undefined. Set it once on upgrade.
  useEffect(() => {
    if (prefs.onboarded && !prefs.firstUseAt) {
      updP({ firstUseAt: Date.now() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Service Worker registration + update detection ───────────────────────
  // Registers sw.js on first load so the app can work offline. If a new SW
  // is waiting to activate (because the user has an older version cached),
  // we surface an "Update available" banner; clicking it tells the new SW
  // to skipWaiting and reloads to pick up the fresh code.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Register only on real deployments; skip in dev (Vite HMR handles reloads).
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return;

    let registration;
    const onControllerChange = () => { window.location.reload(); };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      registration = reg;
      // If a waiting worker exists at startup (user missed last update), show banner.
      if (reg.waiting) setSwUpdate(reg.waiting);
      // Listen for a new SW that becomes installed while the page is open.
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            setSwUpdate(nw);
          }
        });
      });
      // Check for updates periodically (every hour while tab is open).
      const poll = setInterval(() => reg.update().catch(() => null), 60 * 60 * 1000);
      // Store cleanup on closure via a variable captured below.
      registration._pollId = poll;
    }).catch(() => null);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      if (registration && registration._pollId) clearInterval(registration._pollId);
    };
  }, []);

  const applySwUpdate = () => {
    if (!swUpdate) return;
    swUpdate.postMessage({ type: "SKIP_WAITING" });
    // controllerchange listener above will reload once the new SW takes over.
  };

  const updP = p => setPrefs(v=>({...v,...p}));
  const updU = p => setUser(v=>({...v,...p}));
  const updS = p => setSec(v=>({...v,...p}));

  // ─── Crypto callbacks (all run in App root to keep full state access) ────────

  // Called by LockScreen when PIN is verified correct.
  // Derives AES key, loads+decrypts all data, fills React state.
  const handleCryptoUnlock = async (pin, isLegacyHash) => {
    try {
      let key;
      if (isLegacyHash) {
        // Legacy SHA-256 PIN — migrate transparently.
        // 1. Generate new PBKDF2 salts.
        const pinSalt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
        const encSalt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
        // 2. Compute new PBKDF2 pin hash.
        const pinHash = await hashPinV2(pin, pinSalt);
        // 3. Derive AES key.
        key = await deriveEncKey(pin, encSalt);
        // 4. Load PLAINTEXT data (still unencrypted before this migration).
        const rawTxs    = JSON.parse(loadRaw(K.db) || "[]");
        const rawDrafts = JSON.parse(loadRaw(K.drf) || "[]");
        const rawLists  = (() => { try { return JSON.parse(loadRaw(K.lst)); } catch { return DEF_LISTS; } })();
        const rawUser   = (() => { try { return JSON.parse(loadRaw(K.usr)); } catch { return {}; } })();
        const data = { txs: rawTxs, drafts: rawDrafts, lists: rawLists || DEF_LISTS, user: rawUser || {} };
        // 5. Encrypt and save.
        await encryptAndSaveAll(key, data);
        // 6. Update sec with new hash format.
        setSec(v => ({ ...v, pinHash, pinSalt, encSalt, pinHashVersion:"v2", attempts:0, totalFailed:0 }));
        setTxs(data.txs); setDrafts(data.drafts); setLists(data.lists); setUser(data.user);
      } else {
        // Already v2 — derive key using fresh sec from ref.
        key = await deriveEncKey(pin, secRef.current.encSalt);
        const data = await loadAndDecryptAll(key, DEF_LISTS);
        setTxs(data.txs); setDrafts(data.drafts); setLists(data.lists); setUser(data.user);
      }
      setEncKey(key);
      await cacheKeyToSession(key);
      setUnlocked(true);
    } catch (e) {
      console.error("Crypto unlock failed:", e);
    }
  };

  // Called by SetupPin (from setupMode flow) when user sets their FIRST PIN.
  // Existing data is plaintext — encrypt it all.
  const handleFirstSetPin = async (pin) => {
    const pinSalt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    const encSalt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    const pinHash = await hashPinV2(pin, pinSalt);
    const key     = await deriveEncKey(pin, encSalt);
    await encryptAndSaveAll(key, { txs, drafts, lists, user });
    const newSec = { ...secRef.current, pinHash, pinSalt, encSalt, pinHashVersion:"v2", attempts:0, totalFailed:0, lockedUntil:null };
    save(K.sec, newSec); // immediate save — don't rely on useEffect timing
    setSec(newSec);
    secRef.current = newSec;
    setEncKey(key);
    // Do NOT cache key here — user must enter PIN on next open.
    // Key is cached only after successful unlock (handleCryptoUnlock).
    setUnlocked(true);
    setSetupMode(false);
  };

  // Called after old PIN verified — re-encrypt everything with new PIN key.
  const handleChangePinCrypto = async (newPin) => {
    const pinSalt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    const encSalt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    const pinHash = await hashPinV2(newPin, pinSalt);
    const newKey  = await deriveEncKey(newPin, encSalt);
    await encryptAndSaveAll(newKey, { txs, drafts, lists, user });
    const newSec = { ...secRef.current, pinHash, pinSalt, encSalt, pinHashVersion:"v2", attempts:0, totalFailed:0 };
    save(K.sec, newSec); // immediate save
    setSec(newSec);
    secRef.current = newSec;
    setEncKey(newKey);
    // Clear old session cache — user must re-enter new PIN on next open.
    clearSessionKey();
  };

  // Called after PIN verified during removal — save all data as plaintext.
  const handleRemovePinCrypto = () => {
    save(K.db,  txs);
    save(K.drf, drafts);
    save(K.lst, lists);
    save(K.usr, user);
    setSec(v => ({ ...v, pinHash:null, pinSalt:null, encSalt:null, pinHashVersion:null, attempts:0, totalFailed:0 }));
    setEncKey(null);
    clearSessionKey();
  };


  // ─── Cloud sync helpers ────────────────────────────────────────────────────
  // Pending queue of transactions to sync — accumulated across rapid calls.
  const syncQueueRef = useRef([]);
  const syncTimerRef = useRef(null);

  // Debounced batch sync — collects all changed txs within 800ms
  // and sends them in a single Supabase upsert call.
  const queueSync = useCallback((changedTxs) => {
    if (!supaUser) return;
    // Merge into queue (deduplicate by id — latest wins)
    changedTxs.forEach(tx => {
      const idx = syncQueueRef.current.findIndex(q => q.id === tx.id);
      if (idx >= 0) syncQueueRef.current[idx] = tx;
      else syncQueueRef.current.push(tx);
    });
    // Reset debounce timer
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      const batch = syncQueueRef.current.splice(0); // drain queue
      if (!batch.length) return;
      try {
        const { syncTransactions } = await import('./lib/sync.js');
        await syncTransactions(supaUser.id, batch);
      } catch (e) { console.error("queueSync error:", e); }
    }, 800);
  }, [supaUser]);

  // Full upload — used for manual sync and login sync only
  const cloudSync = useCallback(async (newTxs) => {
    if (!supaUser) return;
    try { await uploadAll(supaUser.id, { txs: newTxs, lists, user }); }
    catch (e) { console.error("cloudSync error:", e); }
  }, [supaUser, lists, user]);

  const cloudDel = async (localId) => {
    if (!supaUser) return;
    try {
      const { deleteTransaction } = await import('./lib/sync.js');
      await deleteTransaction(supaUser.id, localId);
    } catch (e) { console.error("cloudDel error:", e); }
  };

  const addTx = tx => {
    const inst = parseInt(tx.installments) || 0;
    if (inst > 1) {
      const tot = parseFloat(tx.amount) || 0;
      const mo  = Math.round(tot/inst*100)/100;
      const rem = Math.round((tot - mo*inst)*100)/100;
      const gid = Date.now().toString();
      const sd  = new Date(tx.date);
      const isYearly = tx.installmentPeriod === "Y";
      const arr = [];
      for (let i=0; i<inst; i++) {
        const d = new Date(sd.getFullYear() + (isYearly ? i : 0), sd.getMonth() + (isYearly ? 0 : i), Math.min(sd.getDate(),28));
        let itemStatus = "Čeka plaćanje";
        if (tx.payment === "Kartica (debitna)" && i === 0) itemStatus = "Plaćeno";
        arr.push({
          ...tx,
          id:`${gid}_${i}`, installmentGroup:gid,
          installmentNum:i+1, installmentTotal:inst,
          amount: i===0 ? mo+rem : mo,
          date: d.toISOString().split("T")[0],
          status: itemStatus,
          description:`${tx.description} (${i+1}/${inst})`,
          notes: tx.notes ? `${tx.notes} | ${t("Obrok")} ${i+1}/${inst}` : `${t("Obrok")} ${i+1}/${inst} · ${fmtEur(tot)}`,
        });
      }
      // Queue all installments as single batch — 1 Supabase call instead of 12
      setTxs(p => { const newTxs = [...p, ...arr]; queueSync(arr); return newTxs; });
    } else {
      const newTx = { ...tx, id:Date.now().toString(), installments:0 };
      setTxs(p => { queueSync([newTx]); return [...p, newTx]; });
    }
    setPage("dashboard");
  };

  const updTx = tx => {
    setTxs(p => {
      queueSync([tx]);
      return p.map(x => x.id===tx.id ? tx : x);
    });
    setEditId(null);
    setPage("transactions");
  };

  // ─── Undo toast infrastructure ─────────────────────────────────────────────
  // Instead of deleting immediately, we stash the removed items and show a
  // toast for 5 seconds with an "Undo" button. On timeout the deletion
  // becomes permanent; on undo we restore the items to their original list.
  const [undoInfo, setUndoInfo] = useState(null); // { label, restore, timeoutId }

  // Clear any pending undo timer when a new undo replaces it (user deletes
  // twice quickly — the first one commits immediately, the second gets its
  // own 5-second window).
  const startUndo = (label, restore) => {
    setUndoInfo(prev => {
      if (prev && prev.timeoutId) clearTimeout(prev.timeoutId);
      const tid = setTimeout(() => setUndoInfo(null), 5000);
      return { label, restore, timeoutId: tid };
    });
  };

  const doUndo = () => {
    if (!undoInfo) return;
    clearTimeout(undoInfo.timeoutId);
    undoInfo.restore();
    setUndoInfo(null);
  };

  // Clean up any pending timer on unmount so we don't leak timers.
  useEffect(() => () => { if (undoInfo && undoInfo.timeoutId) clearTimeout(undoInfo.timeoutId); }, [undoInfo]);

  const delTx  = id => {
    const removed = txs.find(x => x.id === id);
    if (!removed) return;
    setTxs(p => p.filter(x => x.id !== id));
    cloudDel(id);
    startUndo(t("Stavka obrisana"), () => { setTxs(p => [...p, removed]); queueSync([removed]); });
  };
  const delGrp = g => {
    const removed = txs.filter(x => x.installmentGroup === g);
    if (!removed.length) return;
    setTxs(p => p.filter(x => x.installmentGroup !== g));
    removed.forEach(r => cloudDel(r.id));
    startUndo(t("Grupa obrisana") + ` (${removed.length})`, () => { setTxs(p => [...p, ...removed]); queueSync(removed); });
  };
  const delDraft = id => {
    const removed = drafts.find(d => d.id === id);
    if (!removed) return;
    setDrafts(p => p.filter(d => d.id !== id));
    startUndo(t("Skica obrisana"), () => setDrafts(p => [...p, removed]));
  };

  const wipe = () => {
    setTxs([]); setDrafts([]); save(K.db,[]); save(K.drf,[]);
    setSec({pinHash:null,bioEnabled:false,bioCredId:null,attempts:0,totalFailed:0,lockedUntil:null});
    setUnlocked(true);
    updP({onboarded: false});
  };

  const gs = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
    html,body,#root{width:100%;min-height:100vh;background:${C.bg};}
    input,select,textarea{font-family:inherit;}
    input:focus,select:focus,textarea:focus{outline:none;border-color:${C.accent}!important;}
    ::-webkit-scrollbar{width:3px;} ::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px;}
    @keyframes su{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fi{from{opacity:0}to{opacity:1}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
    @keyframes shimmer{0%,100%{opacity:.4}50%{opacity:.8}}
    .su{animation:su .25s ease-out both} .fi{animation:fi .2s ease-out both}
    input[type=date]::-webkit-calendar-picker-indicator{filter:${theme==="dark"?"invert(1)":"none"};opacity:.5;}
    select{appearance:none;-webkit-appearance:none;}
    select.empty{color:${C.textMuted};}
    select:not(.empty){color:${C.text};}
    button{font-family:inherit;}
    .hdr{padding-top:max(14px, env(safe-area-inset-top));}
  `;

  const wrap = { background:C.bg, minHeight:"100vh", width:"100%", color:C.text, fontFamily:"'Inter',sans-serif", maxWidth:480, margin:"0 auto", transition:"background .3s,color .3s" };

  // Show language selection on very first launch (before auth)
  if (!prefs.langChosen) {
    return (
      <div style={wrap}><style>{gs}</style>
        <LanguageScreen C={C} onSelect={(lang) => { updP({ lang, langChosen: true }); }}/>
      </div>
    );
  }

  // Show AuthScreen if not logged in (and auth state is resolved)
  if (authReady && !supaUser) {
    return (
      <div style={wrap}><style>{gs}</style>
        <AuthScreen C={C} t={t} onSuccess={(session) => setSupaUser(session?.user)}/>
      </div>
    );
  }

  // Sync indicator overlay
  if (syncing) return (
    <div style={{...wrap, padding:"0 16px"}}>
      <style>{gs}</style>
      {/* Header skeleton */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 0 12px"}}>
        <div style={{width:120, height:22, borderRadius:8, background:C.cardAlt, animation:"shimmer 1.4s ease-in-out infinite"}}/>
        <div style={{width:80, height:30, borderRadius:10, background:C.cardAlt, animation:"shimmer 1.4s ease-in-out infinite"}}/>
      </div>
      {/* Balance card skeleton */}
      <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:18, marginBottom:12}}>
        <div style={{width:80, height:12, borderRadius:6, background:C.cardAlt, marginBottom:10, animation:"shimmer 1.4s ease-in-out infinite"}}/>
        <div style={{width:150, height:28, borderRadius:8, background:C.cardAlt, marginBottom:12, animation:"shimmer 1.4s ease-in-out infinite"}}/>
        <div style={{display:"flex", gap:10}}>
          <div style={{flex:1, height:48, borderRadius:12, background:C.cardAlt, animation:"shimmer 1.4s ease-in-out infinite"}}/>
          <div style={{flex:1, height:48, borderRadius:12, background:C.cardAlt, animation:"shimmer 1.4s ease-in-out infinite"}}/>
        </div>
      </div>
      {/* Chart skeleton */}
      <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:18, marginBottom:12, display:"flex", alignItems:"flex-end", gap:8, height:140}}>
        {[60,85,45,95,70,55,80,40,90,65,75,50].map((h,i)=>(
          <div key={i} style={{flex:1, height:`${h}%`, borderRadius:4, background:C.cardAlt, animation:`shimmer 1.4s ease-in-out ${i*0.08}s infinite`}}/>
        ))}
      </div>
      {/* List skeleton */}
      {[1,2,3].map(i=>(
        <div key={i} style={{background:C.card, border:`1px solid ${C.border}`, borderLeft:`3px solid ${C.cardAlt}`, borderRadius:14, padding:13, marginBottom:8, display:"flex", alignItems:"center", gap:10}}>
          <div style={{width:36, height:36, borderRadius:10, background:C.cardAlt, flexShrink:0, animation:"shimmer 1.4s ease-in-out infinite"}}/>
          <div style={{flex:1}}>
            <div style={{width:"60%", height:12, borderRadius:6, background:C.cardAlt, marginBottom:7, animation:"shimmer 1.4s ease-in-out infinite"}}/>
            <div style={{width:"40%", height:10, borderRadius:6, background:C.cardAlt, animation:"shimmer 1.4s ease-in-out infinite"}}/>
          </div>
          <div style={{width:60, height:16, borderRadius:6, background:C.cardAlt, animation:"shimmer 1.4s ease-in-out infinite"}}/>
        </div>
      ))}
      {/* Sync label */}
      <div style={{textAlign:"center", marginTop:8, display:"flex", alignItems:"center", justifyContent:"center", gap:8}}>
        <span style={{width:8,height:8,borderRadius:"50%",background:C.warning,display:"inline-block",animation:"pulse 1s infinite"}}/>
        <span style={{color:C.textMuted, fontSize:12}}>{t("Sinkronizacija podataka…")}</span>
      </div>
    </div>
  );

  if (!prefs.onboarded) {
    return (
      <div style={wrap}><style>{gs}</style>
        <OnboardingScreen C={C} prefs={prefs} updPrefs={updP} user={user} updUser={updU} lists={lists} updLists={setLists} updSec={updS} t={t} onSetPin={handleFirstSetPin} finish={() => {
          updP({onboarded:true, firstUseAt: Date.now()});
          setUnlocked(true);
          // Check for first expense from onboarding step 4
          if (lists._firstTx) {
            const tx = { ...lists._firstTx, id: Date.now().toString(), installments: 0 };
            setTxs(p => [...p, tx]);
            queueSync([tx]);
            setLists(l => { const { _firstTx, ...rest } = l; return rest; });
          }
        }} />
      </div>
    );
  }

  if (sec.pinHash && !unlocked) return (
    <div style={wrap}><style>{gs}</style>
    <LockScreen C={C} sec={sec} t={t} supaUser={supaUser}
      onUnlock={async (pin, isLegacy, bioOnly) => {
        if (bioOnly) {
          const cachedKey = await loadKeyFromSession();
          if (cachedKey) {
            const data = await loadAndDecryptAll(cachedKey, DEF_LISTS);
            setTxs(data.txs); setDrafts(data.drafts); setLists(data.lists); setUser(data.user);
            setEncKey(cachedKey);
            updS({attempts:0, lockedUntil:null});
            await cacheKeyToSession(cachedKey);
            setUnlocked(true);
          }
          return;
        }
        await handleCryptoUnlock(pin, isLegacy);
      }}
      onWipe={wipe}
      onResetPin={async () => {
        // Reset PIN — clear local encrypted data and re-download from cloud
        const newSec = { pinHash:null, pinSalt:null, encSalt:null, pinHashVersion:null,
                         bioEnabled:false, bioCredId:null, attempts:0, totalFailed:0, lockedUntil:null };
        save(K.sec, newSec); setSec(newSec); secRef.current = newSec;
        setEncKey(null); clearSessionKey();
        // Clear encrypted data — will be re-fetched from cloud
        save(K.db, []); save(K.drf, []); save(K.lst, DEF_LISTS); save(K.usr, {});
        setTxs([]); setDrafts([]); setLists(DEF_LISTS); setUser({});
        setUnlocked(true);
        // Trigger cloud sync to re-download
        if (supaUser) handleSyncAfterLogin(supaUser.id);
      }}
    />
    </div>
  );

  // Setup-PIN screen invoked from Settings when user has no PIN yet.
  if (setupMode) {
    return (
      <div style={wrap}><style>{gs}</style>
        <SetupPin C={C} isChange={false} t={t}
          onSave={pin => handleFirstSetPin(pin)}
          onSkip={() => setSetupMode(false)}
        />
      </div>
    );
  }

  const currency = prefs.currency || "EUR";
  const timezone = prefs.timezone || "Europe/Zagreb";
  const fmt  = (n) => fmtCurrency(n, currency);
  const fmtD = (d) => fDateTZ(d, timezone);
  const shared = { C, year:prefs.year, lists, user, t, lang, fmt, fmtD, currency, timezone };

  return (
    <div style={{ ...wrap, paddingBottom:88 }}>
      <style>{gs}</style>

      {/* Offline banner */}
      {!isOnline && (
        <div style={{
          position:"fixed", top:0, left:"50%", transform:"translateX(-50%)",
          width:"100%", maxWidth:480, zIndex:301,
          background:"#374151", color:"#fff",
          padding:`max(10px, env(safe-area-inset-top)) 16px 10px`,
          display:"flex", alignItems:"center", gap:8,
          borderBottom:"1px solid #4B5563",
        }}>
          <Ic n="alert" s={14} c="#FCD34D"/>
          <span style={{ fontSize:12, fontWeight:600 }}>{t("Nema internetske veze — radite offline")}</span>
        </div>
      )}

      {/* Sync error banner */}
      {syncError && isOnline && (
        <div style={{
          position:"fixed", top:0, left:"50%", transform:"translateX(-50%)",
          width:"100%", maxWidth:480, zIndex:301,
          background:`${C.expense}E8`, color:"#fff",
          padding:`max(10px, env(safe-area-inset-top)) 16px 10px`,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          borderBottom:`1px solid ${C.expense}`,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Ic n="alert" s={14} c="#fff"/>
            <span style={{ fontSize:12, fontWeight:600 }}>{syncError}</span>
          </div>
          <button onClick={()=>{ setSyncError(null); if(supaUser) handleSyncAfterLogin(supaUser.id); }}
            style={{ background:"rgba(255,255,255,0.2)", border:"none", borderRadius:8, padding:"4px 10px", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>
            {t("Pokušaj ponovo")}
          </button>
        </div>
      )}

      {/* Service Worker update banner — appears when a new app version is ready. */}
      {swUpdate && (
        <div
          onClick={applySwUpdate}
          style={{
            position:"fixed", top:0, left:"50%", transform:"translateX(-50%)",
            width:"100%", maxWidth:480, zIndex:300,
            background:`linear-gradient(135deg,${C.accent},${C.accentDk})`,
            color:"#fff", padding:"12px 16px", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"space-between",
            gap:10, borderBottom:`1px solid ${C.accentDk}`,
            paddingTop:`max(12px, env(safe-area-inset-top))`,
          }}
        >
          <div style={{ display:"flex", alignItems:"center", gap:8, flex:1 }}>
            <Ic n="zap" s={16} c="#fff"/>
            <div>
              <div style={{ fontSize:13, fontWeight:700 }}>{t("Nova verzija dostupna")}</div>
              <div style={{ fontSize:11, opacity:.9 }}>{t("Klikni za ažuriranje")}</div>
            </div>
          </div>
          <Ic n="chevron" s={14} c="#fff" style={{ transform:"rotate(-90deg)" }}/>
        </div>
      )}

      {page==="dashboard"    && <Dashboard    {...shared} data={txs} setTxs={setTxs} setPage={setPage} setTxFilter={setTxFilter} onQuickAdd={()=>setShowQuickAdd(true)} prefs={prefs} updPrefs={updP} setSubPg={setSubPg} syncing={syncing} supaUser={supaUser}/>}
      {page==="add"          && <TxForm {...shared} txs={txs} draft={draftEdit} setLists={setLists} onSubmit={tx=>{ addTx(tx); if(draftEdit){ setDrafts(p=>p.filter(d=>d.id!==draftEdit.id)); setDraftEdit(null); } }} onCancel={()=>{ setPage("dashboard"); setDraftEdit(null); }} onGoRecurring={()=>setPage("recurring")}/>}
      {page==="edit"         && <TxForm {...shared} txs={txs} tx={txs.find(x=>x.id===editId)} setLists={setLists} onSubmit={updTx} onCancel={()=>{ setEditId(null); setPage("transactions"); }}/>}
      {page==="transactions" && <TxList {...shared} data={txs} filter={txFilter} setFilter={setTxFilter} onEdit={id=>{ setEditId(id); setPage("edit"); }} onDelete={delTx} onDeleteGroup={delGrp} onPay={id=>setTxs(p=>p.map(x=>x.id===id?{...x,status:"Plaćeno",date:new Date().toISOString().split("T")[0]}:x))}/>}
      {page==="charts"       && <Charts {...shared} data={txs} tab={statTab} setTab={setStatTab} selMonth={statMonth} setSelMonth={setStatMonth} expFilter={statExpFilter} setExpFilter={setStatExpFilter}/>}
      {page==="recurring"    && <RecurringScreen {...shared} data={txs} setTxs={setTxs} onBack={()=>setPage("dashboard")}/>}
      {page==="settings"     && <Settings {...shared} txs={txs} setTxs={setTxs} drafts={drafts} prefs={prefs} updPrefs={updP} updUser={updU} sec={sec} updSec={updS} lists={lists} setLists={setLists} subPg={subPg} setSubPg={setSubPg} setUnlocked={setUnlocked} setSetupMode={setSetupMode} onChangePinCrypto={handleChangePinCrypto} onRemovePinCrypto={handleRemovePinCrypto} supaUser={supaUser} onSignOut={async()=>{ await signOut(); setSupaUser(null); }} onSyncToCloud={supaUser ? async(t,l,u)=>{ await uploadAll(supaUser.id, { txs:t||txs, lists:l||lists, user:u||user }); } : null}/>}

      {showQuickAdd && <QuickAddModal C={C} t={t} onClose={()=>setShowQuickAdd(false)} onSave={d => { setDrafts(p=>[{id:Date.now().toString(), amount:d.amount, description:d.desc, date:new Date().toISOString()}, ...p]); setShowQuickAdd(false); }}/>}
      {showActionHub && <ActionHubModal C={C} t={t} drafts={drafts} onClose={()=>setShowActionHub(false)} onNew={()=>{ setPage("add"); setDraftEdit(null); setShowActionHub(false); }} onSelect={d=>{ setDraftEdit(d); setPage("add"); setShowActionHub(false); }} onDel={delDraft}/>}

      {/* Undo toast — appears above the bottom nav for 5 seconds after a
          destructive action so the user can recover from misclicks. */}
      {undoInfo && (
        <div
          className="fi"
          style={{
            position:"fixed", bottom:96, left:"50%", transform:"translateX(-50%)",
            width:"calc(100% - 32px)", maxWidth:440, zIndex:150,
            background:C.card, border:`1px solid ${C.border}`,
            borderRadius:12, padding:"10px 12px 10px 14px",
            display:"flex", alignItems:"center", justifyContent:"space-between",
            gap:10, boxShadow:`0 8px 24px rgba(0,0,0,.25)`,
          }}
        >
          <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0, flex:1 }}>
            <Ic n="trash" s={14} c={C.expense}/>
            <span style={{ fontSize:13, color:C.text, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {undoInfo.label}
            </span>
          </div>
          <button
            onClick={doUndo}
            style={{
              background:`${C.accent}22`, border:`1px solid ${C.accent}60`,
              borderRadius:8, padding:"6px 12px", cursor:"pointer",
              color:C.accent, fontSize:13, fontWeight:700, flexShrink:0,
              display:"flex", alignItems:"center", gap:5,
            }}
          >
            <Ic n="zap" s={12} c={C.accent}/>{t("Vrati")}
          </button>
        </div>
      )}

      <nav style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, background:C.navBg, borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-around", padding:"6px 0 16px", zIndex:100, backdropFilter:"blur(12px)" }}>
        {[["dashboard","home","Početna"],["transactions","list","Transakcije"],["add","plus",""],["charts","bar","Statistika"],["settings","gear","Postavke"]].map(([id,ic,lb])=>(
          <button key={id} onClick={()=>{
            if (id === "add") {
              if (drafts.length > 0) {
                setShowActionHub(true);
              } else {
                setDraftEdit(null);
                setPage("add");
                setSubPg(null);
              }
            } else {
              setPage(id); setSubPg(null);
            }
          }} style={{ background:"none", border:"none", display:"flex", flexDirection:"column", alignItems:"center", gap:3, cursor:"pointer", padding:"4px 10px", borderRadius:10 }}>
            {id==="add"
              ? <div style={{ width:46, height:46, borderRadius:16, background:C.accent, display:"flex", alignItems:"center", justifyContent:"center", marginTop:-24, boxShadow:`0 4px 18px ${C.accentGlow}` }}><Ic n="plus" s={24} c="#fff"/></div>
              : <><Ic n={ic} s={20} c={page===id?C.accent:C.textMuted}/><span style={{ fontSize:10, color:page===id?C.accent:C.textMuted, fontWeight:page===id?600:400 }}>{t(lb)}</span></>
            }
          </button>
        ))}
      </nav>
    </div>
  );
}

// Wrap with ErrorBoundary so crashes show friendly message instead of blank screen
export function AppWithBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
