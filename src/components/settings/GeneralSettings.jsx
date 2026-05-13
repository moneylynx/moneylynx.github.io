import { useState, useEffect, useMemo, useRef } from 'react';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { K, DEF_LISTS, T, MONTHS, MONTHS_EN, MSHORT, MSHORT_EN, MAX_ATT, BACKUP_SNOOZE_MS, CURRENCIES, TIMEZONES } from '../../lib/constants.js';
import { fmtEur, fDate, load, save, curYear, buildCSV, buildSummary, nativeSaveAndShare, isCapacitor } from '../../lib/helpers.js';
import { hashPinV2, hashPinLegacy } from '../../lib/crypto.js';
import { rebuildModel } from '../../lib/aiCategorizer.js';
import { Ic, LynxLogo, LynxLogoWhite, StickyHeader } from '../ui.jsx';
import { SetupPin } from '../auth.jsx';
import { saveToGoogleDrive, loadFromGoogleDrive, isDriveConfigured, revokeGoogleToken } from '../../lib/googleDriveBackup.js';
import { exportReportPdf, exportReportXlsx, exportReportCsvFallback } from '../../lib/reportExports.js';
import { ShareModal } from './ShareModal.jsx';

function GeneralSettings({ C, txs, setTxs, drafts, lists, setLists, prefs, updPrefs, user, updUser, sec, updSec, year, setSetupMode, setUnlocked, onBack, onAbout, onChangePinCrypto, onRemovePinCrypto, supaUser, onSignOut, onSyncToCloud, t, lang }) {
  const [pinChg,  setPinChg]  = useState(false);
  const [rmPin,   setRmPin]   = useState(false);
  const [vPin,    setVPin]    = useState("");
  const [vErr,    setVErr]    = useState("");
  const [share,   setShare]   = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [importPending, setImportPending] = useState(null);
  const importInputRef = useRef(null); // stable ref for file input
  const [importKey, setImportKey] = useState(0);
  // Fallback state: if no download/share path works (some APK wrappers block both),
  // we show the JSON in a modal with a Copy button so the user can paste into any
  // note/chat app and save it elsewhere.
  const [exportFallback, setExportFallback] = useState(null); // { filename, content }
  const [exportYear, setExportYear]         = useState("all"); // "all" or specific year

  // ── Google Drive backup state ──────────────────────────────────────────────
  const [driveStatus,  setDriveStatus]  = useState(null); // null | 'saving' | 'saved' | 'error' | 'loading'
  const [driveMsg,     setDriveMsg]     = useState("");
  const [driveLastAt,  setDriveLastAt]  = useState(() => load(K.prf, {}).driveLastBackup || null);

  const hasProfileData = user.firstName || user.lastName || user.phone || user.email;
  const [isEditingProfile, setIsEditingProfile] = useState(!hasProfileData);

  if (pinChg) return <SetupPin C={C} isChange onSave={async newPin=>{
    if (onChangePinCrypto) await onChangePinCrypto(newPin);
    setPinChg(false);
  }} onSkip={()=>setPinChg(false)} t={t}/>;

  const cy = curYear();

  const fld = { width:"100%", height:46, padding:"0 12px", background:C.cardAlt, border:`1.5px solid ${C.border}`, borderRadius:12, color:C.text, fontSize:14 };
  const lbl = { fontSize:11, fontWeight:600, color:C.textMuted, marginBottom:5, display:"flex", alignItems:"center", gap:5, letterSpacing:.3, textTransform:"uppercase" };

  const SL = ({text,icon}) => (
    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:9, marginTop:4 }}>
      <Ic n={icon} s={13} c={C.textMuted}/>
      <p style={{ fontSize:10, fontWeight:700, color:C.textMuted, letterSpacing:1.2, textTransform:"uppercase" }}>{text}</p>
    </div>
  );
  
  const Row = ({icon,label,sub,onClick,danger=false,right,toggle,toggled}) => (
    <button onClick={onClick} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:C.card, border:`1px solid ${danger?C.expense+"50":C.border}`, borderRadius:13, marginBottom:7, cursor:"pointer", textAlign:"left" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <Ic n={icon} s={16} c={danger?C.expense:C.accent}/>
        <div>
          <div style={{ fontSize:14, fontWeight:500, color:danger?C.expense:C.text }}>{label}</div>
          {sub && <div style={{ fontSize:11, color:C.textMuted, marginTop:1 }}>{sub}</div>}
        </div>
      </div>
      {toggle
        ? <div style={{ width:44, height:24, borderRadius:12, background:toggled?C.income:C.border, position:"relative", transition:"background .2s", flexShrink:0 }}>
            <div style={{ position:"absolute", top:2, left:toggled?20:2, width:20, height:20, borderRadius:"50%", background:"#fff", transition:"left .2s" }}/>
          </div>
        : right!==false && <div style={{ display:"flex", alignItems:"center", gap:5 }}>{right && <span style={{ fontSize:12, color:C.textMuted }}>{right}</span>}<Ic n="chevron" s={14} c={C.textMuted} style={{ transform:"rotate(-90deg)" }}/></div>
      }
    </button>
  );

  // Complete backup — serializes all app data except PIN hash (safety).
  // Instead of trying to silently pick the "right" save path (which fails
  // ── Google Drive handlers ──────────────────────────────────────────────────
  const buildBackupPayload = () => {
    const yr = exportYear === "all" ? null : parseInt(exportYear);
    const filtTxs = yr ? txs.filter(x => new Date(x.date).getFullYear() === yr) : txs;
    return {
      __moja_lova_backup: true, version: 2,
      exportedAt: new Date().toISOString(), exportYear: yr || "all",
      data: { txs: filtTxs, lists, user, prefs: { ...prefs, lastBackupAt: Date.now() } },
    };
  };

  const driveBackup = async () => {
    setDriveStatus("saving"); setDriveMsg("");
    try {
      const payload = buildBackupPayload();
      const result  = await saveToGoogleDrive(payload);
      const now = Date.now();
      updPrefs({ lastBackupAt: now, driveLastBackup: result.updatedAt });
      setDriveLastAt(result.updatedAt);
      setDriveStatus("saved");
      setDriveMsg(t("Backup spremljen na Google Drive."));
    } catch (e) {
      setDriveStatus("error");
      setDriveMsg(e.message || t("Greška pri spajanju s Google Driveom."));
    }
  };

  const driveRestore = async () => {
    setDriveStatus("loading"); setDriveMsg("");
    try {
      const payload = await loadFromGoogleDrive();
      if (!payload) { setDriveStatus("error"); setDriveMsg(t("Nema backupa na Google Driveu.")); return; }
      const data = payload.__moja_lova_backup ? payload.data : payload;
      if (!data || !data.txs) { setDriveStatus("error"); setDriveMsg(t("Datoteka nije valjan backup.")); return; }
      if (data.txs)   setTxs(data.txs);
      if (data.lists) setLists(data.lists);
      if (data.user)  updUser(data.user);
      updPrefs({ ...data.prefs, onboarded: true, lastBackupAt: Date.now() });
      setDriveStatus("saved"); setDriveMsg(t("Podaci vraćeni s Google Drivea."));
    } catch (e) {
      setDriveStatus("error"); setDriveMsg(e.message || t("Greška pri čitanju s Google Drivea."));
    }
  };

  // unpredictably in WebView/APK environments), we ALWAYS show the backup
  // content in a modal with three clear action buttons: Copy, Share, Download.
  // Whatever fails, the user always has a working option.
  const fullExport = () => {
    try {
      const yr = exportYear === "all" ? null : parseInt(exportYear);
      const filteredTxs = yr ? txs.filter(x => new Date(x.date).getFullYear() === yr) : txs;
      const payload = {
        __moja_lova_backup: true,
        version: 1,
        exportedAt: new Date().toISOString(),
        app: "Moja Lova",
        brand: "MoneyLynx",
        exportYear: yr || "all",
        data: {
          txs: filteredTxs,
          drafts,
          lists,
          user,
          prefs: load(K.prf, {}),
        }
      };
      const jsonStr  = JSON.stringify(payload, null, 2);
      const yearSuffix = yr ? `_${yr}` : "";
      const filename = `moja_lova_backup${yearSuffix}_${new Date().toISOString().split("T")[0]}.json`;
      setExportFallback({ filename, content: jsonStr });
    } catch {
      alert(t("Greška pri čitanju datoteke."));
    }
  };

  const reportArgs = () => ({ txs, lists, prefs, user, year });

  const runReportExport = async (kind) => {
    try {
      if (kind === "pdf") await exportReportPdf(reportArgs());
      if (kind === "proPdf") await exportReportPdf(reportArgs(), { pro: true });
      if (kind === "xlsx") await exportReportXlsx(reportArgs());
    } catch (e) {
      console.warn("Report export failed", e);
      if (kind === "xlsx") {
        exportReportCsvFallback(reportArgs());
        alert(t("XLSX modul nije dostupan. Izvezen je CSV fallback."));
      } else {
        alert(t("Izvoz izvještaja nije uspio. Provjeri internetsku vezu i pokušaj ponovno."));
      }
    }
  };

  // ----- Pomocna funkcija za parsiranje JSON-a (sinkrona, samo parsira, ne postavlja state)
  const parseImportJsonRaw = (jsonText) => {
    let parsed;
    try { parsed = JSON.parse(jsonText); }
    catch (e) { throw new Error(t("Datoteka nije valjan Moja Lova backup.")); }
    let data = null;
    if (parsed && parsed.__moja_lova_backup && parsed.data && typeof parsed.data === "object") {
      data = parsed.data;
    } else if (Array.isArray(parsed)) {
      data = { txs: parsed };
    }
    if (!data) throw new Error(t("Datoteka nije valjan Moja Lova backup."));
    const txCount = Array.isArray(data.txs) ? data.txs.length : 0;
    return { data, txCount };
  };

  // ----- Native import za Capacitor (koristi FilePicker)
  const handleNativeImport = async () => {
    try {
      const result = await FilePicker.pickFiles({
        types: ["application/json", "text/plain"],
        readData: true,
      });
      if (!result?.files?.length) return;
      const file = result.files[0];
      if (!file.data) { alert(t("Greška pri čitanju datoteke.")); return; }
      const decoded = atob(file.data);
      const { data, txCount } = parseImportJsonRaw(decoded);
      // Odgoda 1000ms – Capacitor "resume" event se završi, UI se smiri
      setTimeout(() => {
        setImportPending({ data, txCount });
      }, 1000);
    } catch (err) {
      console.error("FilePicker error:", err);
      // Fallback na HTML input ako nešto pođe po krivu
      if (importInputRef.current) importInputRef.current.click();
    }
  };

  // ----- Web fallback (klasični file input)
  const fullImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => alert(t("Greška pri čitanju datoteke."));
    reader.onload = (ev) => {
      try {
        const { data, txCount } = parseImportJsonRaw(ev.target.result);
        setImportPending({ data, txCount });
      } catch (err) {
        alert(err.message);
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!importPending) return;
    const { data } = importPending;
    try {
      // Write to localStorage
      if (Array.isArray(data.txs))    save(K.db,  data.txs);
      if (Array.isArray(data.drafts)) save(K.drf, data.drafts);
      if (data.lists && typeof data.lists === "object") save(K.lst, { ...DEF_LISTS, ...data.lists });
      if (data.user  && typeof data.user  === "object") save(K.usr, data.user);
      if (data.prefs && typeof data.prefs === "object") {
        save(K.prf, { ...load(K.prf,{}), ...data.prefs, onboarded: true, lastBackupAt: Date.now(), backupSnoozedUntil: null });
      }

      // Update React state directly — no reload needed, no Capacitor issues
      if (Array.isArray(data.txs))    setTxs(data.txs);
      if (data.lists && typeof data.lists === "object") setLists({ ...DEF_LISTS, ...data.lists });
      if (data.user  && typeof data.user  === "object") updUser(data.user);
      if (data.prefs && typeof data.prefs === "object") updPrefs({ ...data.prefs, onboarded: true, lastBackupAt: Date.now(), backupSnoozedUntil: null });

      // Train AI model on imported transactions
      if (Array.isArray(data.txs)) rebuildModel(data.txs);

      setImportPending(null);
      // Close settings and go back to show imported data
      if (onBack) onBack();
    } catch (err) {
      console.error("Import error:", err);
      setImportPending(null);
      alert(t("Greška pri vraćanju podataka."));
    }
  };

  const removePIN = async () => {
    let isCorrect = false;
    if (sec.pinHashVersion === "v2") {
      const h = await hashPinV2(vPin, sec.pinSalt);
      isCorrect = h === sec.pinHash;
    } else {
      const h = await hashPinLegacy(vPin);
      isCorrect = h === sec.pinHash;
    }
    if (isCorrect) {
      if (onRemovePinCrypto) onRemovePinCrypto();
      // Also clear biometry.
      updSec({ pinHash:null, pinSalt:null, encSalt:null, pinHashVersion:null,
               bioEnabled:false, bioCredId:null, attempts:0, totalFailed:0, lockedUntil:null });
      setRmPin(false); setVPin(""); setVErr("");
    } else {
      setVErr(t("Pogrešan PIN"));
    }
  };

  const toggleBio = async () => {
    if (sec.bioEnabled) {
      const currentSec = JSON.parse(localStorage.getItem("ml_sec") || "{}");
      const newSec = { ...currentSec, bioEnabled: false, bioCredId: null };
      localStorage.setItem("ml_sec", JSON.stringify(newSec));
      updSec({ bioEnabled: false, bioCredId: null });
      return;
    }
    if (!window.PublicKeyCredential) {
      alert(t("Tvoj uređaj/preglednik ne podržava WebAuthn (Biometriju) ili aplikacija nije na HTTPS protokolu."));
      return;
    }
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = Uint8Array.from("moneylynx_user", c=>c.charCodeAt(0));
      const createOpt = {
        publicKey: {
          rp: { name: "Moja Lova", id: window.location.hostname || "localhost" },
          user: { id: userId, name: user.email || t("Korisnik"), displayName: [user.firstName, user.lastName].join(" ") || t("Korisnik") },
          challenge: challenge,
          pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
          authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
          timeout: 60000
        }
      };
      const cred = await navigator.credentials.create(createOpt);
      const idBase64 = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
      // Read current sec directly from localStorage to avoid stale prop.
      const currentSec = JSON.parse(localStorage.getItem("ml_sec") || "{}");
      const newSec = { ...currentSec, bioEnabled: true, bioCredId: idBase64 };
      localStorage.setItem("ml_sec", JSON.stringify(newSec));
      updSec({ bioEnabled: true, bioCredId: idBase64 });
      alert(t("Biometrija uspješno aktivirana!"));
    } catch (e) {
      alert(t("Postavljanje biometrije nije uspjelo.\nProvjeri je li aplikacija na sigurnoj vezi (HTTPS) i koristiš li podržan uređaj."));
    }
  };

  const dn = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <div className="fi" style={{ width:"100%" }}>
      <StickyHeader C={C} icon="gear" title={t("Opće postavke")}
        right={<button onClick={onBack} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, color:C.textMuted, padding:"8px 14px", borderRadius:10, fontSize:13, cursor:"pointer" }}>{t("Natrag")}</button>}
      />
      <div style={{ padding:"12px 16px 0" }}>

        <SL text={t("Profil korisnika")} icon="user"/>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:15, padding:15, marginBottom:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
            <div style={{ width:46, height:46, borderRadius:14, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:"flex", alignItems:"center", justifyContent:"center" }}><Ic n="user" s={22} c="#fff"/></div>
            <div>
              <div style={{ fontSize:15, fontWeight:600, color:C.text }}>{dn||"Korisnik"}</div>
              <div style={{ fontSize:12, color:C.textMuted }}>{user.email||t("Nije upisana e-mail adresa")}</div>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div>
                <label style={{...lbl, opacity:isEditingProfile?1:0.5}}><Ic n="user" s={11} c={C.textMuted}/>{t("Ime")}</label>
                <input type="text" placeholder="Npr. John" value={user.firstName} disabled={!isEditingProfile} onChange={e=>updUser({firstName:e.target.value})} style={{...fld, opacity:isEditingProfile?1:0.5}}/>
              </div>
              <div>
                <label style={{...lbl, opacity:isEditingProfile?1:0.5}}><Ic n="user" s={11} c={C.textMuted}/>{t("Prezime")}</label>
                <input type="text" placeholder="Npr. Vivoda" value={user.lastName} disabled={!isEditingProfile} onChange={e=>updUser({lastName:e.target.value})} style={{...fld, opacity:isEditingProfile?1:0.5}}/>
              </div>
            </div>
            <div>
              <label style={{...lbl, opacity:isEditingProfile?1:0.5}}><Ic n="phone" s={11} c={C.textMuted}/>{t("Telefon")}</label>
              <input type="tel" placeholder="+385 91 234 5678" value={user.phone} disabled={!isEditingProfile} onChange={e=>updUser({phone:e.target.value})} style={{...fld, opacity:isEditingProfile?1:0.5}}/>
            </div>
            <div>
              <label style={{...lbl, opacity:isEditingProfile?1:0.5}}><Ic n="mail" s={11} c={C.textMuted}/>{t("E-mail")}</label>
              <input type="email" placeholder="npr. bojan@email.com" value={user.email} disabled={!isEditingProfile} onChange={e=>updUser({email:e.target.value})} style={{...fld, opacity:isEditingProfile?1:0.5}}/>
            </div>
            
            {isEditingProfile ? (
              <button onClick={() => setIsEditingProfile(false)} 
                  style={{ padding:"11px 0", background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:12, color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all .3s" }}>
                <Ic n="check" s={16} c="#fff"/>{t("Spremi profil")}
              </button>
            ) : (
              <button onClick={() => setIsEditingProfile(true)} 
                  style={{ padding:"11px 0", background:`linear-gradient(135deg,${C.income},#059669)`, border:"none", borderRadius:12, color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all .3s" }}>
                <Ic n="edit" s={16} c="#fff"/>{t("Izmijeni profil")}
              </button>
            )}
          </div>
        </div>

        <div style={{ marginTop:14, marginBottom:6 }}>
          <SL text={t("Izgled")} icon="sun"/>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:13, marginBottom:7 }}>
            <p style={{ fontSize:12, color:C.textMuted, marginBottom:10 }}>{t("Tema prikaza")}</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:7 }}>
              {[["dark","moon",t("Tamni")],["light","sun",t("Svijetli")],["auto","auto",t("Auto")]].map(([id,ic,lb])=>{
                const a = prefs.theme===id;
                return <button key={id} onClick={()=>updPrefs({theme:id})} style={{ padding:"10px 6px", borderRadius:11, border:`1.5px solid ${a?C.accent:C.border}`, background:a?`${C.accent}15`:"transparent", color:a?C.accent:C.textMuted, fontSize:11, fontWeight:a?700:400, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <Ic n={ic} s={17} c={a?C.accent:C.textMuted}/>{lb}
                </button>;
              })}
            </div>
          </div>
          
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:13, marginBottom:7 }}>
            <p style={{ fontSize:12, color:C.textMuted, marginBottom:10 }}>{t("Jezik aplikacije")}</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
              {[["hr","Hrvatski"],["en","English"]].map(([id,lb])=>{
                const a = prefs.lang===id;
                return <button key={id} onClick={()=>updPrefs({lang:id})} style={{ padding:"10px 6px", borderRadius:11, border:`1.5px solid ${a?C.accent:C.border}`, background:a?`${C.accent}15`:"transparent", color:a?C.accent:C.textMuted, fontSize:12, fontWeight:a?700:500, cursor:"pointer" }}>{lb}</button>;
              })}
            </div>
          </div>

          {/* Currency selector */}
          <div style={{ marginBottom:16 }}>
            <p style={{ fontSize:12, color:C.textMuted, marginBottom:8 }}>{t("Valuta")}</p>
            <select value={prefs.currency||"EUR"} onChange={e=>updPrefs({currency:e.target.value})}
              style={{ width:"100%", height:42, padding:"0 12px", background:C.cardAlt, border:`1.5px solid ${C.border}`, borderRadius:11, color:C.text, fontSize:13 }}>
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Timezone selector */}
          <div style={{ marginBottom:4 }}>
            <p style={{ fontSize:12, color:C.textMuted, marginBottom:8 }}>{t("Vremenska zona")}</p>
            <select value={prefs.timezone||"Europe/Zagreb"} onChange={e=>updPrefs({timezone:e.target.value})}
              style={{ width:"100%", height:42, padding:"0 12px", background:C.cardAlt, border:`1.5px solid ${C.border}`, borderRadius:11, color:C.text, fontSize:13 }}>
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop:14, marginBottom:6 }}>
          <SL text={t("Sigurnost")} icon="shield"/>
          {!sec.pinHash
            ? <Row icon="lock" label={t("Postavi PIN zaštitu")} sub={t("Aplikacija nije zaštićena")} onClick={()=>setSetupMode(true)}/>
            : <>
                <Row icon="lock" label={t("Promijeni PIN")} sub={`${t("Zaštita aktivna")} · max ${MAX_ATT} ${t("pokušaja")}`} onClick={()=>setPinChg(true)}/>
                <Row icon="finger" label={t("Biometrija")} sub={sec.bioEnabled?t("Aktivno"):t("Omogući fingerprint/Face ID")} toggle toggled={sec.bioEnabled} onClick={toggleBio}/>
                <Row icon="unlock" label={t("Ukloni PIN zaštitu")} danger onClick={()=>setRmPin(v=>!v)} right={false}/>
                {rmPin && (
                  <div style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:12, padding:13, marginBottom:7 }}>
                    <p style={{ fontSize:12, color:C.textMuted, marginBottom:8 }}>{t("Unesite trenutni PIN:")}</p>
                    <div style={{ display:"flex", gap:8 }}>
                      <input type="password" placeholder="PIN" value={vPin} onChange={e=>{ setVPin(e.target.value); setVErr(""); }} style={{...fld,flex:1,height:40}} maxLength={6}/>
                      <button onClick={removePIN} style={{ padding:"0 14px", background:C.expense, border:"none", borderRadius:10, color:"#fff", fontWeight:600, cursor:"pointer", height:40, fontSize:13 }}>{t("Ukloni")}</button>
                    </div>
                    {vErr && <p style={{ fontSize:11, color:C.expense, marginTop:5 }}>{vErr}</p>}
                  </div>
                )}
              </>
          }
        </div>

        <div style={{ marginTop:14, marginBottom:6 }}>
          <SL text={t("Dijeli i izvezi")} icon="share"/>
          
          {/* 1) SHARE — send via WhatsApp/Telegram/E-mail/CSV etc. */}
          <button onClick={()=>setShare(true)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 15px", background:`linear-gradient(135deg,${C.accent}20,${C.income}15)`, border:`1px solid ${C.accent}40`, borderRadius:13, marginBottom:7, cursor:"pointer" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <Ic n="share" s={19} c={C.accent}/>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{t("Podijeli podatke")}</div>
                <div style={{ fontSize:11, color:C.textMuted }}>{t("E-mail, WhatsApp, Telegram…")}</div>
              </div>
            </div>
            <Ic n="chevron" s={14} c={C.accent} style={{ transform:"rotate(-90deg)" }}/>
          </button>

          {/* 2) EXPORT (BACKUP) — full JSON backup of all data */}
          {/* Year filter row */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, padding:"0 2px" }}>
            <Ic n="cal" s={13} c={C.textMuted}/>
            <span style={{ fontSize:12, color:C.textMuted, flex:1 }}>{t("Izvezi godinu")}:</span>
            <select value={exportYear} onChange={e=>setExportYear(e.target.value)}
              style={{ padding:"5px 10px", background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:12, cursor:"pointer" }}>
              <option value="all">{t("Sve godine")}</option>
              {Array.from({length:6},(_,i)=>curYear()-i).map(y=>(
                <option key={y} value={y}>{y}.</option>
              ))}
            </select>
          </div>
          <button onClick={fullExport} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 15px", background:`linear-gradient(135deg,${C.warning}20,${C.warning}08)`, border:`1px solid ${C.warning}40`, borderRadius:13, marginBottom:7, cursor:"pointer" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <Ic n="dl" s={19} c={C.warning}/>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{t("Izvezi (Backup)")}</div>
                <div style={{ fontSize:11, color:C.textMuted }}>
                  {exportYear === "all" ? t("Napravi kopiju svih podataka u .json datoteci") : `${exportYear}. · ${txs.filter(x=>new Date(x.date).getFullYear()===parseInt(exportYear)).length} ${t("transakcija")}`}
                </div>
              </div>
            </div>
            <Ic n="chevron" s={14} c={C.warning} style={{ transform:"rotate(-90deg)" }}/>
          </button>

          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:12, marginBottom:7 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:4, display:"flex", alignItems:"center", gap:6 }}>
              <Ic n="bar" s={14} c={C.accent}/>{t("Izvještaji PDF / Excel")}
            </div>
            <div style={{ fontSize:11, color:C.textMuted, lineHeight:1.45, marginBottom:10 }}>
              {t("Osnovni grafovi, mjesečni pregled, top kategorije i budžeti. PRO izvještaj dodaje usporedbe, ciljeve i prognoze.")}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <button onClick={()=>runReportExport("pdf")} style={{ padding:"10px 8px", background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:11, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                <Ic n="dl" s={13} c="#fff"/>PDF
              </button>
              <button onClick={()=>runReportExport("xlsx")} style={{ padding:"10px 8px", background:`linear-gradient(135deg,${C.income},#059669)`, border:"none", borderRadius:11, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                <Ic n="dl" s={13} c="#fff"/>XLSX
              </button>
              <button onClick={()=>runReportExport("proPdf")} style={{ gridColumn:"1 / -1", padding:"10px 8px", background:`${C.warning}18`, border:`1px solid ${C.warning}50`, borderRadius:11, color:C.warning, fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                <Ic n="zap" s={13} c={C.warning}/>PRO PDF report
              </button>
            </div>
          </div>

          {/* 3) IMPORT (RESTORE) — FilePicker native na APK, label fallback na webu */}
          <div style={{ marginBottom:7 }}>
            {isCapacitor() ? (
              <div onClick={handleNativeImport}
                style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 15px", background:`linear-gradient(135deg,${C.income}18,${C.income}08)`, border:`1px solid ${C.income}40`, borderRadius:13, cursor:"pointer" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <Ic n="ul" s={19} c={C.income}/>
                  <div style={{ textAlign:"left" }}>
                    <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{t("U\u010ditaj (Import / Restore)")}</div>
                    <div style={{ fontSize:11, color:C.textMuted }}>{t("Vrati podatke iz prethodne kopije")}</div>
                  </div>
                </div>
                <Ic n="chevron" s={14} c={C.income} style={{ transform:"rotate(-90deg)" }}/>
              </div>
            ) : (
              <>
                <label htmlFor="ml-import-file" style={{ display:"block", width:"100%", cursor:"pointer" }}>
                  <div style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 15px", background:`linear-gradient(135deg,${C.income}18,${C.income}08)`, border:`1px solid ${C.income}40`, borderRadius:13, cursor:"pointer" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <Ic n="ul" s={19} c={C.income}/>
                      <div style={{ textAlign:"left" }}>
                        <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{t("U\u010ditaj (Import / Restore)")}</div>
                        <div style={{ fontSize:11, color:C.textMuted }}>{t("Vrati podatke iz prethodne kopije")}</div>
                      </div>
                    </div>
                    <Ic n="chevron" s={14} c={C.income} style={{ transform:"rotate(-90deg)" }}/>
                  </div>
                </label>
                <input key={importKey} ref={importInputRef} id="ml-import-file" type="file"
                  accept=".json,application/json,text/plain"
                  onChange={fullImport} style={{ display:"none" }}/>
              </>
            )}
          </div>

        {/* ── Google Drive backup section ──────────────────────────────── */}
        {isDriveConfigured() && (
          <div style={{ marginTop: 14, marginBottom: 6 }}>
            <SL text="Google Drive" icon="repeat"/>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 13, padding: "12px 14px", marginBottom: 7 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#4285F420", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20 }}>
                  ☁️
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Google Drive Backup</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>
                    {driveLastAt
                      ? `${t("Zadnji backup")}: ${new Date(driveLastAt).toLocaleString("hr-HR")}`
                      : t("Automatski sigurni backup u tvoj Drive")}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button onClick={driveBackup} disabled={driveStatus === "saving"}
                  style={{ padding: "10px 12px", background: `linear-gradient(135deg,#4285F420,#4285F408)`, border: "1px solid #4285F440", borderRadius: 10, cursor: driveStatus === "saving" ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                  {driveStatus === "saving"
                    ? <><span style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid #4285F4`, borderTopColor: "transparent", animation: "spin 1s linear infinite", display: "inline-block" }}/><span style={{ fontSize: 12, fontWeight: 600, color: "#4285F4" }}>{t("Sprema…")}</span></>
                    : <><Ic n="dl" s={14} c="#4285F4"/><span style={{ fontSize: 12, fontWeight: 600, color: "#4285F4" }}>{t("Spremi na Drive")}</span></>
                  }
                </button>
                <button onClick={driveRestore} disabled={driveStatus === "loading"}
                  style={{ padding: "10px 12px", background: `${C.cardAlt}`, border: `1px solid ${C.border}`, borderRadius: 10, cursor: driveStatus === "loading" ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                  {driveStatus === "loading"
                    ? <><span style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${C.accent}`, borderTopColor: "transparent", animation: "spin 1s linear infinite", display: "inline-block" }}/><span style={{ fontSize: 12, fontWeight: 600, color: C.accent }}>{t("Učitava…")}</span></>
                    : <><Ic n="ul" s={14} c={C.accent}/><span style={{ fontSize: 12, fontWeight: 600, color: C.accent }}>{t("Vrati s Drivea")}</span></>
                  }
                </button>
              </div>

              {driveMsg && (
                <div style={{ marginTop: 10, padding: "8px 12px", background: driveStatus === "error" ? `${C.expense}15` : `${C.income}15`, border: `1px solid ${driveStatus === "error" ? C.expense : C.income}40`, borderRadius: 8, fontSize: 12, color: driveStatus === "error" ? C.expense : C.income, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  <Ic n={driveStatus === "error" ? "alert" : "check"} s={13} c={driveStatus === "error" ? C.expense : C.income}/>
                  {driveMsg}
                </div>
              )}

              <div style={{ marginTop: 10, padding: "8px 10px", background: C.cardAlt, borderRadius: 8, fontSize: 10, color: C.textMuted, lineHeight: 1.5 }}>
                ℹ️ {t("Backup se sprema u tvoj privatni prostor na Google Driveu (appdata folder). Aplikacija ne može pristupiti tvojim ostalim Drive datotekama.")}
              </div>
            </div>
          </div>
        )}

        {/* Account section */}
        {supaUser && (
          <div style={{ marginTop:14, marginBottom:6 }}>
            <SL text={t("Račun")} icon="user"/>
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:"12px 14px", marginBottom:7, display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:`${C.accent}20`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Ic n="user" s={18} c={C.accent}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {supaUser.user_metadata?.full_name || supaUser.email}
                </div>
                <div style={{ fontSize:11, color:C.textMuted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {supaUser.email}
                </div>
              </div>
            </div>
            <Row icon="unlock" label={t("Odjava")} danger onClick={onSignOut} right={false}/>
            {onSyncToCloud && <Row icon="repeat" label={t("Sinkroniziraj s oblakom")} onClick={async()=>{ await onSyncToCloud(txs, lists, user); alert(t("Sinkronizacija završena.")); }} right={false}/>}
          </div>
        )}

        <div style={{ marginTop:14, marginBottom:6 }}>
          <SL text={t("Opasna zona")} icon="alert"/>
          {!confirm
            ? <Row icon="trash" label={t("Obriši sve podatke")} danger onClick={()=>setConfirm(true)} right={false}/>
            : <div className="su" style={{ background:`${C.expense}12`, border:`1px solid ${C.expense}40`, borderRadius:13, padding:15, marginBottom:7 }}>
                <p style={{ fontSize:13, color:C.expense, fontWeight:600, marginBottom:12, display:"flex", alignItems:"center", gap:6 }}><Ic n="alert" s={14} c={C.expense}/>{t("Ovo se ne može poništiti!")}</p>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>{ setTxs([]); setConfirm(false); }} style={{ flex:1, padding:11, background:C.expense, border:"none", borderRadius:10, color:"#fff", fontWeight:700, cursor:"pointer" }}>{t("Da, obriši")}</button>
                  <button onClick={()=>setConfirm(false)} style={{ flex:1, padding:11, background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, cursor:"pointer" }}>{t("Odustani")}</button>
                </div>
              </div>
          }

          {/* ── Import confirm overlay ─────────────────────────────────── */}
          {importPending && (
            <div style={{ position:"fixed", inset:0, zIndex:999, background:"rgba(0,0,0,.6)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
              <div style={{ background:C.card, borderRadius:20, padding:24, maxWidth:340, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,.4)" }}>
                <div style={{ fontSize:28, textAlign:"center", marginBottom:12 }}>📂</div>
                <div style={{ fontSize:16, fontWeight:700, color:C.text, textAlign:"center", marginBottom:8 }}>{t("Vrati podatke?")}</div>
                <div style={{ fontSize:13, color:C.textMuted, textAlign:"center", lineHeight:1.6, marginBottom:20 }}>
                  {t("Bit će uvezeno")} <strong style={{ color:C.text }}>{importPending.txCount}</strong> {t("transakcija. Trenutni podaci bit će zamijenjeni.")}
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={()=>setImportPending(null)}
                    style={{ flex:1, padding:"12px 0", background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:12, color:C.text, fontSize:14, fontWeight:600, cursor:"pointer" }}>
                    {t("Odustani")}
                  </button>
                  <button onClick={confirmImport}
                    style={{ flex:1, padding:"12px 0", background:C.income, border:"none", borderRadius:12, color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>
                    {t("Da, vrati")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:15, marginBottom:28, marginTop:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:"flex", alignItems:"center", justifyContent:"center" }}><LynxLogoWhite s={20}/></div>
            <div style={{ flex:1 }}><div style={{ fontSize:15, fontWeight:700, color:C.text }}>{t("Moja Lova")}</div><div style={{ fontSize:11, color:C.textMuted }}>{t("Verzija")} 1.1</div></div>
            {onAbout && (
              <button onClick={onAbout}
                style={{ width:32, height:32, borderRadius:"50%", background:`${C.accent}20`, border:`1.5px solid ${C.accent}50`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
                <span style={{ fontSize:14, fontWeight:700, color:C.accent, fontFamily:"serif", lineHeight:1 }}>i</span>
              </button>
            )}
          </div>
          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:11 }}>
            <p style={{ fontSize:13, fontWeight:600, color:C.accent }}>{t("Moja Lova by MoneyLynx")}</p>
            <p style={{ fontSize:11, color:C.textMuted, marginTop:3 }}>E-mail: <a href="mailto:info.mojalova@moneylynx.net" style={{ color:C.accent, textDecoration:"none" }}>info.mojalova@moneylynx.net</a></p>
            <p style={{ fontSize:11, color:C.textMuted, marginTop:3 }}>© {cy} MoneyLynx · {t("Sva prava pridržana.")}</p>
            <p style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{t("Za osobnu upotrebu. · Nije za komercijalnu upotrebu.")}</p>
          </div>
        </div>
        
        {share && <ShareModal C={C} txs={txs} year={year} user={user} onClose={()=>setShare(false)} t={t} lang={lang} />}

        {/* Export modal — always shown when the user clicks Export (Backup).
            Provides three reliable save paths so at least one works on any
            device: Copy (works everywhere), Share (native share sheet),
            Download (browser download). */}
        {exportFallback && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={e=>{ if(e.target===e.currentTarget) setExportFallback(null); }}>
            <div className="su" style={{ background:C.card, borderRadius:18, width:"100%", maxWidth:420, padding:20, border:`1px solid ${C.border}`, maxHeight:"85vh", display:"flex", flexDirection:"column" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <h3 style={{ fontSize:16, fontWeight:700, color:C.text, display:"flex", alignItems:"center", gap:8 }}>
                  <Ic n="dl" s={17} c={C.warning}/>{t("Izvezi (Backup)")}
                </h3>
                <button onClick={()=>setExportFallback(null)} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:6, cursor:"pointer" }}>
                  <Ic n="x" s={14} c={C.textMuted}/>
                </button>
              </div>
              <p style={{ fontSize:12, color:C.textMuted, marginBottom:10, lineHeight:1.5 }}>
                {t("Spremi backup koristeći jednu od opcija ispod. Ako jedna ne radi, druga hoće.")}
              </p>
              <div style={{ fontSize:11, color:C.textSub, marginBottom:8, fontFamily:"'JetBrains Mono',monospace" }}>
                {exportFallback.filename}
              </div>
              <textarea
                readOnly
                value={exportFallback.content}
                onFocus={e=>e.target.select()}
                style={{ width:"100%", flex:1, minHeight:140, padding:10, background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:11, fontFamily:"'JetBrains Mono',monospace", resize:"none", marginBottom:12 }}
              />
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                {/* Copy — works in every environment */}
                <button onClick={async ()=>{
                  try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      await navigator.clipboard.writeText(exportFallback.content);
                    } else {
                      const ta = document.createElement("textarea");
                      ta.value = exportFallback.content;
                      document.body.appendChild(ta);
                      ta.select();
                      document.execCommand("copy");
                      document.body.removeChild(ta);
                    }
                    updPrefs({ lastBackupAt: Date.now(), backupSnoozedUntil: null });
                    alert(t("Kopirano!"));
                  } catch {
                    alert(t("Greška pri čitanju datoteke."));
                  }
                }} style={{ padding:12, background:`linear-gradient(135deg,${C.warning},#F59E0B)`, border:"none", borderRadius:12, color:"#000", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                  <Ic n="copy" s={14} c="#000"/>{t("Kopiraj")}
                </button>

                {/* Share — tries Web Share API (file first, then text) */}
                <button onClick={async ()=>{
                  const { filename, content } = exportFallback;
                  try {
                    if (typeof File !== "undefined" && typeof navigator !== "undefined" && typeof navigator.canShare === "function") {
                      const file = new File([content], filename, { type: "application/json" });
                      if (navigator.canShare({ files: [file] })) {
                        await navigator.share({ files: [file], title: "Moja Lova — Backup", text: filename });
                        updPrefs({ lastBackupAt: Date.now(), backupSnoozedUntil: null });
                        return;
                      }
                    }
                    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
                      await navigator.share({ title: filename, text: content });
                      updPrefs({ lastBackupAt: Date.now(), backupSnoozedUntil: null });
                      return;
                    }
                    alert(t("Dijeljenje nije podržano na ovom uređaju. Koristi Kopiraj ili Preuzmi."));
                  } catch (shareErr) {
                    if (shareErr && shareErr.name === "AbortError") return;
                    alert(t("Dijeljenje nije uspjelo. Koristi Kopiraj ili Preuzmi."));
                  }
                }} style={{ padding:12, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:12, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                  <Ic n="share" s={14} c="#fff"/>{t("Podijeli")}
                </button>

                {/* Download — prefers native Capacitor save on APK (guaranteed
                    to write a real file into Documents); falls back to the
                    classic browser download on web. */}
                <button onClick={async ()=>{
                  const { filename, content } = exportFallback;
                  // 1) Try native (Capacitor Filesystem + Share).
                  if (isCapacitor()) {
                    const ok = await nativeSaveAndShare(filename, content);
                    if (ok) {
                      updPrefs({ lastBackupAt: Date.now(), backupSnoozedUntil: null });
                      alert(t("Backup uspješno spremljen."));
                      return;
                    }
                    // If native failed (plugins missing or permission denied),
                    // fall through to web download below.
                  }
                  // 2) Web fallback — standard anchor download.
                  try {
                    const blob = new Blob([content], { type: "application/json" });
                    const url  = URL.createObjectURL(blob);
                    const a    = document.createElement("a");
                    a.href = url;
                    a.download = filename;
                    a.rel = "noopener";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                    updPrefs({ lastBackupAt: Date.now(), backupSnoozedUntil: null });
                  } catch {
                    alert(t("Preuzimanje nije uspjelo. Koristi Kopiraj ili Podijeli."));
                  }
                }} style={{ padding:12, background:`linear-gradient(135deg,${C.income},#059669)`, border:"none", borderRadius:12, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                  <Ic n="dl" s={14} c="#fff"/>{t("Preuzmi")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

export { GeneralSettings };
export default GeneralSettings;
