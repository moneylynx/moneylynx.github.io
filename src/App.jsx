import { useState, useEffect, useMemo, useCallback, useRef } from "react";

// ─── Lib ──────────────────────────────────────────────────────────────────────
import { K, DEF_LISTS, T, MONTHS, MSHORT, MSHORT_EN, BACKUP_SNOOZE_MS } from "./lib/constants.js";
import { createT, EN_DICT } from "./lib/i18n.js";
import { load, save, saveRaw, loadRaw, fmtEur, curYear } from "./lib/helpers.js";
import {
  bytesToHex, deriveEncKey, hashPinV2, hashPinLegacy,
  encryptJSON, encryptAndSaveAll, loadAndDecryptAll,
  cacheKeyToSession, loadKeyFromSession, clearSessionKey,
} from "./lib/crypto.js";

// ─── Components ───────────────────────────────────────────────────────────────
import { Ic, QuickAddModal, ActionHubModal } from "./components/ui.jsx";
import { LockScreen, SetupPin, OnboardingScreen } from "./components/auth.jsx";
import Dashboard from "./components/Dashboard.jsx";
import TxForm from "./components/TxForm.jsx";
import TxList from "./components/TxList.jsx";
import Charts from "./components/Charts.jsx";
import Settings from "./components/Settings.jsx";
import { RecurringScreen } from "./components/Settings.jsx";

export default function App() {
  // Detect at startup whether data is protected by a PIN.
  // If yes, encrypted data keys start empty — they're filled async after unlock.
  // sec and prefs are ALWAYS plaintext (needed before unlock for theme/lang).
  const _sec = load(K.sec, {});
  const _hasPin = !!_sec.pinHash;

  const [txs, setTxs] = useState(() => _hasPin ? [] : load(K.db, []));
  const [drafts, setDrafts] = useState(() => _hasPin ? [] : load(K.drf, []));
  const [prefs,setPrefs]= useState(()=>load(K.prf,{theme:"auto",year:curYear(), onboarded:false, lang:"hr"}));
  const [user, setUser] = useState(()=> _hasPin ? {} : load(K.usr,{firstName:"",lastName:"",phone:"",email:""}));
  const [sec,  setSec]  = useState(()=>load(K.sec,{pinHash:null,bioEnabled:false,bioCredId:null,attempts:0,totalFailed:0,lockedUntil:null}));
  const [lists,setLists] = useState(() => _hasPin ? DEF_LISTS : load(K.lst, DEF_LISTS));

  // AES-GCM key lives ONLY in memory. Never persisted.
  // null = no PIN / not yet unlocked. Set on successful PIN entry.
  const [encKey, setEncKey] = useState(null);
  // useRef ensures async callbacks always read the latest sec without stale closure.
  const secRef = useRef(sec);
  useEffect(() => { secRef.current = sec; }, [sec]);

  const [page, setPage] = useState("dashboard");
  const [editId,setEditId]   = useState(null);
  const [draftEdit,setDraftEdit] = useState(null);
  const [subPg, setSubPg]    = useState(null);
  const [unlocked,setUnlocked] = useState(false);
  const [setupMode, setSetupMode] = useState(false); // shows SetupPin screen from Settings when user has no PIN yet
  const [swUpdate, setSwUpdate] = useState(null);     // ServiceWorker waiting — trigger via banner click

  // Modal controls
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showActionHub, setShowActionHub] = useState(false);

  // Filters
  const [txFilter, setTxFilter]           = useState("pending");
  const [statTab, setStatTab]             = useState("expected");
  const [statMonth, setStatMonth]         = useState("YEAR");
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

  // Clean up old localStorage session key (from previous implementation).
  useEffect(()=>{ try { localStorage.removeItem("ml_sk"); } catch {} }, []);

  // sessionStorage clears on app close → PIN/biometry required on reopen.
  // On foreground return within same session → session key still in
  // sessionStorage → silent unlock (no PIN, no biometry prompt).
  useEffect(()=>{
    if (!sec.pinHash) return;
    const fn = async () => {
      if (document.hidden) {
        setUnlocked(false);
      } else {
        // Try session cache — works for minimize/restore within same session.
        try {
          const cachedKey = await loadKeyFromSession();
          if (cachedKey) {
            const data = await loadAndDecryptAll(cachedKey, DEF_LISTS);
            setTxs(data.txs); setDrafts(data.drafts);
            setLists(data.lists); setUser(data.user);
            setEncKey(cachedKey);
            setUnlocked(true);
          }
          // If no cachedKey: LockScreen shows, biometry auto-triggers.
        } catch { /* stay locked */ }
      }
    };
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[sec.pinHash]);

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
    await cacheKeyToSession(key);
    setUnlocked(true); // user just set PIN, no need to re-authenticate
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
    await cacheKeyToSession(newKey);
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
      setTxs(p=>[...p,...arr]);
    } else {
      setTxs(p=>[...p, { ...tx, id:Date.now().toString(), installments:0 }]);
    }
    setPage("dashboard");
  };

  const updTx  = tx => { setTxs(p=>p.map(x=>x.id===tx.id?tx:x)); setEditId(null); setPage("transactions"); };

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
    startUndo(t("Stavka obrisana"), () => setTxs(p => [...p, removed]));
  };
  const delGrp = g => {
    const removed = txs.filter(x => x.installmentGroup === g);
    if (!removed.length) return;
    setTxs(p => p.filter(x => x.installmentGroup !== g));
    startUndo(t("Grupa obrisana") + ` (${removed.length})`, () => setTxs(p => [...p, ...removed]));
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
    .su{animation:su .25s ease-out both} .fi{animation:fi .2s ease-out both}
    input[type=date]::-webkit-calendar-picker-indicator{filter:${theme==="dark"?"invert(1)":"none"};opacity:.5;}
    select{appearance:none;-webkit-appearance:none;}
    select.empty{color:${C.textMuted};}
    select:not(.empty){color:${C.text};}
    button{font-family:inherit;}
    .hdr{padding-top:max(14px, env(safe-area-inset-top));}
  `;

  const wrap = { background:C.bg, minHeight:"100vh", width:"100%", color:C.text, fontFamily:"'Inter',sans-serif", maxWidth:480, margin:"0 auto", transition:"background .3s,color .3s" };

  if (!prefs.onboarded) {
    return (
      <div style={wrap}><style>{gs}</style>
        <OnboardingScreen C={C} prefs={prefs} updPrefs={updP} user={user} updUser={updU} lists={lists} updLists={setLists} updSec={updS} t={t} onSetPin={handleFirstSetPin} finish={() => { updP({onboarded:true, firstUseAt: Date.now()}); setUnlocked(true); }} />
      </div>
    );
  }

  if (sec.pinHash && !unlocked) return (
    <div style={wrap}><style>{gs}</style>
    <LockScreen C={C} sec={sec} t={t}
      onUnlock={async (pin, isLegacy, bioOnly) => {
        if (bioOnly) {
          // Biometry path: try to restore AES key from sessionStorage first.
          const cachedKey = await loadKeyFromSession();
          if (cachedKey) {
            // Session has a cached key — decrypt data and unlock without PIN.
            const data = await loadAndDecryptAll(cachedKey, DEF_LISTS);
            setTxs(data.txs); setDrafts(data.drafts); setLists(data.lists); setUser(data.user);
            setEncKey(cachedKey);
            updS({attempts:0, lockedUntil:null});
            setUnlocked(true);
          } else {
            // No cached key — biometry passed but we still need PIN to decrypt.
            // LockScreen will surface the PIN form with a helpful message.
            // (This happens on first unlock of a new session.)
          }
          return;
        }
        await handleCryptoUnlock(pin, isLegacy);
      }}
      onWipe={wipe}
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

  const shared = { C, year:prefs.year, lists, user, t, lang };

  return (
    <div style={{ ...wrap, paddingBottom:88 }}>
      <style>{gs}</style>

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

      {page==="dashboard"    && <Dashboard    {...shared} data={txs} setTxs={setTxs} setPage={setPage} setTxFilter={setTxFilter} onQuickAdd={()=>setShowQuickAdd(true)} prefs={prefs} updPrefs={updP} setSubPg={setSubPg}/>}
      {page==="add"          && <TxForm {...shared} txs={txs} draft={draftEdit} setLists={setLists} onSubmit={tx=>{ addTx(tx); if(draftEdit){ setDrafts(p=>p.filter(d=>d.id!==draftEdit.id)); setDraftEdit(null); } }} onCancel={()=>{ setPage("dashboard"); setDraftEdit(null); }} onGoRecurring={()=>setPage("recurring")}/>}
      {page==="edit"         && <TxForm {...shared} txs={txs} tx={txs.find(x=>x.id===editId)} setLists={setLists} onSubmit={updTx} onCancel={()=>{ setEditId(null); setPage("transactions"); }}/>}
      {page==="transactions" && <TxList {...shared} data={txs} filter={txFilter} setFilter={setTxFilter} onEdit={id=>{ setEditId(id); setPage("edit"); }} onDelete={delTx} onDeleteGroup={delGrp} onPay={id=>setTxs(p=>p.map(x=>x.id===id?{...x,status:"Plaćeno",date:new Date().toISOString().split("T")[0]}:x))}/>}
      {page==="charts"       && <Charts {...shared} data={txs} tab={statTab} setTab={setStatTab} selMonth={statMonth} setSelMonth={setStatMonth} expFilter={statExpFilter} setExpFilter={setStatExpFilter}/>}
      {page==="recurring"    && <RecurringScreen {...shared} data={txs} setTxs={setTxs} onBack={()=>setPage("dashboard")}/>}
      {page==="settings"     && <Settings {...shared} txs={txs} setTxs={setTxs} drafts={drafts} prefs={prefs} updPrefs={updP} updUser={updU} sec={sec} updSec={updS} lists={lists} setLists={setLists} subPg={subPg} setSubPg={setSubPg} setUnlocked={setUnlocked} setSetupMode={setSetupMode} onChangePinCrypto={handleChangePinCrypto} onRemovePinCrypto={handleRemovePinCrypto}/>}

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

