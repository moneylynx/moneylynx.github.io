import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from "recharts";

// ─── Constants ───────────────────────────────────────────────────────────────
const MONTHS = ["Siječanj","Veljača","Ožujak","Travanj","Svibanj","Lipanj","Srpanj","Kolovoz","Rujan","Listopad","Studeni","Prosinac"];
const MSHORT = ["Sij.","Velj.","Ožu.","Trav.","Svi.","Lip.","Srp.","Kol.","Ruj.","Lis.","Stu.","Pro."];
const sm = m => MSHORT[MONTHS.indexOf(m)] ?? m.slice(0,4);

const DEF_LISTS = {
  categories_expense: ["Hrana","Prijevoz","Režije","Kredit","Osiguranje","Porez","Visa premium","Zabava","Pretplata","Putovanja","Oprema","Radovi","Usluge","Investicije","Ostali izdaci"],
  categories_income:  ["Plaća","Uplata","Ostali primici"],
  locations:  ["Zagreb","Knežija","Kajini","Šimunčevec","Online","Ostalo"],
  payments:   ["Gotovina","Kartica (debitna)","Kreditna kartica","Bankovni prijenos","Online plaćanje"],
  statuses:   ["Plaćeno","Čeka plaćanje","U obradi"],
  recurring:  [],
};

const T = {
  dark: {
    bg:"#0D1B2A", card:"#112233", cardAlt:"#162840",
    accent:"#38BDF8", accentDk:"#0EA5E9", accentGlow:"#38BDF830",
    income:"#34D399", expense:"#F87171", warning:"#FBBF24",
    text:"#F1F5F9", textMuted:"#64748B", textSub:"#94A3B8",
    border:"#1E3A5F", navBg:"#0A1628",
  },
  light: {
    bg:"#F8FAFC", card:"#FFFFFF", cardAlt:"#F1F5F9",
    accent:"#0EA5E9", accentDk:"#0284C7", accentGlow:"#0EA5E930",
    income:"#059669", expense:"#DC2626", warning:"#D97706",
    text:"#0F172A", textMuted:"#64748B", textSub:"#475569",
    border:"#CBD5E1", navBg:"#FFFFFF",
  },
};

const CHART_COLORS = ["#38BDF8","#34D399","#F87171","#FBBF24","#A78BFA","#F472B6","#22D3EE","#86EFAC","#FCA5A5","#FCD34D","#C4B5FD","#FB923C"];
const MAX_ATT=5, LOCK_SEC=30, WIPE_AT=10;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtEur = n => {
  if (n == null || isNaN(n)) return "0,00 €";
  const a = Math.abs(n);
  const s = a.toFixed(2).replace(".",",").replace(/\B(?=(\d{3})+(?!\d))/g,".");
  return n < 0 ? `-${s} €` : `${s} €`;
};
const fDate = d => {
  if (!d) return "";
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,"0")}.${String(dt.getMonth()+1).padStart(2,"0")}.${dt.getFullYear()}.`;
};
const monthOf   = d => d ? MONTHS[new Date(d).getMonth()] ?? MONTHS[0] : MONTHS[0];
const curMonth  = () => MONTHS[new Date().getMonth()];
const curYear   = () => new Date().getFullYear();
const hashPin   = async p => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(p+"ml_salt"));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
};

const K = { db:"ml_data", prf:"ml_prefs", lst:"ml_lists", usr:"ml_user", sec:"ml_sec" };
const load = (k,fb) => { try { const v=localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const save = (k,v)  => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// ─── Icon system ─────────────────────────────────────────────────────────────
const Ic = ({ n, s=20, c="#fff", style={} }) => {
  const p = { fill:"none", stroke:c, strokeWidth:1.7, strokeLinecap:"round", strokeLinejoin:"round" };
  const map = {
    home:        <><path d="M3 12l9-9 9 9"{...p}/><path d="M5 10v10h4v-6h6v6h4V10"{...p}/></>,
    list:        <><line x1="8" y1="6" x2="21" y2="6"{...p}/><line x1="8" y1="12" x2="21" y2="12"{...p}/><line x1="8" y1="18" x2="21" y2="18"{...p}/><circle cx="3" cy="6"  r="1" fill={c} stroke="none"/><circle cx="3" cy="12" r="1" fill={c} stroke="none"/><circle cx="3" cy="18" r="1" fill={c} stroke="none"/></>,
    bar:         <><path d="M18 20V10M12 20V4M6 20v-6"{...p}/></>,
    gear:        <><circle cx="12" cy="12" r="3"{...p}/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"{...p}/></>,
    plus:        <><line x1="12" y1="5" x2="12" y2="19"{...p}/><line x1="5" y1="12" x2="19" y2="12"{...p}/></>,
    check:       <><polyline points="20 6 9 17 4 12"{...p}/></>,
    x:           <><line x1="18" y1="6" x2="6" y2="18"{...p}/><line x1="6" y1="6" x2="18" y2="18"{...p}/></>,
    edit:        <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"{...p}/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"{...p}/></>,
    trash:       <><polyline points="3 6 5 6 21 6"{...p}/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"{...p}/></>,
    search:      <><circle cx="11" cy="11" r="8"{...p}/><line x1="21" y1="21" x2="16.65" y2="16.65"{...p}/></>,
    arrow_l:     <><line x1="19" y1="12" x2="5" y2="12"{...p}/><polyline points="12 19 5 12 12 5"{...p}/></>,
    chevron:     <><polyline points="6 9 12 15 18 9"{...p}/></>,
    chevron_up:  <><polyline points="18 15 12 9 6 15"{...p}/></>,
    chevron_down:<><polyline points="6 9 12 15 18 9"{...p}/></>,
    wallet:      <><rect x="2" y="5" width="20" height="14" rx="2"{...p}/><path d="M2 10h20"{...p}/><circle cx="16" cy="15" r="1" fill={c} stroke="none"/></>,
    up:          <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"{...p}/><polyline points="17 6 23 6 23 12"{...p}/></>,
    down:        <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"{...p}/><polyline points="17 18 23 18 23 12"{...p}/></>,
    coins:       <><circle cx="8" cy="8" r="6"{...p}/><path d="M18.09 10.37A6 6 0 1110.34 18"{...p}/><path d="M7 6h1v4"{...p}/><line x1="16.71" y1="13.88" x2="17.71" y2="13.88"{...p}/></>,
    tag:         <><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"{...p}/><line x1="7" y1="7" x2="7.01" y2="7"{...p}/></>,
    cal:         <><rect x="3" y="4" width="18" height="18" rx="2"{...p}/><line x1="16" y1="2" x2="16" y2="6"{...p}/><line x1="8" y1="2" x2="8" y2="6"{...p}/><line x1="3" y1="10" x2="21" y2="10"/></>,
    user:        <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"{...p}/><circle cx="12" cy="7" r="4"{...p}/></>,
    phone:       <><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 01.22 4.18 2 2 0 012.18 2H5.18a2 2 0 012 1.72c.13.96.36 1.9.63 2.94a2 2 0 01-.45 2.11L6.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c1.04.27 1.98.5 2.94.63A2 2 0 0122 16.92z"{...p}/></>,
    mail:        <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"{...p}/><polyline points="22,6 12,13 2,6"{...p}/></>,
    dl:          <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"{...p}/><polyline points="7 10 12 15 17 10"{...p}/><line x1="12" y1="15" x2="12" y2="3"{...p}/></>,
    ul:          <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"{...p}/><polyline points="17 8 12 3 7 8"{...p}/><line x1="12" y1="3" x2="12" y2="15"{...p}/></>,
    share:       <><circle cx="18" cy="5" r="3"{...p}/><circle cx="6" cy="12" r="3"{...p}/><circle cx="18" cy="19" r="3"{...p}/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"{...p}/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"{...p}/></>,
    copy:        <><rect x="9" y="9" width="13" height="13" rx="2"{...p}/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"{...p}/></>,
    sun:         <><circle cx="12" cy="12" r="5"{...p}/><line x1="12" y1="1" x2="12" y2="3"{...p}/><line x1="12" y1="21" x2="12" y2="23"{...p}/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"{...p}/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"{...p}/><line x1="1" y1="12" x2="3" y2="12"{...p}/><line x1="21" y1="12" x2="23" y2="12"{...p}/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"{...p}/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"{...p}/></>,
    moon:        <><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"{...p}/></>,
    auto:        <><circle cx="12" cy="12" r="9"{...p}/><path d="M12 3v9l4 2"{...p}/></>,
    alert:       <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"{...p}/><line x1="12" y1="9" x2="12" y2="13"{...p}/><line x1="12" y1="17" x2="12.01" y2="17"{...p}/></>,
    pin:         <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"{...p}/><circle cx="12" cy="10" r="3"{...p}/></>,
    card:        <><rect x="1" y="4" width="22" height="16" rx="2"{...p}/><line x1="1" y1="10" x2="23" y2="10"{...p}/></>,
    info:        <><circle cx="12" cy="12" r="10"{...p}/><line x1="12" y1="8" x2="12" y2="12"{...p}/><line x1="12" y1="16" x2="12.01" y2="16"{...p}/></>,
    lock:        <><rect x="3" y="11" width="18" height="11" rx="2"{...p}/><path d="M7 11V7a5 5 0 0110 0v4"{...p}/></>,
    unlock:      <><rect x="3" y="11" width="18" height="11" rx="2"{...p}/><path d="M7 11V7a5 5 0 019.9-1"{...p}/></>,
    finger:      <><path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10"{...p}/><path d="M5 12c0-3.87 3.13-7 7-7s7 3.13 7 7"{...p}/><path d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4"{...p}/><path d="M11 12c0-.55.45-1 1-1s1 .45 1 1v4"{...p}/></>,
    shield:      <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"{...p}/></>,
    repeat:      <><polyline points="17 1 21 5 17 9"{...p}/><path d="M3 11V9a4 4 0 014-4h14"{...p}/><polyline points="7 23 3 19 7 15"{...p}/><path d="M21 13v2a4 4 0 01-4 4H3"{...p}/></>,
    clipboard:   <><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 01-2-2V6a2 2 0 012-2h2"{...p}/><rect x="8" y="2" width="8" height="4" rx="1"{...p}/></>,
    dots:        <><circle cx="12" cy="5" r="2" fill={c} stroke="none"/><circle cx="12" cy="12" r="2" fill={c} stroke="none"/><circle cx="12" cy="19" r="2" fill={c} stroke="none"/></>,
  };
  return <svg viewBox="0 0 24 24" style={{ width:s, height:s, flexShrink:0, ...style }}>{map[n] ?? null}</svg>;
};

// ─── Small reusable ───────────────────────────────────────────────────────────
const Pill = ({ label, active, color, onClick }) => (
  <button onClick={onClick} style={{
    padding:"6px 14px", borderRadius:20, cursor:"pointer",
    border:`1.5px solid ${active ? color : "transparent"}`,
    background: active ? `${color}20` : "transparent",
    color: active ? color : "#64748B",
    fontSize:12, fontWeight: active ? 600 : 400,
    whiteSpace:"nowrap", flexShrink:0, transition:"all .2s",
  }}>{label}</button>
);

const StickyHeader = ({ C, icon, title, right }) => (
  <div style={{
    position:"sticky", top:0, zIndex:50,
    background:C.bg, paddingTop:44, paddingBottom:10,
    paddingLeft:16, paddingRight:16,
    borderBottom:`1px solid ${C.border}`,
  }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <h2 style={{ fontSize:18, fontWeight:700, display:"flex", alignItems:"center", gap:8, color:C.text }}>
        <Ic n={icon} s={18} c={C.accent}/>{title}
      </h2>
      {right ?? null}
    </div>
  </div>
);

// ─── CSV / Summary builders ───────────────────────────────────────────────────
const buildCSV = txs => {
  const hdr = "Datum,Mjesec,Tip,Opis,Lokacija,Kategorija,Plaćanje,Iznos (€),Status,Napomene\n";
  const rows = txs.map(t =>
    `${fDate(t.date)},${monthOf(t.date)},${t.type},"${t.description}",${t.location??""},${t.category??""},${t.payment??""},${+t.amount||0},${t.status??""},"${t.notes??""}"`)
    .join("\n");
  return "\uFEFF" + hdr + rows;
};

const buildSummary = (txs, year, user) => {
  const yd  = txs.filter(t => new Date(t.date).getFullYear() === year);
  const inc = yd.filter(t=>t.type==="Primitak").reduce((s,t)=>s+(+t.amount||0),0);
  const exp = yd.filter(t=>t.type==="Isplata").reduce((s,t)=>s+(+t.amount||0),0);
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "—";
  return [
    `MOJA LOVA — SAŽETAK ${year}.`, "",
    `Korisnik : ${name}`,
    user.phone  ? `Telefon  : ${user.phone}`  : null,
    user.email  ? `E-mail   : ${user.email}`  : null,
    "", "═══════════════════════════════",
    `Ukupni primici : ${fmtEur(inc)}`,
    `Ukupni troškovi: ${fmtEur(exp)}`,
    `Bilanca        : ${fmtEur(inc-exp)}`,
    `Broj stavki    : ${yd.length}`,
    "═══════════════════════════════", "",
    "Posljednjih 10 transakcija:",
    ...yd.sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,10)
       .map(t=>`• ${fDate(t.date)}  ${t.type==="Primitak"?"+":"-"}${fmtEur(+t.amount||0).padStart(12)}  ${t.description}`),
    "", `Generirano: ${fDate(new Date().toISOString().split("T")[0])}`,
  ].filter(l=>l!==null).join("\n");
};

// ─── LockScreen ──────────────────────────────────────────────────────────────
function LockScreen({ C, sec, onUnlock, onWipe }) {
  const [pin, setPin]       = useState("");
  const [err, setErr]       = useState("");
  const [tLeft, setTLeft]   = useState(0);

  const tryBio = useCallback(async () => {
    try {
      if (!sec.bioCredId) throw new Error("No cred");
      const idBuf = Uint8Array.from(atob(sec.bioCredId), c => c.charCodeAt(0));
      await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [{ id: idBuf, type: "public-key" }],
          userVerification: "required",
          timeout: 60000
        }
      });
      onUnlock();
    } catch { setErr("Biometrija otkazana ili neuspješna."); }
  }, [onUnlock, sec.bioCredId]);

  useEffect(() => {
    if (sec.bioEnabled && sec.bioCredId && window.PublicKeyCredential) {
      setTimeout(tryBio, 500);
    }
  }, [sec.bioEnabled, sec.bioCredId, tryBio]);

  useEffect(() => {
    if (!sec.lockedUntil) return;
    const tick = () => {
      const r = Math.ceil((sec.lockedUntil - Date.now()) / 1000);
      setTLeft(r > 0 ? r : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sec.lockedUntil]);

  const isLocked = sec.lockedUntil && Date.now() < sec.lockedUntil;

  const tryPin = async () => {
    if (isLocked || pin.length < 4) return;
    const h = await hashPin(pin);
    if (h === sec.pinHash) {
      save(K.sec, { ...sec, attempts:0, lockedUntil:null });
      onUnlock();
    } else {
      const na = (sec.attempts||0)+1, tf = (sec.totalFailed||0)+1;
      const upd = { ...sec, attempts:na, totalFailed:tf };
      if (tf >= WIPE_AT) { onWipe(); return; }
      if (na >= MAX_ATT) {
        upd.lockedUntil = Date.now() + LOCK_SEC*1000;
        upd.attempts = 0;
        setErr(`Previše pokušaja! Zaključano ${LOCK_SEC}s. (${WIPE_AT-tf} do brisanja)`);
      } else {
        setErr(`Pogrešan PIN. Pokušaj ${na}/${MAX_ATT}. (${WIPE_AT-tf} do brisanja)`);
      }
      save(K.sec, upd);
      setPin("");
    }
  };

  const PAD = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  const tapPad = k => {
    if (!k) return;
    setErr("");
    if (k==="⌫") setPin(p=>p.slice(0,-1));
    else if (pin.length < 6) setPin(p=>p+k);
  };

  return (
    <div style={{ width:"100%", minHeight:"100vh", background:"inherit", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 16px" }}>
      <div style={{ width:"100%", maxWidth:340 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:64, height:64, borderRadius:20, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
            <Ic n="lock" s={30} c="#fff"/>
          </div>
          <h1 style={{ fontSize:22, fontWeight:700, color:C.text }}>Moja lova</h1>
          <p style={{ fontSize:13, color:C.textMuted, marginTop:4 }}>Unesite PIN za pristup</p>
        </div>

        <div style={{ display:"flex", gap:14, justifyContent:"center", marginBottom:24 }}>
          {Array.from({length:6}).map((_,i)=>(
            <div key={i} style={{ width:13, height:13, borderRadius:"50%", background: i<pin.length ? C.accent : C.border, transition:"background .2s" }}/>
          ))}
        </div>

        {(err || isLocked) && (
          <div style={{ background:`${C.expense}18`, border:`1px solid ${C.expense}50`, borderRadius:10, padding:"8px 14px", marginBottom:16, fontSize:12, color:C.expense, textAlign:"center" }}>
            {isLocked ? `🔒 Zaključano još ${tLeft}s` : err}
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:18 }}>
          {PAD.map((k,i) => (
            <button key={i} onClick={()=>tapPad(k)}
              style={{ height:58, borderRadius:14, background:k?C.card:"transparent", border:k?`1px solid ${C.border}`:"none", color:C.text, fontSize:k==="⌫"?20:22, fontWeight:600, cursor:k?"pointer":"default", fontFamily:"'JetBrains Mono',monospace" }}>
              {k}
            </button>
          ))}
        </div>

        <button onClick={tryPin} disabled={isLocked||pin.length<4}
          style={{ width:"100%", padding:13, marginBottom:10, background:isLocked||pin.length<4?C.border:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:13, color:"#fff", fontSize:15, fontWeight:700, cursor:isLocked||pin.length<4?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <Ic n="unlock" s={17} c="#fff"/> Otključaj
        </button>

        {sec.bioEnabled && sec.bioCredId && (
          <button onClick={tryBio}
            style={{ width:"100%", padding:11, background:`${C.income}18`, border:`1px solid ${C.income}40`, borderRadius:13, color:C.income, fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            <Ic n="finger" s={17} c={C.income}/> Biometrija
          </button>
        )}
      </div>
    </div>
  );
}

// ─── SetupPin ─────────────────────────────────────────────────────────────────
function SetupPin({ C, onSave, onSkip, isChange=false }) {
  const [step, setStep]   = useState("enter");
  const [pin, setPin]     = useState("");
  const [first, setFirst] = useState("");
  const [err, setErr]     = useState("");

  const PAD = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  const tap = k => { if(!k)return; setErr(""); if(k==="⌫") setPin(p=>p.slice(0,-1)); else if(pin.length<6) setPin(p=>p+k); };

  const next = async () => {
    if (pin.length < 4) { setErr("Minimalno 4 znamenke"); return; }
    if (step==="enter") { setFirst(pin); setPin(""); setStep("confirm"); }
    else if (pin !== first) { setErr("PIN-ovi se ne poklapaju"); setPin(""); setStep("enter"); setFirst(""); }
    else { onSave(await hashPin(pin)); }
  };

  return (
    <div style={{ width:"100%", minHeight:"100vh", background:"inherit", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 16px" }}>
      <div style={{ width:"100%", maxWidth:340 }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ width:64, height:64, borderRadius:20, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
            <Ic n="shield" s={30} c="#fff"/>
          </div>
          <h2 style={{ fontSize:20, fontWeight:700, color:C.text }}>{step==="enter"?"Postavi PIN":"Potvrdi PIN"}</h2>
          <p style={{ fontSize:13, color:C.textMuted, marginTop:4 }}>{step==="enter"?"Odaberi PIN (4–6 znamenki)":"Unesite isti PIN još jednom"}</p>
        </div>

        <div style={{ display:"flex", gap:14, justifyContent:"center", marginBottom:24 }}>
          {Array.from({length:6}).map((_,i)=>(
            <div key={i} style={{ width:13, height:13, borderRadius:"50%", background:i<pin.length?C.accent:C.border, transition:"background .2s" }}/>
          ))}
        </div>

        {err && <div style={{ background:`${C.expense}18`, border:`1px solid ${C.expense}50`, borderRadius:10, padding:"8px 14px", marginBottom:14, fontSize:12, color:C.expense, textAlign:"center" }}>{err}</div>}

        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:18 }}>
          {PAD.map((k,i)=>(
            <button key={i} onClick={()=>tap(k)}
              style={{ height:58, borderRadius:14, background:k?C.card:"transparent", border:k?`1px solid ${C.border}`:"none", color:C.text, fontSize:k==="⌫"?20:22, fontWeight:600, cursor:k?"pointer":"default", fontFamily:"'JetBrains Mono',monospace" }}>
              {k}
            </button>
          ))}
        </div>

        <button onClick={next} disabled={pin.length<4}
          style={{ width:"100%", padding:13, marginBottom:10, background:pin.length<4?C.border:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:13, color:"#fff", fontSize:15, fontWeight:700, cursor:pin.length<4?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <Ic n="check" s={17} c="#fff"/>{step==="enter"?"Dalje":"Spremi PIN"}
        </button>

        {!isChange && (
          <button onClick={onSkip}
            style={{ width:"100%", padding:11, background:"transparent", border:`1px solid ${C.border}`, borderRadius:13, color:C.textMuted, fontSize:14, cursor:"pointer" }}>
            Preskoči zaštitu
          </button>
        )}
      </div>
    </div>
  );
}

// ─── App (root) ───────────────────────────────────────────────────────────────
export default function App() {
  
  // Ažuriranje statusa 'Neplaćeno' u 'U obradi' prilikom učitavanja baze (Transakcije)
  const [txs, setTxs] = useState(() => {
    let data = load(K.db, []);
    let needsSave = false;
    const migratedData = data.map(tx => {
      if (tx.status === "Neplaćeno") {
        needsSave = true;
        return { ...tx, status: "U obradi" };
      }
      return tx;
    });
    if (needsSave) save(K.db, migratedData);
    return migratedData;
  });

  const [prefs,setPrefs]= useState(()=>load(K.prf,{theme:"auto",year:curYear()}));
  const [user, setUser] = useState(()=>load(K.usr,{firstName:"",lastName:"",phone:"",email:""}));
  const [sec,  setSec]  = useState(()=>load(K.sec,{pinHash:null,bioEnabled:false,bioCredId:null,attempts:0,totalFailed:0,lockedUntil:null}));
  
  // OSIGURAČ ZA POPIS: Ako lokalni popis nema "U obradi", dodaj ga na popis statusa!
  const [lists,setLists] = useState(() => {
    const l = load(K.lst, DEF_LISTS);
    if (l.statuses && !l.statuses.includes("U obradi")) {
      l.statuses.push("U obradi");
      save(K.lst, l);
    }
    return l;
  });

  const [page, setPage] = useState("dashboard");
  const [editId,setEditId]   = useState(null);
  const [subPg, setSubPg]    = useState(null);
  const [unlocked,setUnlocked] = useState(false);
  const [setupMode,setSetupMode] = useState(false);

  const theme = useMemo(()=>{
    if (prefs.theme==="auto") return window.matchMedia?.("(prefers-color-scheme:dark)").matches?"dark":"light";
    return prefs.theme;
  },[prefs.theme]);
  const C = T[theme] ?? T.dark;

  useEffect(()=>save(K.db,txs),[txs]);
  useEffect(()=>save(K.prf,prefs),[prefs]);
  useEffect(()=>save(K.lst,lists),[lists]);
  useEffect(()=>save(K.usr,user),[user]);
  useEffect(()=>save(K.sec,sec),[sec]);
  useEffect(()=>{
    if (!sec.pinHash) return;
    const fn = () => { if (document.hidden) setUnlocked(false); };
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
  },[sec.pinHash]);

  const updP = p => setPrefs(v=>({...v,...p}));
  const updU = p => setUser(v=>({...v,...p}));
  const updS = p => setSec(v=>({...v,...p}));

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
        if (tx.payment === "Kartica (debitna)" && i === 0) {
          itemStatus = "Plaćeno";
        }
        arr.push({
          ...tx,
          id:`${gid}_${i}`, installmentGroup:gid,
          installmentNum:i+1, installmentTotal:inst,
          amount: i===0 ? mo+rem : mo,
          date: d.toISOString().split("T")[0],
          status: itemStatus,
          description:`${tx.description} (${i+1}/${inst})`,
          notes: tx.notes ? `${tx.notes} | Obrok ${i+1}/${inst}` : `Obrok ${i+1}/${inst} · Ukupno: ${fmtEur(tot)}`,
        });
      }
      setTxs(p=>[...p,...arr]);
    } else {
      setTxs(p=>[...p, { ...tx, id:Date.now().toString(), installments:0 }]);
    }
    setPage("dashboard");
  };

  const updTx  = tx => { setTxs(p=>p.map(t=>t.id===tx.id?tx:t)); setEditId(null); setPage("transactions"); };
  const delTx  = id => setTxs(p=>p.filter(t=>t.id!==id));
  const delGrp = g  => setTxs(p=>p.filter(t=>t.installmentGroup!==g));

  const wipe = () => {
    setTxs([]); save(K.db,[]);
    setSec({pinHash:null,bioEnabled:false,bioCredId:null,attempts:0,totalFailed:0,lockedUntil:null});
    setUnlocked(true);
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
    .su{animation:su .25s ease-out both} .fi{animation:fi .2s ease-out both}
    input[type=date]::-webkit-calendar-picker-indicator{filter:${theme==="dark"?"invert(1)":"none"};opacity:.5;}
    select{appearance:none;-webkit-appearance:none;}
    select.empty{color:${C.textMuted};}
    select:not(.empty){color:${C.text};}
    button{font-family:inherit;}
  `;

  const wrap = { background:C.bg, minHeight:"100vh", width:"100%", color:C.text, fontFamily:"'Inter',sans-serif", maxWidth:480, margin:"0 auto", transition:"background .3s,color .3s" };

  if (setupMode) return (
    <div style={wrap}><style>{gs}</style>
    <SetupPin C={C}
      onSave={hash=>{ updS({pinHash:hash,attempts:0,totalFailed:0,lockedUntil:null}); setSetupMode(false); setUnlocked(true); }}
      onSkip={()=>{ setSetupMode(false); setUnlocked(true); }}
    />
    </div>
  );

  if (sec.pinHash && !unlocked) return (
    <div style={wrap}><style>{gs}</style>
    <LockScreen C={C} sec={sec}
      onUnlock={()=>{ updS({attempts:0,lockedUntil:null}); setUnlocked(true); }}
      onWipe={wipe}
    />
    </div>
  );

  if (!sec.pinHash && !unlocked) return (
    <div style={wrap}><style>{gs}</style>
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", padding:"32px 16px" }}>
      <div style={{ width:"100%", maxWidth:340, textAlign:"center" }}>
        <div style={{ width:72, height:72, borderRadius:22, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px" }}>
          <Ic n="wallet" s={34} c="#fff"/>
        </div>
        <h1 style={{ fontSize:26, fontWeight:700, color:C.text, marginBottom:8 }}>Moja lova</h1>
        <p style={{ fontSize:14, color:C.textMuted, marginBottom:36 }}>Osobna financijska aplikacija</p>
        <button onClick={()=>setSetupMode(true)}
          style={{ width:"100%", padding:14, marginBottom:12, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:15, color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <Ic n="shield" s={18} c="#fff"/> Postavi PIN zaštitu
        </button>
        <button onClick={()=>setUnlocked(true)}
          style={{ width:"100%", padding:13, background:"transparent", border:`1px solid ${C.border}`, borderRadius:15, color:C.textMuted, fontSize:14, cursor:"pointer" }}>
          Nastavi bez zaštite
        </button>
      </div>
    </div>
    </div>
  );

  const shared = { C, year:prefs.year, lists, user };

  return (
    <div style={{ ...wrap, paddingBottom:88 }}>
      <style>{gs}</style>

      {page==="dashboard"    && <Dashboard    {...shared} data={txs} setPage={setPage}/>}
      {page==="add"          && <TxForm {...shared} onSubmit={addTx} onCancel={()=>setPage("dashboard")} onGoRecurring={()=>setPage("recurring")}/>}
      {page==="edit"         && <TxForm {...shared} tx={txs.find(t=>t.id===editId)} onSubmit={updTx} onCancel={()=>{ setEditId(null); setPage("transactions"); }}/>}
      {page==="transactions" && <TxList {...shared} data={txs} onEdit={id=>{ setEditId(id); setPage("edit"); }} onDelete={delTx} onDeleteGroup={delGrp} onPay={id=>setTxs(p=>p.map(t=>t.id===id?{...t,status:"Plaćeno",date:new Date().toISOString().split("T")[0]}:t))}/>}
      {page==="charts"       && <Charts {...shared} data={txs}/>}
      {page==="recurring"    && <RecurringScreen {...shared} data={txs} onAddTx={tx=>{ setTxs(p=>[...p,{...tx,id:Date.now().toString()}]); }} onBack={()=>setPage("add")}/>}
      {page==="settings"     && <Settings {...shared} txs={txs} setTxs={setTxs} prefs={prefs} updPrefs={updP} updUser={updU} sec={sec} updSec={updS} lists={lists} setLists={setLists} subPg={subPg} setSubPg={setSubPg} setUnlocked={setUnlocked} setSetupMode={setSetupMode}/>}

      <nav style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, background:C.navBg, borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-around", padding:"6px 0 16px", zIndex:100, backdropFilter:"blur(12px)" }}>
        {[["dashboard","home","Početna"],["transactions","list","Troškovi"],["add","plus",""],["charts","bar","Statistika"],["settings","gear","Postavke"]].map(([id,ic,lb])=>(
          <button key={id} onClick={()=>{ setPage(id); setSubPg(null); }} style={{ background:"none", border:"none", display:"flex", flexDirection:"column", alignItems:"center", gap:3, cursor:"pointer", padding:"4px 10px", borderRadius:10 }}>
            {id==="add"
              ? <div style={{ width:46, height:46, borderRadius:16, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:"flex", alignItems:"center", justifyContent:"center", marginTop:-24, boxShadow:`0 4px 18px ${C.accentGlow}` }}><Ic n="plus" s={22} c="#fff"/></div>
              : <><Ic n={ic} s={20} c={page===id?C.accent:C.textMuted}/><span style={{ fontSize:10, color:page===id?C.accent:C.textMuted, fontWeight:page===id?600:400 }}>{lb}</span></>
            }
          </button>
        ))}
      </nav>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ C, data, year, user, setPage }) {
  const cm  = curMonth();
  const cms = sm(cm);
  const yd  = data.filter(t=>new Date(t.date).getFullYear()===year);
  const inc = yd.filter(t=>t.type==="Primitak").reduce((s,t)=>s+(+t.amount||0),0);
  const exp = yd.filter(t=>t.type==="Isplata").reduce((s,t)=>s+(+t.amount||0),0);
  const bal = inc - exp;
  const md  = yd.filter(t=>monthOf(t.date)===cm);
  const mI  = md.filter(t=>t.type==="Primitak").reduce((s,t)=>s+(+t.amount||0),0);
  const mE  = md.filter(t=>t.type==="Isplata").reduce((s,t)=>s+(+t.amount||0),0);
  const pendingAll   = data.filter(t=>t.status==="Čeka plaćanje" || t.status==="U obradi").reduce((s,t)=>s+(+t.amount||0),0);
  const pendingMonth = md.filter(t=>t.status==="Čeka plaćanje" || t.status==="U obradi").reduce((s,t)=>s+(+t.amount||0),0);

  const cats = useMemo(()=>{
    const m={};
    yd.filter(t=>t.type==="Isplata").forEach(t=>{ m[t.category]=(m[t.category]||0)+(+t.amount||0); });
    return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,4);
  },[yd]);

  const mBar = useMemo(()=>MONTHS.map(m=>{
    const mt = yd.filter(t=>monthOf(t.date)===m);
    return { name:m.slice(0,3), P:mt.filter(t=>t.type==="Primitak").reduce((s,t)=>s+(+t.amount||0),0), T:mt.filter(t=>t.type==="Isplata").reduce((s,t)=>s+(+t.amount||0),0) };
  }),[yd]);

  const now = new Date();
  const wd  = now.toLocaleDateString("hr-HR",{weekday:"short"}).replace(".","").toUpperCase();
  const dd  = String(now.getDate()).padStart(2,"0");
  const mm  = String(now.getMonth()+1).padStart(2,"0");
  const yy  = now.getFullYear();
  const W   = Math.min(window.innerWidth??480,480)-64;
  const tt  = { contentStyle:{background:C.cardAlt,border:`1px solid ${C.border}`,borderRadius:10,color:C.text,fontSize:11}, formatter:v=>fmtEur(v) };
  const dn  = [user.firstName, user.lastName].filter(Boolean).join(" ");

  const cards = [
    { icon:<Ic n="up"    s={13} c={C.income}/>,  label:`${cms} primici`,        val:fmtEur(mI),            color:C.income  },
    { icon:<Ic n="down"  s={13} c={C.expense}/>, label:`${cms} troškovi`,       val:fmtEur(mE),            color:C.expense },
    { icon:<Ic n="coins" s={13} c={C.warning}/>, label:`${cms} čekaju`,         val:fmtEur(pendingMonth), color:C.warning },
    { icon:<Ic n="coins" s={13} c={C.accentDk}/>, label:"Prosjek/mj.",           val:fmtEur(exp/12),       color:C.accentDk },
  ];

  return (
    <div className="fi" style={{ width:"100%" }}>
      <div style={{ position:"sticky", top:0, zIndex:50, background:C.bg, paddingTop:28, paddingBottom:10, paddingLeft:16, paddingRight:16, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, display:"flex", alignItems:"center", gap:8, color:C.accent }}>
              <Ic n="wallet" s={22} c={C.accent}/> Moja lova
            </h1>
            {dn && <span style={{ fontSize:12, color:C.textMuted, display:"flex", alignItems:"center", gap:4, marginTop:3 }}><span style={{ width:6, height:6, borderRadius:"50%", background:C.income, display:"inline-block" }}/>{dn}</span>}
          </div>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"6px 12px", fontSize:13, fontWeight:600, fontFamily:"'JetBrains Mono',monospace", color:C.accent }}>{year}</div>
        </div>
      </div>

      <div style={{ padding:"12px 16px 0" }}>
        <div className="su" style={{ background:`linear-gradient(135deg,${C.accent}22,${bal>=0?C.income:C.expense}18)`, border:`1px solid ${bal>=0?C.income:C.expense}40`, borderRadius:18, padding:"16px 18px 16px 16px", marginBottom:10, position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:12, right:6, textAlign:"right" }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.textSub, letterSpacing:.3 }}>{wd}</div>
            <div style={{ fontSize:13, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:C.textSub }}>{dd}.{mm}.</div>
            <div style={{ fontSize:10, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:C.textMuted, marginTop:1 }}>{yy}.</div>
          </div>
          <div style={{ fontSize:11, color:C.textSub, marginBottom:4, textAlign:"left" }}>Bilanca {year}.</div>
          <div style={{ fontSize:28, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:bal>=0?C.income:C.expense, textAlign:"left", paddingRight:65 }}>{fmtEur(bal)}</div>
          {pendingAll > 0 && (
            <div style={{ fontSize:12, color:C.warning, marginTop:6, display:"flex", alignItems:"center", gap:5, textAlign:"left" }}>
              <Ic n="coins" s={12} c={C.warning}/>
              <span>Očekivana plaćanja: <strong style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700 }}>{fmtEur(pendingAll)}</strong></span>
            </div>
          )}
          <div style={{ position:"absolute", right:-20, top:-20, width:90, height:90, borderRadius:"50%", background:`${bal>=0?C.income:C.expense}10` }}/>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
          {cards.map(({icon,label,val,color},i)=>(
            <div key={label} className="su" style={{ background:C.card, border:`1px solid ${C.border}`, borderLeft:`3px solid ${color}`, borderRadius:14, padding:"10px 12px", animationDelay:`${i*.05}s` }}>
              <div style={{ fontSize:10, color:C.textMuted, marginBottom:3, display:"flex", alignItems:"center", gap:4 }}>{icon}{label}</div>
              <div style={{ fontSize:14, fontWeight:700, color, fontFamily:"'JetBrains Mono',monospace" }}>{val}</div>
            </div>
          ))}
        </div>

        {yd.length>0 && (
          <div className="su" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"10px 10px 6px", marginBottom:10 }}>
            <div style={{ fontSize:11, fontWeight:600, color:C.textMuted, marginBottom:6, display:"flex", alignItems:"center", gap:5 }}>
              <Ic n="bar" s={12} c={C.textMuted}/>Primici vs Troškovi — {year}.
            </div>
            <BarChart width={W} height={130} data={mBar} barGap={1} barCategoryGap="35%">
              <XAxis dataKey="name" tick={{fill:C.textMuted,fontSize:8}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:C.textMuted,fontSize:8}} axisLine={false} tickLine={false} width={32} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
              <Tooltip {...tt}/>
              <Bar dataKey="P" name="Primici"  fill={C.income}  radius={[3,3,0,0]}/>
              <Bar dataKey="T" name="Troškovi" fill={C.expense} radius={[3,3,0,0]}/>
            </BarChart>
          </div>
        )}

        {cats.length>0 && (
          <div className="su" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"8px 12px", marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:600, color:C.textMuted, marginBottom:4, display:"flex", alignItems:"center", gap:5 }}>
              <Ic n="tag" s={12} c={C.textMuted}/>Top kategorije troškova
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <PieChart width={Math.round(W*.4)} height={95}>
                <Pie data={cats} cx="50%" cy="50%" innerRadius={18} outerRadius={42} dataKey="value" stroke="none">
                  {cats.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                </Pie>
              </PieChart>
              <div style={{ flex:1 }}>
                {cats.map((c,i)=>(
                  <div key={c.name} style={{ display:"flex", justifyContent:"space-between", padding:"1px 0", fontSize:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                      <div style={{ width:6, height:6, borderRadius:2, background:CHART_COLORS[i%CHART_COLORS.length], flexShrink:0 }}/>
                      <span style={{ color:C.textSub, maxWidth:70, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</span>
                    </div>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10 }}>{fmtEur(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TxForm ───────────────────────────────────────────────────────────────────
function TxForm({ C, tx, lists, onSubmit, onCancel, onGoRecurring }) {
  const init = tx ?? {
    date: new Date().toISOString().split("T")[0],
    type: "Isplata",
    description: "",
    category: "",
    location: "",
    payment: "",
    status: "",
    amount: "",
    notes: "",
    installments: 0,
    installmentPeriod: "M"
  };
  const [form, setForm] = useState(init);
  const upd = patch => setForm(f=>({...f,...patch}));

  // State za modal / pod-ekran obročne otplate
  const [showInstSetup, setShowInstSetup] = useState(false);
  const [tempInst, setTempInst] = useState(form.installments || 3);
  const [tempPeriod, setTempPeriod] = useState(form.installmentPeriod || "M");

  const inst      = parseInt(form.installments) || 0;
  const isGotov   = form.payment === "Gotovina";
  const cats      = form.type==="Primitak" ? lists.categories_income : lists.categories_expense;
  const payments  = inst>1 ? lists.payments.filter(p=>p!=="Gotovina") : lists.payments;
  const mo        = inst>1 ? (parseFloat(form.amount)||0)/inst : 0;

  useEffect(()=>{ if (!tx) upd({ category: "" }); },[form.type]);
  useEffect(()=>{ if (isGotov && inst>1) upd({ installments:0 }); },[form.payment]);
  useEffect(()=>{ if (inst>1 && isGotov) upd({ payment: lists.payments.find(p=>p!=="Gotovina") ?? lists.payments[0] }); },[form.installments]);

  const fld = { width:"100%", height:46, padding:"0 12px", background:C.cardAlt, border:`1.5px solid ${C.border}`, borderRadius:12, color:C.text, fontSize:14 };
  const lbl = { fontSize:11, fontWeight:600, color:C.textMuted, marginBottom:5, display:"flex", alignItems:"center", gap:5, letterSpacing:.3, textTransform:"uppercase" };

  const submit = () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0)       { alert("Unesite ispravan iznos"); return; }
    if (!form.description.trim())      { alert("Unesite opis"); return; }
    if (!form.category)                { alert("Odaberite kategoriju"); return; }
    if (!form.location)                { alert("Odaberite lokaciju"); return; }
    if (!form.payment)                 { alert("Odaberite način plaćanja"); return; }
    if (inst <= 1 && !form.status)     { alert("Odaberite status"); return; }
    onSubmit({ ...form, amount, installments: inst });
  };

  return (
    <div className="fi" style={{ width:"100%" }}>
      <StickyHeader C={C} icon={tx?"edit":"plus"} title={tx?"Uredi unos":"Novi unos"}
        right={<button onClick={onCancel} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, color:C.textMuted, padding:"8px 14px", borderRadius:10, fontSize:13, cursor:"pointer" }}>Odustani</button>}
      />
      <div style={{ padding:"14px 16px 0" }}>
        <div style={{ display:"grid", gridTemplateColumns:tx?"1fr 1fr":"1fr 1fr 1fr", gap:8, marginBottom:16 }}>
          {["Isplata",!tx&&"Obveze","Primitak"].filter(Boolean).map(t=>{
            if (t==="Obveze") return (
              <button key="Obveze" onClick={onGoRecurring}
                style={{ padding:12, border:`2px solid ${C.warning}40`, borderRadius:14, background:`${C.warning}10`, color:C.warning, fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
                <Ic n="repeat" s={15} c={C.warning}/>Obveze
              </button>
            );
            return (
              <button key={t} onClick={()=>upd({type:t})}
                style={{ padding:12, border:`2px solid ${form.type===t?(t==="Primitak"?C.income:C.expense):C.border}`, borderRadius:14, background:form.type===t?(t==="Primitak"?`${C.income}15`:`${C.expense}15`):"transparent", color:form.type===t?(t==="Primitak"?C.income:C.expense):C.textMuted, fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
                <Ic n={t==="Primitak"?"up":"down"} s={15} c={form.type===t?(t==="Primitak"?C.income:C.expense):C.textMuted}/>{t}
              </button>
            );
          })}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
          {/* 1. DATUM & IZNOS */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <label style={lbl}><Ic n="cal" s={11} c={C.textMuted}/>Datum</label>
              <input type="date" value={form.date} onChange={e=>upd({date:e.target.value})} style={fld}/>
            </div>
            <div>
              <label style={lbl}><Ic n="coins" s={11} c={C.textMuted}/>Iznos (€)</label>
              <input type="number" step="0.01" min="0" placeholder="0,00" value={form.amount}
                onChange={e=>upd({amount:e.target.value})}
                style={{...fld, fontFamily:"'JetBrains Mono',monospace", fontWeight:600}}/>
            </div>
          </div>

          {/* 2. OPIS */}
          <div>
            <label style={lbl}><Ic n="edit" s={11} c={C.textMuted}/>Opis</label>
            <input type="text" placeholder="Npr. Tjedna kupovina" value={form.description}
              onChange={e=>upd({description:e.target.value})} style={fld}/>
          </div>

          {/* 3. KATEGORIJA & LOKACIJA */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <label style={lbl}><Ic n="tag" s={11} c={C.textMuted}/>Kategorija</label>
              <select value={form.category} onChange={e=>upd({category:e.target.value})} style={{...fld, color:!form.category?C.textMuted:C.text}}>
                <option value="" disabled>- odabrati -</option>
                {cats.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}><Ic n="pin" s={11} c={C.textMuted}/>Lokacija</label>
              <select value={form.location} onChange={e=>upd({location:e.target.value})} style={{...fld, color:!form.location?C.textMuted:C.text}}>
                <option value="" disabled>- odabrati -</option>
                {lists.locations.map(l=><option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* 4. OBROČNA OTPLATA - POBOLJŠANO */}
          {form.type==="Isplata" && !tx && (
            isGotov
              ? <div style={{ background:C.cardAlt, borderRadius:12, padding:"10px 14px", border:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:8 }}>
                  <Ic n="info" s={14} c={C.textMuted}/>
                  <span style={{ fontSize:12, color:C.textMuted }}>Plaćanje gotovinom ne omogućuje obročnu otplatu.</span>
                </div>
              : <div style={{ background:C.cardAlt, borderRadius:14, padding:13, border:`1.5px solid ${inst>1 || showInstSetup ? C.warning : C.border}`, transition:"border-color .2s" }}>
                  
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span style={{ fontSize:13, fontWeight:600, color:inst>1 || showInstSetup ? C.warning : C.textMuted, display:"flex", alignItems:"center", gap:6 }}>
                      <Ic n="tag" s={14} c={inst>1 || showInstSetup ? C.warning : C.textMuted}/>Obročna otplata?
                    </span>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>{ setShowInstSetup(true); setTempInst(Math.max(2, inst)); }}
                        style={{ padding:"5px 14px", borderRadius:20, border:`1.5px solid ${inst>1 || showInstSetup ? C.warning : C.border}`, background:inst>1 || showInstSetup ? `${C.warning}20` : "transparent", color:inst>1 || showInstSetup ? C.warning : C.textMuted, fontSize:12, fontWeight:600, cursor:"pointer", transition:"all .2s" }}>Da</button>
                      <button onClick={()=>{ upd({installments:0}); setShowInstSetup(false); }}
                        style={{ padding:"5px 14px", borderRadius:20, border:`1.5px solid ${inst<=1 && !showInstSetup ? C.accent : C.border}`, background:inst<=1 && !showInstSetup ? `${C.accent}20` : "transparent", color:inst<=1 && !showInstSetup ? C.accent : C.textMuted, fontSize:12, fontWeight:600, cursor:"pointer", transition:"all .2s" }}>Ne</button>
                    </div>
                  </div>

                  {!showInstSetup && inst > 1 && (
                      <div style={{ fontSize:11, fontWeight:600, color:C.warning, marginTop:10, padding:"6px 10px", background:`${C.warning}15`, borderRadius:8, display:"inline-flex", alignItems:"center", gap:5 }}>
                          <Ic n="check" s={12} c={C.warning}/> Aktivirano: {inst} obroka
                      </div>
                  )}

                  {showInstSetup && (
                    <div className="su" style={{ background: C.bg, padding:14, borderRadius:12, border:`1px solid ${C.border}`, marginTop:12 }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                        <span style={{ fontSize:12, color:C.textMuted }}>Dinamika:</span>
                        <div style={{ display:"flex", background:C.cardAlt, borderRadius:8, overflow:"hidden", border:`1px solid ${C.border}` }}>
                          <button onClick={()=>setTempPeriod("M")} style={{ padding:"5px 12px", fontSize:11, background:tempPeriod==="M"?C.warning:"transparent", color:tempPeriod==="M"?"#000":C.textMuted, border:"none", cursor:"pointer", fontWeight:600 }}>Mjesečno</button>
                          <button onClick={()=>setTempPeriod("Y")} style={{ padding:"5px 12px", fontSize:11, background:tempPeriod==="Y"?C.warning:"transparent", color:tempPeriod==="Y"?"#000":C.textMuted, border:"none", cursor:"pointer", fontWeight:600 }}>Godišnje</button>
                        </div>
                      </div>
                      
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                        <span style={{ fontSize:12, color:C.textMuted, whiteSpace:"nowrap" }}>Broj obroka:</span>
                        <input type="range" min="2" max="36" value={tempInst}
                          onChange={e=>setTempInst(parseInt(e.target.value))}
                          style={{ flex:1, accentColor:C.warning }}/>
                        <div style={{ background:C.cardAlt, borderRadius:8, border:`1px solid ${C.border}`, padding:"4px 10px", minWidth:38, textAlign:"center", fontSize:16, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:C.warning }}>{tempInst}</div>
                      </div>
                      
                      {parseFloat(form.amount)>0 && (
                        <div style={{ padding:"10px 12px", background:`${C.warning}10`, borderRadius:10, border:`1px solid ${C.warning}30`, display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                          <div>
                            <div style={{ fontSize:11, color:C.textMuted }}>Iznos obroka</div>
                            <div style={{ fontSize:15, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:C.warning }}>{fmtEur((parseFloat(form.amount)||0)/tempInst)}</div>
                          </div>
                        </div>
                      )}

                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={()=>{ upd({installments: tempInst, installmentPeriod: tempPeriod}); setShowInstSetup(false); }} 
                            style={{ flex:1, padding:10, background:C.warning, border:"none", borderRadius:10, color:"#000", fontWeight:700, fontSize:13, cursor:"pointer" }}>Da, spremi</button>
                        <button onClick={()=>{ setShowInstSetup(false); upd({installments:0}); }} 
                            style={{ flex:1, padding:10, background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:10, color:C.textMuted, fontWeight:600, fontSize:13, cursor:"pointer" }}>Ne, odustani</button>
                      </div>
                    </div>
                  )}
                </div>
          )}

          {/* 5. PLAĆANJE & STATUS */}
          <div style={{ display:"grid", gridTemplateColumns:inst>1?"1fr":"1fr 1fr", gap:10 }}>
            <div>
              <label style={lbl}><Ic n="card" s={11} c={C.textMuted}/>Plaćanje</label>
              <select value={form.payment} onChange={e=>upd({payment:e.target.value})} style={{...fld, color:!form.payment?C.textMuted:C.text}}>
                <option value="" disabled>- odabrati -</option>
                {payments.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            {inst <= 1 && (
              <div>
                <label style={lbl}><Ic n="check" s={11} c={C.textMuted}/>Status</label>
                <select value={form.status} onChange={e=>upd({status:e.target.value})} style={{...fld, color:!form.status?C.textMuted:C.text}}>
                  <option value="" disabled>- odabrati -</option>
                  {lists.statuses.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>
          {inst > 1 && (
             <div style={{ fontSize:11, color:C.textMuted, marginTop:-5, paddingLeft:4, display:"flex", alignItems:"center", gap:5 }}>
                <Ic n="info" s={12} c={C.textMuted}/> Status rata određuje se automatski (ovisno o kartici).
             </div>
          )}

          {/* 6. NAPOMENE */}
          <div>
            <label style={lbl}><Ic n="info" s={11} c={C.textMuted}/>Napomene</label>
            <textarea placeholder="Opcionalno…" value={form.notes||""} onChange={e=>upd({notes:e.target.value})}
              rows={2} style={{...fld, height:"auto", padding:"10px 12px", resize:"vertical"}}/>
          </div>
        </div>

        <button onClick={submit}
          style={{ width:"100%", padding:15, marginTop:18, marginBottom:16, background:form.type==="Primitak"?`linear-gradient(135deg,${C.income},#059669)`:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:15, color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <Ic n="check" s={18} c="#fff"/>
          {tx ? "Spremi promjene" : inst>1 ? `Dodaj ${inst} obroka` : "Dodaj transakciju"}
        </button>
      </div>
    </div>
  );
}

// ─── TxList ───────────────────────────────────────────────────────────────────
function TxList({ C, data, year, onEdit, onDelete, onDeleteGroup, onPay }) {
  const [filter,setFilter] = useState("all");
  const [q, setQ]          = useState("");
  const [delCfm,setDelCfm] = useState(null);
  const [grpCfm,setGrpCfm] = useState(null);

  const rows = useMemo(()=>{
    let f = data.filter(t=>new Date(t.date).getFullYear()===year);
    if (filter==="income")  f = f.filter(t=>t.type==="Primitak");
    if (filter==="expense") f = f.filter(t=>t.type==="Isplata");
    if (filter==="pending") f = f.filter(t=>t.status==="Čeka plaćanje" || t.status==="U obradi");
    if (q) f = f.filter(t=>t.description?.toLowerCase().includes(q.toLowerCase())||t.category?.toLowerCase().includes(q.toLowerCase()));
    
    // Sortiranje: ako je "Čeka plaćanje" onda najstariji prvi, inače najnoviji prvi
    if (filter === "pending") {
        return f.sort((a,b)=>new Date(a.date)-new Date(b.date));
    }
    return f.sort((a,b)=>new Date(b.date)-new Date(a.date));
  },[data,filter,q,year]);

  return (
    <div className="fi" style={{ width:"100%" }}>
      <StickyHeader C={C} icon="list" title={`Transakcije · ${year}.`}/>
      <div style={{ padding:"12px 16px 0" }}>
        <div style={{ position:"relative", marginBottom:10 }}>
          <input type="text" placeholder="Pretraži…" value={q} onChange={e=>setQ(e.target.value)}
            style={{ width:"100%", padding:"11px 14px 11px 40px", background:C.cardAlt, border:`1.5px solid ${C.border}`, borderRadius:12, color:C.text, fontSize:13 }}/>
          <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }}><Ic n="search" s={16} c={C.textMuted}/></span>
        </div>

        <div style={{ display:"flex", gap:6, marginBottom:12, overflowX:"auto", paddingBottom:4 }}>
          {[["all","Sve"],["income","Primici"],["expense","Troškovi"],["pending","Čeka plaćanje"]].map(([id,lb])=>(
            <Pill key={id} label={lb} active={filter===id} color={id==="pending"?C.warning:C.accent} onClick={()=>setFilter(id)}/>
          ))}
        </div>

        {rows.length===0
          ? <div style={{ textAlign:"center", padding:50, color:C.textMuted }}><Ic n="list" s={44} c={C.border} style={{ marginBottom:12, opacity:.3 }}/><p>Nema transakcija</p></div>
          : rows.map((tx,i)=>(
            <div key={tx.id} className="su" style={{ background:C.card, border:`1px solid ${C.border}`, borderLeft:`3px solid ${tx.installmentGroup?C.warning:tx.type==="Primitak"?C.income:C.expense}`, borderRadius:14, padding:13, marginBottom:8, animationDelay:`${i*.02}s` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                    <span style={{ fontWeight:600, fontSize:14, color:C.text }}>{tx.description}</span>
                    {tx.installmentGroup && <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:10, background:`${C.warning}20`, color:C.warning }}>{tx.installmentNum}/{tx.installmentTotal}</span>}
                  </div>
                  <div style={{ fontSize:11, color:C.textMuted, marginTop:3 }}>{fDate(tx.date)} · {tx.category} · {tx.location}</div>
                  <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{tx.payment} · <span style={{ color:tx.status==="Plaćeno"?C.income:C.warning }}>{tx.status}</span></div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0, marginLeft:10 }}>
                  <div style={{ fontSize:15, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:tx.type==="Primitak"?C.income:C.expense }}>{tx.type==="Primitak"?"+":"-"}{fmtEur(+tx.amount)}</div>
                  <div style={{ display:"flex", gap:5, marginTop:6, justifyContent:"flex-end" }}>
                    {(tx.status==="Čeka plaćanje" || tx.status==="U obradi") && <button title="Plati" onClick={()=>onPay(tx.id)} style={{ background:`${C.income}18`, border:`1px solid ${C.income}40`, borderRadius:8, padding:"5px 8px", cursor:"pointer" }}><Ic n="check" s={13} c={C.income}/></button>}
                    <button title="Uredi" onClick={()=>onEdit(tx.id)} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"5px 8px", cursor:"pointer" }}><Ic n="edit" s={13} c={C.accent}/></button>
                    {tx.installmentGroup && grpCfm!==tx.id
                      ? <button title="Obriši" onClick={()=>setGrpCfm(tx.id)} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"5px 8px", cursor:"pointer" }}><Ic n="trash" s={13} c={C.expense}/></button>
                      : !tx.installmentGroup && (
                          delCfm===tx.id
                          ? <button onClick={()=>{ onDelete(tx.id); setDelCfm(null); }} style={{ background:C.expense, border:"none", borderRadius:8, padding:"5px 10px", cursor:"pointer", color:"#fff", fontSize:11, fontWeight:700 }}>Obriši!</button>
                          : <button title="Obriši" onClick={()=>setDelCfm(tx.id)} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"5px 8px", cursor:"pointer" }}><Ic n="trash" s={13} c={C.expense}/></button>
                        )
                    }
                  </div>
                </div>
              </div>

              {tx.installmentGroup && grpCfm===tx.id && (
                <div style={{ marginTop:10, padding:"10px 12px", background:`${C.expense}10`, borderRadius:10, border:`1px solid ${C.expense}30` }}>
                  <p style={{ fontSize:11, color:C.textMuted, marginBottom:8 }}>Što obrisati?</p>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={()=>{ onDelete(tx.id); setGrpCfm(null); }} style={{ flex:1, padding:"8px 4px", background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:11, cursor:"pointer" }}>Ovaj obrok</button>
                    <button onClick={()=>{ onDeleteGroup(tx.installmentGroup); setGrpCfm(null); }} style={{ flex:1, padding:"8px 4px", background:C.expense, border:"none", borderRadius:8, color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>Sve obroke ({tx.installmentTotal})</button>
                    <button onClick={()=>setGrpCfm(null)} title="Zatvori" style={{ padding:"8px 10px", background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, color:C.textMuted, cursor:"pointer" }}><Ic n="x" s={12} c={C.textMuted}/></button>
                  </div>
                </div>
              )}
              {tx.notes && <div style={{ fontSize:11, color:C.textMuted, marginTop:7, fontStyle:"italic", borderTop:`1px solid ${C.border}`, paddingTop:7 }}>💬 {tx.notes}</div>}
            </div>
          ))
        }
        <div style={{ textAlign:"center", padding:"10px 0", color:C.textMuted, fontSize:12 }}>{rows.length} transakcija · {year}.</div>
      </div>
    </div>
  );
}

// ─── Statistika (Charts) ──────────────────────────────────────────────────────
function Charts({ C, data, year, lists }) {
  const [tab, setTab] = useState("expected");
  const [selMonth, setSelMonth] = useState("YEAR");
  const [expFilter, setExpFilter] = useState({rate:true, recurring:true, unpaid:true, kredit:true});
  
  const isYear = selMonth === "YEAR";
  const isAll = selMonth === "ALL";
  const isMonth = !isYear && !isAll;

  const yd = data.filter(t=>new Date(t.date).getFullYear()===year);
  const fd = isMonth ? yd.filter(t=>monthOf(t.date)===selMonth) : yd;
  const W  = Math.min(window.innerWidth??480,480)-64;
  const tt = { contentStyle:{background:C.cardAlt,border:`1px solid ${C.border}`,borderRadius:10,color:C.text,fontSize:11}, formatter:v=>fmtEur(v) };
  const curMIdx = new Date().getMonth();
  const rec = lists.recurring || [];

  const mBar  = useMemo(()=>MONTHS.map((m,mi)=>{
    const mt=yd.filter(t=>monthOf(t.date)===m);
    const recAmt = rec.reduce((s,r)=>s+(+r.amount||0),0);
    return{
      name:m.slice(0,3),
      Primici:mt.filter(t=>t.type==="Primitak").reduce((s,t)=>s+(+t.amount||0),0),
      Troškovi:mt.filter(t=>t.type==="Isplata"&&t.status==="Plaćeno").reduce((s,t)=>s+(+t.amount||0),0),
      Čeka:mt.filter(t=>t.status==="Čeka plaćanje" || t.status==="U obradi").reduce((s,t)=>s+(+t.amount||0),0),
      Obveze:recAmt,
    };
  }),[yd,rec]);

  const saldo = useMemo(()=>{
    let c=0;
    const isCurrentYear = year === curYear();
    return MONTHS.map((m,i)=>{
      const mt=yd.filter(t=>monthOf(t.date)===m);
      c+=mt.filter(t=>t.type==="Primitak").reduce((s,t)=>s+(+t.amount||0),0)-mt.filter(t=>t.type==="Isplata").reduce((s,t)=>s+(+t.amount||0),0);
      return{ name:m.slice(0,3), Saldo:(isCurrentYear && i>curMIdx)?null:c };
    });
  },[yd,year]);

  const catD  = useMemo(()=>{ const m={}; fd.filter(t=>t.type==="Isplata").forEach(t=>{ m[t.category]=(m[t.category]||0)+(+t.amount||0); }); return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value); },[fd]);
  const payD  = useMemo(()=>{ const m={}; fd.forEach(t=>{ m[t.payment]=(m[t.payment]||0)+(+t.amount||0); }); return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value); },[fd]);
  const locD  = useMemo(()=>{ const m={}; fd.forEach(t=>{ m[t.location]=(m[t.location]||0)+(+t.amount||0); }); return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value); },[fd]);

  const mDetail = useMemo(()=>{
    if (!isMonth) return null;
    const mt = yd.filter(t=>monthOf(t.date)===selMonth);
    const inc = mt.filter(t=>t.type==="Primitak").reduce((s,t)=>s+(+t.amount||0),0);
    const exp = mt.filter(t=>t.type==="Isplata").reduce((s,t)=>s+(+t.amount||0),0);
    return { inc, exp, bal:inc-exp, count:mt.length };
  },[selMonth, yd, isMonth]);

  const expData = useMemo(()=>{
    const now  = new Date();
    const nowY = now.getFullYear();
    const nowM = now.getMonth();

    const calcRecurringAmount = (r) => {
      const monthly = parseFloat(r.amount) || 0;
      const tp = parseInt(r.totalPayments) || 0;
      const ed = r.endDate ? new Date(r.endDate) : null;
      
      if (isMonth) return monthly;
      
      if (isYear) {
         let startM = (year === nowY) ? nowM : 0;
         if (year < nowY) return 0; 
         let endM = 11;
         if (ed) {
             if (ed.getFullYear() < year) return 0;
             if (ed.getFullYear() === year) endM = Math.min(endM, ed.getMonth());
         }
         let rem = Math.max(0, endM - startM + 1);
         if (tp > 0) rem = Math.min(rem, tp);
         return monthly * rem;
      }
      
      if (tp > 0) return monthly * tp;
      if (ed) {
        const rem = Math.max(0, (ed.getFullYear() - nowY) * 12 + (ed.getMonth() - nowM) + 1);
        return monthly * rem;
      }
      return monthly;
    };

    const calcRemainLabel = (r) => {
      if (isMonth) return "";
      const tp = parseInt(r.totalPayments) || 0;
      if (isYear) {
          const amt = calcRecurringAmount(r) / (parseFloat(r.amount)||1);
          return amt > 0 ? `u tekućoj god. (${Math.round(amt)} mj.)` : "0 mj.";
      }
      if (tp > 0) return `${tp} obroka preostalo`;
      if (r.endDate) {
        const ed = new Date(r.endDate);
        const rem = Math.max(0, (ed.getFullYear() - nowY) * 12 + (ed.getMonth() - nowM) + 1);
        return `${rem} mj. preostalo`;
      }
      return "";
    };

    const items = [];
    if (expFilter.rate) {
      fd.filter(t=>t.installmentGroup&&(t.status==="Čeka plaćanje" || t.status==="U obradi"))
        .forEach(t=>items.push({type:"rata",desc:t.description,amount:+t.amount||0,date:t.date,cat:t.category}));
    }
    if (expFilter.recurring || expFilter.kredit) {
      rec.forEach(r=>{
        const isKred = r.category === "Kredit" || (r.description && r.description.toLowerCase().includes("kredit"));
        
        if (isKred && !expFilter.kredit) return;
        if (!isKred && !expFilter.recurring) return;

        const paid = fd.some(t=>t.recurringId===r.id&&t.status==="Plaćeno");
        if (!paid || isYear || isAll) {
          const amt = calcRecurringAmount(r);
          if (amt > 0) {
            items.push({
              type: isKred ? "kredit" : "obveza",
              desc: r.description,
              amount: amt,
              cat: r.category,
              endDate: r.endDate,
              totalPay: parseInt(r.totalPayments)||0,
              remainLabel: calcRemainLabel(r)
            });
          }
        }
      });
    }
    if (expFilter.unpaid) {
      fd.filter(t=>(t.status==="Čeka plaćanje"||t.status==="U obradi")&&!t.installmentGroup&&!t.recurringId)
        .forEach(t=>items.push({type:"račun",desc:t.description,amount:+t.amount||0,date:t.date,cat:t.category}));
    }
    return items;
  },[fd, rec, expFilter, isMonth, isYear, isAll, year]);

  const expTotal = expData.reduce((s,e)=>s+e.amount,0);
  const typeLabel = {rata:"Obrok", obveza:"Obveza", račun:"U obradi", kredit:"Rata"};
  const typeColor = {rata:C.warning, obveza:C.accent, račun:C.expense, kredit:"#A78BFA"};

  const tabs=[["expected","Očekivano"],["categories","Kategorije"],["overview","Pregled/Saldo"],["paylocal","Plaćanje/Lokacije"]];
  const chartCard = { background:C.card, border:`1px solid ${C.border}`, borderRadius:15, padding:13, overflowX:"auto", marginBottom:10 };
  const chartLbl = (ic,text) => <div style={{ fontSize:11, fontWeight:600, color:C.textMuted, marginBottom:8, display:"flex", alignItems:"center", gap:5 }}><Ic n={ic} s={12} c={C.textMuted}/>{text}</div>;

  return (
    <div className="fi" style={{ width:"100%" }}>
      <StickyHeader C={C} icon="bar" title="Statistika"/>
      <div style={{ padding:"12px 16px 0" }}>

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:"10px 12px", marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:600, color:C.textMuted, marginBottom:8, display:"flex", alignItems:"center", gap:5 }}>
            <Ic n="cal" s={12} c={C.textMuted}/>Period prikaza
          </div>
          <div style={{ display:"flex", gap:5, overflowX:"auto", paddingBottom:2 }}>
            <Pill label={`${year}. (sve)`} active={isYear} color={C.accent} onClick={()=>setSelMonth("YEAR")}/>
            {MONTHS.map(m=>(
              <Pill key={m} label={m.slice(0,3)+"."} active={selMonth===m} color={C.accent} onClick={()=>setSelMonth(m)}/>
            ))}
            <Pill label={`Sve ukupno`} active={isAll} color={C.accent} onClick={()=>setSelMonth("ALL")}/>
          </div>
        </div>

        {mDetail && (
          <div className="su" style={{ background:`linear-gradient(135deg,${C.accent}15,${C.income}10)`, border:`1px solid ${C.accent}30`, borderRadius:14, padding:"12px 14px", marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
              <Ic n="cal" s={14} c={C.accent}/>{selMonth} {year}.
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:6 }}>
              {[
                { lb:"Primici", val:fmtEur(mDetail.inc), col:C.income },
                { lb:"Troškovi", val:fmtEur(mDetail.exp), col:C.expense },
                { lb:"Bilanca", val:fmtEur(mDetail.bal), col:mDetail.bal>=0?C.income:C.expense },
                { lb:"Stavki", val:mDetail.count, col:C.accent },
              ].map(({lb,val,col})=>(
                <div key={lb} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:9, color:C.textMuted, marginBottom:2 }}>{lb}</div>
                  <div style={{ fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:col }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display:"flex", gap:5, marginBottom:12, overflowX:"auto", paddingBottom:4 }}>
          {tabs.map(([id,lb])=><Pill key={id} label={lb} active={tab===id} color={C.accent} onClick={()=>setTab(id)}/>)}
        </div>

        {tab==="expected" && (
          <div style={chartCard}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ fontSize:12, fontWeight:600, color:C.textMuted }}>Ukupno očekivano</span>
              <span style={{ fontSize:16, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:C.expense }}>{fmtEur(expTotal)}</span>
            </div>
            <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
              {[
                {k:"recurring",lb:"Obveze",col:C.accent},
                {k:"rate",lb:"Obroci",col:C.warning},
                {k:"kredit",lb:"Rate",col:"#A78BFA"},
                {k:"unpaid",lb:"U obradi",col:C.expense}
              ].map(({k,lb,col})=>(
                <button key={k} onClick={()=>setExpFilter(f=>({...f,[k]:!f[k]}))}
                  style={{ padding:"5px 12px", borderRadius:18, border:`1.5px solid ${expFilter[k]?col:C.border}`, background:expFilter[k]?`${col}18`:"transparent", color:expFilter[k]?col:C.textMuted, fontSize:11, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ width:7, height:7, borderRadius:2, background:expFilter[k]?col:C.border }}/>{lb}
                </button>
              ))}
            </div>
            {expData.length===0
              ? <p style={{ textAlign:"center", color:C.textMuted, padding:16, fontSize:13 }}>Nema očekivanih obveza{isMonth?` za ${selMonth}`:""}</p>
              : expData.map((e,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderBottom:i<expData.length-1?`1px solid ${C.border}`:"none" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:0 }}>
                    <div style={{ width:7, height:7, borderRadius:2, background:typeColor[e.type], flexShrink:0 }}/>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:500, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.desc}</div>
                      <div style={{ fontSize:10, color:C.textMuted }}>{typeLabel[e.type]}{e.cat?` · ${e.cat}`:""}{e.remainLabel?` · ${e.remainLabel}`:""}{e.endDate&&!e.remainLabel?` · do ${fDate(e.endDate)}`:""}</div>
                    </div>
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:typeColor[e.type], flexShrink:0, marginLeft:8 }}>{fmtEur(e.amount)}</span>
                </div>
              ))
            }
          </div>
        )}

        {tab==="categories" && (
          <div style={chartCard}>
            {catD.length>0 ? <><PieChart width={W} height={200}><Pie data={catD} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" stroke="none">{catD.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}</Pie><Tooltip {...tt}/></PieChart><div style={{marginTop:10}}>{catD.map((c,i)=><div key={c.name} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.border}`,fontSize:12,color:C.text}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:9,height:9,borderRadius:3,background:CHART_COLORS[i%CHART_COLORS.length]}}/>{c.name}</div><span style={{fontFamily:"'JetBrains Mono',monospace"}}>{fmtEur(c.value)}</span></div>)}</div></> : <p style={{textAlign:"center",color:C.textMuted,padding:20,fontSize:13}}>Nema podataka</p>}
          </div>
        )}

        {tab==="overview" && <>
          <div style={chartCard}>
            {chartLbl("bar","Primici vs Troškovi")}
            <BarChart width={W} height={260} data={mBar}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="name" tick={{fill:C.textMuted,fontSize:9}} axisLine={false}/><YAxis tick={{fill:C.textMuted,fontSize:9}} axisLine={false} width={44} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/><Tooltip {...tt}/><Legend wrapperStyle={{fontSize:10}}/><Bar dataKey="Primici" fill={C.income} radius={[3,3,0,0]}/><Bar dataKey="Troškovi" fill={C.expense} radius={[3,3,0,0]}/><Bar dataKey="Čeka" fill={C.warning} radius={[3,3,0,0]}/><Bar dataKey="Obveze" fill={`${C.accent}80`} radius={[3,3,0,0]}/></BarChart>
          </div>
          <div style={chartCard}>
            {chartLbl("up","Kumulativni saldo")}
            <AreaChart width={W} height={220} data={saldo}><defs><linearGradient id="saldoFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.accent} stopOpacity={0.25}/><stop offset="95%" stopColor={C.accent} stopOpacity={0.03}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="name" tick={{fill:C.textMuted,fontSize:9}} axisLine={false}/><YAxis tick={{fill:C.textMuted,fontSize:9}} axisLine={false} width={44} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(1)}k`:v}/><Tooltip {...tt}/><Area type="monotone" dataKey="Saldo" stroke={C.accent} strokeWidth={2.5} fill="url(#saldoFill)" dot={{fill:C.accent,r:3}} activeDot={{r:6}} connectNulls={false}/></AreaChart>
          </div>
        </>}

        {tab==="paylocal" && <>
          <div style={chartCard}>
            {chartLbl("card","Po načinu plaćanja")}
            {payD.length>0 ? <BarChart width={W} height={200} data={payD} layout="vertical"><XAxis type="number" tick={{fill:C.textMuted,fontSize:9}} axisLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/><YAxis type="category" dataKey="name" tick={{fill:C.textMuted,fontSize:11}} axisLine={false} width={120}/><Tooltip {...tt}/><Bar dataKey="value" fill={C.warning} radius={[0,6,6,0]}/></BarChart> : <p style={{textAlign:"center",color:C.textMuted,padding:20,fontSize:13}}>Nema podataka</p>}
          </div>
          <div style={chartCard}>
            {chartLbl("pin","Po lokacijama")}
            {locD.length>0 ? <BarChart width={W} height={200} data={locD} layout="vertical"><XAxis type="number" tick={{fill:C.textMuted,fontSize:9}} axisLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/><YAxis type="category" dataKey="name" tick={{fill:C.textMuted,fontSize:11}} axisLine={false} width={100}/><Tooltip {...tt}/><Bar dataKey="value" fill={C.accent} radius={[0,6,6,0]}/></BarChart> : <p style={{textAlign:"center",color:C.textMuted,padding:20,fontSize:13}}>Nema podataka</p>}
          </div>
        </>}

      </div>
    </div>
  );
}

// ─── ListEditor (sa opcijom pomicanja gore-dolje) ─────────────────────────────
function ListEditor({ C, title, items, onBack }) {
  const [arr,  setArr]  = useState([...items]);
  const [nv,   setNv]   = useState("");
  const [eIdx, setEIdx] = useState(null);
  const [eVal, setEVal] = useState("");

  const add = () => { const v=nv.trim(); if(!v||arr.includes(v))return; setArr(a=>[...a,v]); setNv(""); };
  
  const move = (i, dir) => {
    if (i+dir < 0 || i+dir >= arr.length) return;
    const nArr = [...arr];
    [nArr[i], nArr[i+dir]] = [nArr[i+dir], nArr[i]];
    setArr(nArr);
  };

  const fld = { flex:1, height:42, padding:"0 12px", background:C.bg, border:`1.5px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:13 };

  return (
    <div className="fi" style={{ width:"100%" }}>
      <div style={{ position:"sticky", top:0, zIndex:50, background:C.bg, paddingTop:50, paddingBottom:10, paddingLeft:16, paddingRight:16, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={()=>onBack(arr)} title="Natrag" style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:10, padding:"8px 10px", cursor:"pointer", display:"flex", alignItems:"center" }}><Ic n="arrow_l" s={18} c={C.accent}/></button>
          <h2 style={{ fontSize:17, fontWeight:700, color:C.text }}>{title}</h2>
        </div>
      </div>
      <div style={{ padding:"14px 16px 0" }}>
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        <input type="text" placeholder="Nova stavka…" value={nv} onChange={e=>setNv(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} style={fld}/>
        <button onClick={add} title="Dodaj" style={{ height:42, padding:"0 16px", background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:10, color:"#fff", cursor:"pointer", display:"flex", alignItems:"center" }}><Ic n="plus" s={20} c="#fff"/></button>
      </div>
      {arr.map((item,i)=>(
        <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"10px 13px", marginBottom:7, display:"flex", alignItems:"center", gap:8 }}>
          
          <div style={{ display:"flex", flexDirection:"column", gap:2, marginRight:4 }}>
            <button onClick={()=>move(i, -1)} disabled={i===0} style={{ padding:2, background:"none", border:"none", cursor:i===0?"not-allowed":"pointer", opacity:i===0?0.2:1 }}><Ic n="chevron_up" s={14} c={C.textMuted}/></button>
            <button onClick={()=>move(i, 1)} disabled={i===arr.length-1} style={{ padding:2, background:"none", border:"none", cursor:i===arr.length-1?"not-allowed":"pointer", opacity:i===arr.length-1?0.2:1 }}><Ic n="chevron_down" s={14} c={C.textMuted}/></button>
          </div>

          {eIdx===i
            ? <>
                <input type="text" value={eVal} onChange={e=>setEVal(e.target.value)}
                  onKeyDown={e=>{ if(e.key==="Enter"){const v=eVal.trim();if(v)setArr(a=>a.map((x,j)=>j===i?v:x));setEIdx(null);} if(e.key==="Escape")setEIdx(null); }}
                  autoFocus style={{...fld,flex:1,height:36}}/>
                <button onClick={()=>{ const v=eVal.trim(); if(v)setArr(a=>a.map((x,j)=>j===i?v:x)); setEIdx(null); }} title="Spremi" style={{ background:C.income, border:"none", borderRadius:8, padding:"6px 10px", cursor:"pointer" }}><Ic n="check" s={14} c="#fff"/></button>
                <button onClick={()=>setEIdx(null)} title="Odustani" style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 10px", cursor:"pointer" }}><Ic n="x" s={14} c={C.textMuted}/></button>
              </>
            : <>
                <span style={{ flex:1, fontSize:14, color:C.text }}>{item}</span>
                <button onClick={()=>{ setEIdx(i); setEVal(item); }} title="Uredi" style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 8px", cursor:"pointer" }}><Ic n="edit" s={13} c={C.accent}/></button>
                {arr.length>1 && <button onClick={()=>setArr(a=>a.filter((_,j)=>j!==i))} title="Obriši" style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 8px", cursor:"pointer" }}><Ic n="trash" s={13} c={C.expense}/></button>}
              </>
          }
        </div>
      ))}
      <button onClick={()=>onBack(arr)} style={{ width:"100%", padding:13, marginTop:10, background:`linear-gradient(135deg,${C.income},#059669)`, border:"none", borderRadius:13, color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
        <Ic n="check" s={16} c="#fff"/>Spremi i vrati se
      </button>
      </div>
    </div>
  );
}

// ─── ShareModal ───────────────────────────────────────────────────────────────
function ShareModal({ C, txs, year, user, onClose }) {
  const [fmt2, setFmt2] = useState("summary");
  const [copied, setCopied] = useState(false);

  const sumTxt = buildSummary(txs, year, user);
  const csvTxt = buildCSV(txs);
  const content = fmt2==="summary" ? sumTxt : csvTxt;
  const subj    = encodeURIComponent(`Moja lova — ${year}. godina`);
  const body    = encodeURIComponent(fmt2==="summary" ? sumTxt : `CSV izvoz podataka za ${year}.\n\nKorisnik: ${[user.firstName,user.lastName].filter(Boolean).join(" ")||"—"}`);

  const dl = () => {
    const isCSV = fmt2==="csv";
    const blob = new Blob([content],{type:isCSV?"text/csv;charset=utf-8":"text/plain;charset=utf-8"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href=url; a.download=`moja_lova_${year}.${isCSV?"csv":"txt"}`; a.click(); URL.revokeObjectURL(url);
  };
  const cp = () => {
    try { navigator.clipboard.writeText(content); } catch { const ta=document.createElement("textarea");ta.value=content;document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta); }
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  };

  const channels=[
    {lb:"E-mail",   ic:"mail",  col:"#EA4335", fn:()=>window.open(`mailto:${user.email||""}?subject=${subj}&body=${body}`)},
    {lb:"WhatsApp", ic:"share", col:"#25D366", fn:()=>window.open(`https://wa.me/?text=${encodeURIComponent(sumTxt)}`)},
    {lb:"Telegram", ic:"share", col:"#2AABEE", fn:()=>window.open(`https://t.me/share/url?url=&text=${encodeURIComponent(sumTxt)}`)},
    {lb:"Viber",    ic:"phone", col:"#7360F2", fn:()=>window.open(`viber://forward?text=${encodeURIComponent(sumTxt.slice(0,1000))}`)},
    {lb:"SMS",      ic:"phone", col:"#4CAF50", fn:()=>window.open(`sms:?body=${encodeURIComponent(sumTxt.slice(0,500))}`)},
    {lb:copied?"Kopirano!":"Kopiraj", ic:copied?"check":"copy", col:copied?C.income:C.accent, fn:cp},
    {lb:"Preuzmi",  ic:"dl",    col:C.warning, fn:dl},
  ];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={e=>{ if(e.target===e.currentTarget)onClose(); }}>
      <div className="su" style={{ background:C.card, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:480, padding:"20px 16px 34px", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <h3 style={{ fontSize:17, fontWeight:700, color:C.text, display:"flex", alignItems:"center", gap:8 }}><Ic n="share" s={18} c={C.accent}/>Dijeli / Izvezi</h3>
          <button onClick={onClose} title="Zatvori" style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:10, padding:"6px 10px", cursor:"pointer" }}><Ic n="x" s={16} c={C.textMuted}/></button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
          {[["summary","Sažetak"],["csv","CSV tablica"]].map(([id,lb])=>(
            <button key={id} onClick={()=>setFmt2(id)}
              style={{ padding:"10px 8px", border:`1.5px solid ${fmt2===id?C.accent:C.border}`, borderRadius:12, background:fmt2===id?`${C.accent}15`:"transparent", color:fmt2===id?C.accent:C.textMuted, fontSize:13, fontWeight:fmt2===id?600:400, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              <Ic n={id==="summary"?"list":"bar"} s={14} c={fmt2===id?C.accent:C.textMuted}/>{lb}
            </button>
          ))}
        </div>
        <div style={{ background:C.cardAlt, borderRadius:12, padding:11, marginBottom:14, maxHeight:150, overflowY:"auto" }}>
          <pre style={{ fontSize:10, color:C.textSub, whiteSpace:"pre-wrap", fontFamily:"'JetBrains Mono',monospace", lineHeight:1.6 }}>{content.slice(0,600)}{content.length>600?"…":""}</pre>
        </div>
        <p style={{ fontSize:11, fontWeight:600, color:C.textMuted, letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>Odaberi kanal</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:14 }}>
          {channels.map(({lb,ic,col,fn})=>(
            <button key={lb} onClick={fn} style={{ padding:"11px 4px", background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:13, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
              <Ic n={ic} s={21} c={col}/><span style={{ fontSize:10, color:C.textMuted, textAlign:"center", lineHeight:1.2 }}>{lb}</span>
            </button>
          ))}
        </div>
        <p style={{ fontSize:11, color:C.textMuted, textAlign:"center" }}>WhatsApp/Telegram/Viber šalju sažetak. Za CSV → Preuzmi ili E-mail.</p>
      </div>
    </div>
  );
}

// ─── RecurringScreen (Redovne obveze) ─────────────────────────────────────────
function RecurringScreen({ C, lists, data, year, onAddTx, onBack }) {
  const cm   = curMonth();
  const cms  = sm(cm);
  const now  = new Date();
  const cmIdx= now.getMonth();
  const cmYr = now.getFullYear();

  const paidMap = useMemo(()=>{
    const m = {};
    data.filter(t=>{
      const d = new Date(t.date);
      return d.getMonth()===cmIdx && d.getFullYear()===cmYr && t.recurringId;
    }).forEach(t=>{ m[t.recurringId]=true; });
    return m;
  },[data,cmIdx,cmYr]);

  const payItem = (item) => {
    onAddTx({
      date: now.toISOString().split("T")[0],
      type: "Isplata",
      description: item.description,
      category: item.category || "",
      location: item.location || "",
      payment: item.payment || "",
      status: "Plaćeno",
      amount: parseFloat(item.amount) || 0,
      notes: `Redovna obveza · ${cm} ${cmYr}`,
      installments: 0,
      recurringId: item.id,
    });
  };

  const rec = lists.recurring || [];
  const paidCount = rec.filter(r=>paidMap[r.id]).length;

  return (
    <div className="fi" style={{ width:"100%" }}>
      <div style={{ position:"sticky", top:0, zIndex:50, background:C.bg, paddingTop:50, paddingBottom:10, paddingLeft:16, paddingRight:16, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h2 style={{ fontSize:18, fontWeight:700, display:"flex", alignItems:"center", gap:8, color:C.text }}>
            <Ic n="repeat" s={18} c={C.accent}/>Obveze · {cms}
          </h2>
          <button onClick={onBack} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, color:C.textMuted, padding:"8px 14px", borderRadius:10, fontSize:13, cursor:"pointer" }}>Natrag</button>
        </div>
      </div>

      <div style={{ padding:"14px 16px 0" }}>
        {rec.length > 0 && (
          <div className="su" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"12px 14px", marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:12, color:C.textMuted }}>Plaćeno ovaj mjesec</span>
              <span style={{ fontSize:13, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:paidCount===rec.length?C.income:C.accent }}>{paidCount}/{rec.length}</span>
            </div>
            <div style={{ height:6, borderRadius:3, background:C.cardAlt, overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:3, width:`${rec.length>0?(paidCount/rec.length*100):0}%`, background:`linear-gradient(90deg,${C.accent},${C.income})`, transition:"width .4s" }}/>
            </div>
          </div>
        )}

        {rec.length === 0 ? (
          <div style={{ textAlign:"center", padding:"50px 20px", color:C.textMuted }}>
            <Ic n="repeat" s={44} c={C.border} style={{ marginBottom:12, opacity:.3 }}/>
            <p style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Nema definiranih obveza</p>
            <p style={{ fontSize:12 }}>Dodaj redovne obveze u Postavkama → Redovne obveze</p>
          </div>
        ) : rec.map((item, i) => {
          const isPaid = !!paidMap[item.id];
          return (
            <div key={item.id} className="su" style={{
              background: isPaid ? `${C.income}08` : C.card,
              border: `1px solid ${isPaid ? C.income+"40" : C.border}`,
              borderLeft: `3px solid ${isPaid ? C.income : C.warning}`,
              borderRadius:14, padding:14, marginBottom:8, animationDelay:`${i*.04}s`,
              opacity: isPaid ? .7 : 1,
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <Ic n={isPaid?"check":"coins"} s={15} c={isPaid?C.income:C.warning}/>
                    <span style={{ fontWeight:600, fontSize:14, color:C.text }}>{item.description}</span>
                    {isPaid ? (
                      <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:10, background:`${C.income}20`, color:C.income }}>Plaćeno</span>
                    ) : (
                      <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:10, background:`${C.warning}20`, color:C.warning }}>Čeka plaćanje</span>
                    )}
                  </div>
                  <div style={{ fontSize:11, color:C.textMuted, marginTop:4, paddingLeft:22 }}>
                    {item.category && <span>{item.category}</span>}
                    {item.dueDate && <span> · dospijeva {item.dueDate}. u mj.</span>}
                    {item.location && <span> · {item.location}</span>}
                    {item.payment && <span> · {item.payment}</span>}
                    {item.totalPayments>0 && <span> · {item.totalPayments} obroka</span>}
                    {item.endDate && <span> · do {fDate(item.endDate)}</span>}
                  </div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0, marginLeft:10 }}>
                  <div style={{ fontSize:16, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:isPaid?C.income:C.expense }}>
                    {fmtEur(+item.amount||0)}
                  </div>
                </div>
              </div>
              {!isPaid && (
                <button onClick={()=>payItem(item)}
                  style={{ width:"100%", marginTop:10, padding:10, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:11, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                  <Ic n="check" s={14} c="#fff"/>Dodaj transakciju
                </button>
              )}
            </div>
          );
        })}

        {rec.length > 0 && (
          <div style={{ textAlign:"center", padding:"12px 0 20px", color:C.textMuted, fontSize:12 }}>
            {paidCount === rec.length
              ? <span style={{ color:C.income, fontWeight:600 }}>✓ Sve obveze za {cms} su plaćene!</span>
              : `${rec.length - paidCount} od ${rec.length} obveza čeka plaćanje`
            }
          </div>
        )}
      </div>
    </div>
  );
}

// ─── RecurringEditor (za Postavke sa strelicama) ──────────────────────────────
function RecurringEditor({ C, items, lists, onBack }) {
  const [arr, setArr]       = useState(items.map((it,i)=>({...it, id:it.id||`r_${i}_${Date.now()}`})));
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null); 
  const [form, setForm]     = useState({description:"",amount:"",category:"",location:"",payment:"",dueDate:"",endDate:"",totalPayments:""});

  const emptyForm = {description:"",amount:"",category:"",location:"",payment:"",dueDate:"",endDate:"",totalPayments:""};

  const fld = { width:"100%", height:42, padding:"0 12px", background:C.bg, border:`1.5px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:13 };
  const lbl = { fontSize:10, fontWeight:600, color:C.textMuted, marginBottom:4, display:"flex", alignItems:"center", gap:4, letterSpacing:.3, textTransform:"uppercase" };

  const openAdd = () => { setEditId(null); setForm(emptyForm); setAdding(true); };

  const openEdit = (item) => {
    setEditId(item.id);
    setForm({
      description: item.description || "", amount: String(item.amount || ""),
      category: item.category || "", location: item.location || "", payment: item.payment || "",
      dueDate: String(item.dueDate || ""), endDate: item.endDate || "", totalPayments: String(item.totalPayments || ""),
    });
    setAdding(false); 
  };

  const saveItem = () => {
    if (!form.description.trim() || !form.amount) return;
    if (editId) {
      setArr(a => a.map(it => it.id === editId
        ? { ...it, ...form, amount: parseFloat(form.amount)||0, totalPayments: parseInt(form.totalPayments)||0 }
        : it
      ));
    } else {
      setArr(a => [...a, { ...form, amount: parseFloat(form.amount)||0, totalPayments: parseInt(form.totalPayments)||0, id:`r_${Date.now()}` }]);
    }
    setForm(emptyForm); setEditId(null); setAdding(false);
  };

  const cancelForm = () => { setForm(emptyForm); setEditId(null); setAdding(false); };

  const move = (i, dir) => {
    if (i+dir < 0 || i+dir >= arr.length) return;
    const nArr = [...arr];
    [nArr[i], nArr[i+dir]] = [nArr[i+dir], nArr[i]];
    setArr(nArr);
  };

  return (
    <div className="fi" style={{ width:"100%" }}>
      <div style={{ position:"sticky", top:0, zIndex:50, background:C.bg, paddingTop:50, paddingBottom:10, paddingLeft:16, paddingRight:16, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button title="Natrag" onClick={()=>onBack(arr)} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:10, padding:"8px 10px", cursor:"pointer", display:"flex", alignItems:"center" }}><Ic n="arrow_l" s={18} c={C.accent}/></button>
          <h2 style={{ fontSize:17, fontWeight:700, color:C.text }}>Redovne obveze</h2>
        </div>
      </div>

      <div style={{ padding:"14px 16px 0" }}>

        {arr.map((item, i) => (
          <div key={item.id} style={{ marginBottom:7 }}>
            <div style={{
              background: editId===item.id ? `${C.accent}10` : C.card,
              border: `1px solid ${editId===item.id ? C.accent+"50" : C.border}`,
              borderRadius: editId===item.id ? "12px 12px 0 0" : 12,
              padding:"12px 13px",
              display:"flex", alignItems:"center", justifyContent:"space-between",
              transition:"background .2s, border-color .2s",
            }}>
              <div style={{ display:"flex", flexDirection:"column", gap:2, marginRight:8 }}>
                <button onClick={()=>move(i, -1)} disabled={i===0} style={{ padding:2, background:"none", border:"none", cursor:i===0?"not-allowed":"pointer", opacity:i===0?0.2:1 }}><Ic n="chevron_up" s={14} c={C.textMuted}/></button>
                <button onClick={()=>move(i, 1)} disabled={i===arr.length-1} style={{ padding:2, background:"none", border:"none", cursor:i===arr.length-1?"not-allowed":"pointer", opacity:i===arr.length-1?0.2:1 }}><Ic n="chevron_down" s={14} c={C.textMuted}/></button>
              </div>

              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:14, color:C.text }}>{item.description}</div>
                <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>
                  {fmtEur(+item.amount||0)}
                  {item.category && ` · ${item.category}`}
                  {item.dueDate && ` · dospijeva ${item.dueDate}.`}
                  {item.totalPayments>0 && ` · ${item.totalPayments} obroka`}
                  {item.endDate && ` · do ${fDate(item.endDate)}`}
                </div>
              </div>
              <div style={{ display:"flex", gap:6, flexShrink:0, marginLeft:8 }}>
                <button onClick={() => editId===item.id ? cancelForm() : openEdit(item)}
                  style={{ background: editId===item.id ? `${C.accent}20` : C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 8px", cursor:"pointer" }}>
                  <Ic n={editId===item.id ? "x" : "edit"} s={13} c={editId===item.id ? C.accent : C.accent}/>
                </button>
                <button onClick={() => setArr(a=>a.filter(x=>x.id!==item.id))}
                  style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 8px", cursor:"pointer" }}>
                  <Ic n="trash" s={13} c={C.expense}/>
                </button>
              </div>
            </div>

            {editId===item.id && (
              <div style={{ background:C.cardAlt, border:`1px solid ${C.accent}50`, borderTop:"none", borderRadius:"0 0 12px 12px", padding:14 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.accent, marginBottom:10, display:"flex", alignItems:"center", gap:5 }}>
                  <Ic n="edit" s={12} c={C.accent}/>Uredi redovnu obvezu
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:8 }}>
                    <div>
                      <label style={lbl}>Opis</label>
                      <input type="text" placeholder="Npr. Kredit" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={fld}/>
                    </div>
                    <div>
                      <label style={lbl}>Iznos €</label>
                      <input type="number" step="0.01" placeholder="0,00" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} style={{...fld,fontFamily:"'JetBrains Mono',monospace"}}/>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    <div>
                      <label style={lbl}>Kategorija</label>
                      <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={{...fld,color:!form.category?C.textMuted:C.text}}>
                        <option value="">- opcija -</option>
                        {lists.categories_expense.map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Lokacija</label>
                      <select value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} style={{...fld,color:!form.location?C.textMuted:C.text}}>
                        <option value="">- opcija -</option>
                        {lists.locations.map(l=><option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    <div>
                      <label style={lbl}>Plaćanje</label>
                      <select value={form.payment} onChange={e=>setForm(f=>({...f,payment:e.target.value}))} style={{...fld,color:!form.payment?C.textMuted:C.text}}>
                        <option value="">- opcija -</option>
                        {lists.payments.map(p=><option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Dan dospijeća u mjesecu</label>
                      <input type="number" min="1" max="31" placeholder="Dan (npr. 15)" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))} style={fld}/>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    <div>
                      <label style={{...lbl, opacity:form.endDate?0.4:1}}>Broj obroka</label>
                      <input type="number" min="0" placeholder={form.endDate?"(blokiran)":"0 = neograničeno"} value={form.totalPayments} disabled={!!form.endDate} onChange={e=>setForm(f=>({...f,totalPayments:e.target.value}))} style={{...fld, opacity:form.endDate?0.4:1, cursor:form.endDate?"not-allowed":"text"}}/>
                    </div>
                    <div>
                      <label style={{...lbl, opacity:form.totalPayments?0.4:1}}>Do datuma</label>
                      <input type="date" value={form.endDate} disabled={!!form.totalPayments} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))} style={{...fld, opacity:form.totalPayments?0.4:1, cursor:form.totalPayments?"not-allowed":"text"}}/>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, marginTop:4 }}>
                    <button onClick={saveItem} style={{ flex:1, padding:10, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:10, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                      <Ic n="check" s={14} c="#fff"/>Spremi
                    </button>
                    <button onClick={cancelForm} style={{ flex:1, padding:10, background:C.card, border:`1px solid ${C.border}`, borderRadius:10, color:C.textMuted, fontSize:13, fontWeight:600, cursor:"pointer" }}>Odustani</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {adding ? (
          <div style={{ background:C.cardAlt, border:`1.5px solid ${C.accent}40`, borderRadius:14, padding:14, marginBottom:10 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.accent, marginBottom:10, display:"flex", alignItems:"center", gap:5 }}>
              <Ic n="plus" s={12} c={C.accent}/>Nova redovna obveza
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:8 }}>
                <div>
                  <label style={lbl}>Opis</label>
                  <input type="text" placeholder="Npr. Kredit" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={fld}/>
                </div>
                <div>
                  <label style={lbl}>Iznos €</label>
                  <input type="number" step="0.01" placeholder="0,00" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} style={{...fld,fontFamily:"'JetBrains Mono',monospace"}}/>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div>
                  <label style={lbl}>Kategorija</label>
                  <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={{...fld,color:!form.category?C.textMuted:C.text}}>
                    <option value="">- opcija -</option>
                    {lists.categories_expense.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Lokacija</label>
                  <select value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} style={{...fld,color:!form.location?C.textMuted:C.text}}>
                    <option value="">- opcija -</option>
                    {lists.locations.map(l=><option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div>
                  <label style={lbl}>Plaćanje</label>
                  <select value={form.payment} onChange={e=>setForm(f=>({...f,payment:e.target.value}))} style={{...fld,color:!form.payment?C.textMuted:C.text}}>
                    <option value="">- opcija -</option>
                    {lists.payments.map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Dan dospijeća u mjesecu</label>
                  <input type="number" min="1" max="31" placeholder="Dan (npr. 15)" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))} style={fld}/>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div>
                  <label style={{...lbl, opacity:form.endDate?0.4:1}}>Broj obroka</label>
                  <input type="number" min="0" placeholder={form.endDate?"(blokiran)":"0 = neograničeno"} value={form.totalPayments} disabled={!!form.endDate} onChange={e=>setForm(f=>({...f,totalPayments:e.target.value}))} style={{...fld, opacity:form.endDate?0.4:1, cursor:form.endDate?"not-allowed":"text"}}/>
                </div>
                <div>
                  <label style={{...lbl, opacity:form.totalPayments?0.4:1}}>Do datuma</label>
                  <input type="date" value={form.endDate} disabled={!!form.totalPayments} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))} style={{...fld, opacity:form.totalPayments?0.4:1, cursor:form.totalPayments?"not-allowed":"text"}}/>
                </div>
              </div>
              <div style={{ display:"flex", gap:8, marginTop:4 }}>
                <button onClick={saveItem} style={{ flex:1, padding:10, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:10, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                  <Ic n="check" s={14} c="#fff"/>Dodaj
                </button>
                <button onClick={cancelForm} style={{ flex:1, padding:10, background:C.card, border:`1px solid ${C.border}`, borderRadius:10, color:C.textMuted, fontSize:13, fontWeight:600, cursor:"pointer" }}>Odustani</button>
              </div>
            </div>
          </div>
        ) : (
          <button onClick={openAdd} style={{ width:"100%", padding:12, marginBottom:10, background:`${C.accent}15`, border:`1.5px dashed ${C.accent}50`, borderRadius:12, color:C.accent, fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <Ic n="plus" s={16} c={C.accent}/>Dodaj redovnu obvezu
          </button>
        )}

        <button onClick={()=>onBack(arr)} style={{ width:"100%", padding:13, marginTop:6, background:`linear-gradient(135deg,${C.income},#059669)`, border:"none", borderRadius:13, color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <Ic n="check" s={16} c="#fff"/>Spremi i vrati se
        </button>
      </div>
    </div>
  );
}

// ─── GeneralSettings (Novi ekran za opće postavke) ────────────────────────────
function GeneralSettings({ C, txs, setTxs, prefs, updPrefs, user, updUser, sec, updSec, year, setSetupMode, setUnlocked, onBack }) {
  const [pinChg,  setPinChg]  = useState(false);
  const [rmPin,   setRmPin]   = useState(false);
  const [vPin,    setVPin]    = useState("");
  const [vErr,    setVErr]    = useState("");
  const [share,   setShare]   = useState(false);
  const [confirm, setConfirm] = useState(false);

  // LOGIKA PROFILA
  const hasProfileData = user.firstName || user.lastName || user.phone || user.email;
  const [isEditingProfile, setIsEditingProfile] = useState(!hasProfileData);

  if (pinChg) return <SetupPin C={C} isChange onSave={hash=>{ updSec({pinHash:hash,attempts:0,totalFailed:0,lockedUntil:null}); setPinChg(false); }} onSkip={()=>setPinChg(false)}/>;

  const cy = curYear();

  const fld = { width:"100%", height:46, padding:"0 12px", background:C.cardAlt, border:`1.5px solid ${C.border}`, borderRadius:12, color:C.text, fontSize:14 };
  const lbl = { fontSize:11, fontWeight:600, color:C.textMuted, marginBottom:5, display:"flex", alignItems:"center", gap:5, letterSpacing:.3, textTransform:"uppercase" };

  const SL = ({t,icon}) => (
    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:9, marginTop:4 }}>
      <Ic n={icon} s={13} c={C.textMuted}/>
      <p style={{ fontSize:10, fontWeight:700, color:C.textMuted, letterSpacing:1.2, textTransform:"uppercase" }}>{t}</p>
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

  const expJSON  = () => { const b=new Blob([JSON.stringify(txs,null,2)],{type:"application/json"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`moja_lova_${new Date().toISOString().split("T")[0]}.json`;a.click();URL.revokeObjectURL(u); };
  const expCSV   = () => { const b=new Blob([buildCSV(txs)],{type:"text/csv;charset=utf-8"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`moja_lova_${new Date().toISOString().split("T")[0]}.csv`;a.click();URL.revokeObjectURL(u); };
  const impJSON  = e  => { const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=ev=>{ try{const d=JSON.parse(ev.target.result);if(Array.isArray(d))setTxs(d);}catch{} }; r.readAsText(f); };
  const removePIN = async () => { const h=await hashPin(vPin); if(h===sec.pinHash){updSec({pinHash:null,bioEnabled:false,bioCredId:null,attempts:0,totalFailed:0,lockedUntil:null});setRmPin(false);setVPin("");setVErr("");}else setVErr("Pogrešan PIN"); };

  // BIOMETRIJA REGISTRACIJA
  const toggleBio = async () => {
    if (sec.bioEnabled) {
      updSec({ bioEnabled: false, bioCredId: null });
      return;
    }
    if (!window.PublicKeyCredential) {
      alert("Tvoj uređaj/preglednik ne podržava WebAuthn (Biometriju) ili aplikacija nije na HTTPS protokolu.");
      return;
    }
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = Uint8Array.from("mojalova_user", c=>c.charCodeAt(0));
      const createOpt = {
        publicKey: {
          rp: { name: "Moja Lova", id: window.location.hostname || "localhost" },
          user: { id: userId, name: user.email || "Korisnik", displayName: [user.firstName, user.lastName].join(" ") || "Korisnik" },
          challenge: challenge,
          pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
          authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
          timeout: 60000
        }
      };
      const cred = await navigator.credentials.create(createOpt);
      const idBase64 = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
      updSec({ bioEnabled: true, bioCredId: idBase64 });
      alert("Biometrija uspješno aktivirana!");
    } catch (e) {
      alert("Postavljanje biometrije nije uspjelo.\nProvjeri je li aplikacija na sigurnoj vezi (HTTPS) i koristiš li podržan uređaj.");
    }
  };

  const dn = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <div className="fi" style={{ width:"100%" }}>
      <StickyHeader C={C} icon="gear" title="Opće postavke"
        right={<button onClick={onBack} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, color:C.textMuted, padding:"8px 14px", borderRadius:10, fontSize:13, cursor:"pointer" }}>Natrag</button>}
      />
      <div style={{ padding:"12px 16px 0" }}>

        <SL t="Profil korisnika" icon="user"/>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:15, padding:15, marginBottom:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
            <div style={{ width:46, height:46, borderRadius:14, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:"flex", alignItems:"center", justifyContent:"center" }}><Ic n="user" s={22} c="#fff"/></div>
            <div>
              <div style={{ fontSize:15, fontWeight:600, color:C.text }}>{dn||"Korisnik"}</div>
              <div style={{ fontSize:12, color:C.textMuted }}>{user.email||"Nije upisana e-mail adresa"}</div>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div>
                <label style={{...lbl, opacity:isEditingProfile?1:0.5}}><Ic n="user" s={11} c={C.textMuted}/>Ime</label>
                <input type="text" placeholder="Npr. Bojan" value={user.firstName} disabled={!isEditingProfile} onChange={e=>updUser({firstName:e.target.value})} style={{...fld, opacity:isEditingProfile?1:0.5}}/>
              </div>
              <div>
                <label style={{...lbl, opacity:isEditingProfile?1:0.5}}><Ic n="user" s={11} c={C.textMuted}/>Prezime</label>
                <input type="text" placeholder="Npr. Vivoda" value={user.lastName} disabled={!isEditingProfile} onChange={e=>updUser({lastName:e.target.value})} style={{...fld, opacity:isEditingProfile?1:0.5}}/>
              </div>
            </div>
            <div>
              <label style={{...lbl, opacity:isEditingProfile?1:0.5}}><Ic n="phone" s={11} c={C.textMuted}/>Telefon</label>
              <input type="tel" placeholder="+385 91 234 5678" value={user.phone} disabled={!isEditingProfile} onChange={e=>updUser({phone:e.target.value})} style={{...fld, opacity:isEditingProfile?1:0.5}}/>
            </div>
            <div>
              <label style={{...lbl, opacity:isEditingProfile?1:0.5}}><Ic n="mail" s={11} c={C.textMuted}/>E-mail</label>
              <input type="email" placeholder="npr. bojan@email.com" value={user.email} disabled={!isEditingProfile} onChange={e=>updUser({email:e.target.value})} style={{...fld, opacity:isEditingProfile?1:0.5}}/>
            </div>
            
            {isEditingProfile ? (
              <button onClick={() => setIsEditingProfile(false)} 
                  style={{ padding:"11px 0", background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:12, color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all .3s" }}>
                <Ic n="check" s={16} c="#fff"/>Spremi profil
              </button>
            ) : (
              <button onClick={() => setIsEditingProfile(true)} 
                  style={{ padding:"11px 0", background:`linear-gradient(135deg,${C.income},#059669)`, border:"none", borderRadius:12, color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all .3s" }}>
                <Ic n="edit" s={16} c="#fff"/>Izmijeni profil
              </button>
            )}
          </div>
        </div>

        <div style={{ marginTop:14, marginBottom:6 }}>
          <SL t="Izgled" icon="sun"/>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:13, marginBottom:7 }}>
            <p style={{ fontSize:12, color:C.textMuted, marginBottom:10 }}>Tema prikaza</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:7 }}>
              {[["dark","moon","Tamni"],["light","sun","Svijetli"],["auto","auto","Auto"]].map(([id,ic,lb])=>{
                const a = prefs.theme===id;
                return <button key={id} onClick={()=>updPrefs({theme:id})} style={{ padding:"10px 6px", borderRadius:11, border:`1.5px solid ${a?C.accent:C.border}`, background:a?`${C.accent}15`:"transparent", color:a?C.accent:C.textMuted, fontSize:11, fontWeight:a?700:400, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <Ic n={ic} s={17} c={a?C.accent:C.textMuted}/>{lb}
                </button>;
              })}
            </div>
          </div>
        </div>

        <div style={{ marginTop:14, marginBottom:6 }}>
          <SL t="Sigurnost" icon="shield"/>
          {!sec.pinHash
            ? <Row icon="lock" label="Postavi PIN zaštitu" sub="Aplikacija nije zaštićena" onClick={()=>setSetupMode(true)}/>
            : <>
                <Row icon="lock" label="Promijeni PIN" sub={`Zaštita aktivna · max ${MAX_ATT} pokušaja`} onClick={()=>setPinChg(true)}/>
                <Row icon="finger" label="Biometrija" sub={sec.bioEnabled?"Aktivno":"Omogući fingerprint/Face ID"} toggle toggled={sec.bioEnabled} onClick={toggleBio}/>
                <Row icon="unlock" label="Ukloni PIN zaštitu" danger onClick={()=>setRmPin(v=>!v)} right={false}/>
                {rmPin && (
                  <div style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:12, padding:13, marginBottom:7 }}>
                    <p style={{ fontSize:12, color:C.textMuted, marginBottom:8 }}>Unesite trenutni PIN:</p>
                    <div style={{ display:"flex", gap:8 }}>
                      <input type="password" placeholder="PIN" value={vPin} onChange={e=>{ setVPin(e.target.value); setVErr(""); }} style={{...fld,flex:1,height:40}} maxLength={6}/>
                      <button onClick={removePIN} style={{ padding:"0 14px", background:C.expense, border:"none", borderRadius:10, color:"#fff", fontWeight:600, cursor:"pointer", height:40, fontSize:13 }}>Ukloni</button>
                    </div>
                    {vErr && <p style={{ fontSize:11, color:C.expense, marginTop:5 }}>{vErr}</p>}
                  </div>
                )}
              </>
          }
        </div>

        <div style={{ marginTop:14, marginBottom:6 }}>
          <SL t="Dijeli i izvezi" icon="share"/>
          <button onClick={()=>setShare(true)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 15px", background:`linear-gradient(135deg,${C.accent}20,${C.income}15)`, border:`1px solid ${C.accent}40`, borderRadius:13, marginBottom:7, cursor:"pointer" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <Ic n="share" s={19} c={C.accent}/>
              <div><div style={{ fontSize:14, fontWeight:600, color:C.text }}>Dijeli podatke</div><div style={{ fontSize:11, color:C.textMuted }}>E-mail, WhatsApp, Telegram…</div></div>
            </div>
            <Ic n="chevron" s={14} c={C.accent} style={{ transform:"rotate(-90deg)" }}/>
          </button>
          <Row icon="dl"  label="Izvezi JSON"        onClick={expJSON}/>
          <Row icon="bar" label="Izvezi CSV (Excel)"  onClick={expCSV}/>
          <label style={{ display:"block", cursor:"pointer" }}>
            <div style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:C.card, border:`1px solid ${C.border}`, borderRadius:13, marginBottom:7, color:C.text }}>
              <Ic n="ul" s={16} c={C.accent}/><span style={{ fontSize:14, fontWeight:500 }}>Uvezi JSON</span>
            </div>
            <input type="file" accept=".json" onChange={impJSON} style={{ display:"none" }}/>
          </label>
        </div>

        <div style={{ marginTop:14, marginBottom:6 }}>
          <SL t="Opasna zona" icon="alert"/>
          {!confirm
            ? <Row icon="trash" label="Obriši sve podatke" danger onClick={()=>setConfirm(true)} right={false}/>
            : <div className="su" style={{ background:`${C.expense}12`, border:`1px solid ${C.expense}40`, borderRadius:13, padding:15, marginBottom:7 }}>
                <p style={{ fontSize:13, color:C.expense, fontWeight:600, marginBottom:12, display:"flex", alignItems:"center", gap:6 }}><Ic n="alert" s={14} c={C.expense}/>Ovo se ne može poništiti!</p>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>{ setTxs([]); setConfirm(false); }} style={{ flex:1, padding:11, background:C.expense, border:"none", borderRadius:10, color:"#fff", fontWeight:700, cursor:"pointer" }}>Da, obriši</button>
                  <button onClick={()=>setConfirm(false)} style={{ flex:1, padding:11, background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, cursor:"pointer" }}>Odustani</button>
                </div>
              </div>
          }
        </div>

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:15, marginBottom:28, marginTop:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:"flex", alignItems:"center", justifyContent:"center" }}><Ic n="wallet" s={20} c="#fff"/></div>
            <div><div style={{ fontSize:15, fontWeight:700, color:C.text }}>Moja lova</div><div style={{ fontSize:11, color:C.textMuted }}>Verzija 1.1</div></div>
          </div>
          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:11 }}>
            <p style={{ fontSize:13, fontWeight:600, color:C.text }}>Autor: Bojan Vivoda</p>
            <p style={{ fontSize:11, color:C.textMuted, marginTop:3 }}>© {cy} Bojan Vivoda · Sva prava pridržana.</p>
            <p style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>Osobna upotreba · Nije za komercijalnu distribuciju.</p>
          </div>
        </div>
        
        {share && <ShareModal C={C} txs={txs} year={year} user={user} onClose={()=>setShare(false)}/>}
      </div>
    </div>
  );
}

// ─── Settings (Glavni izbornik) ───────────────────────────────────────────────
function Settings({ C, txs, setTxs, prefs, updPrefs, user, updUser, lists, setLists, subPg, setSubPg, year, sec, updSec, setUnlocked, setSetupMode }) {
  const cy = curYear();
  const years = Array.from({length:12},(_,i)=>cy-5+i);

  if (subPg) {
    if (subPg === "general") {
      return <GeneralSettings C={C} txs={txs} setTxs={setTxs} prefs={prefs} updPrefs={updPrefs} user={user} updUser={updUser} sec={sec} updSec={updSec} year={year} setSetupMode={setSetupMode} setUnlocked={setUnlocked} onBack={()=>setSubPg(null)} />;
    }
    if (subPg === "recurring") {
      return <RecurringEditor C={C} items={lists.recurring||[]} lists={lists} onBack={arr=>{ setLists(l=>({...l,recurring:arr})); setSubPg(null); }}/>;
    }
    const MAP = { cat_exp:{title:"Kategorije — Troškovi",key:"categories_expense"}, cat_inc:{title:"Kategorije — Primici",key:"categories_income"}, locations:{title:"Lokacije",key:"locations"}, payments:{title:"Načini plaćanja",key:"payments"}, statuses:{title:"Statusi",key:"statuses"} };
    const m = MAP[subPg];
    return <ListEditor C={C} title={m.title} items={lists[m.key]} onBack={arr=>{ setLists(l=>({...l,[m.key]:arr})); setSubPg(null); }}/>;
  }

  const fld = { width:"100%", height:46, padding:"0 12px", background:C.cardAlt, border:`1.5px solid ${C.border}`, borderRadius:12, color:C.text, fontSize:14 };
  const sel = { ...fld, backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat:"no-repeat", backgroundPosition:"right 12px center" };

  const SL = ({t,icon}) => (
    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:9, marginTop:4 }}>
      <Ic n={icon} s={13} c={C.textMuted}/>
      <p style={{ fontSize:10, fontWeight:700, color:C.textMuted, letterSpacing:1.2, textTransform:"uppercase" }}>{t}</p>
    </div>
  );

  const Row = ({icon,label,sub,onClick,danger=false,right}) => (
    <button onClick={onClick} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:C.card, border:`1px solid ${danger?C.expense+"50":C.border}`, borderRadius:13, marginBottom:7, cursor:"pointer", textAlign:"left" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <Ic n={icon} s={16} c={danger?C.expense:C.accent}/>
        <div>
          <div style={{ fontSize:14, fontWeight:500, color:danger?C.expense:C.text }}>{label}</div>
          {sub && <div style={{ fontSize:11, color:C.textMuted, marginTop:1 }}>{sub}</div>}
        </div>
      </div>
      {right!==false && <div style={{ display:"flex", alignItems:"center", gap:5 }}>{right && <span style={{ fontSize:12, color:C.textMuted }}>{right}</span>}<Ic n="chevron" s={14} c={C.textMuted} style={{ transform:"rotate(-90deg)" }}/></div>}
    </button>
  );

  return (
    <div className="fi" style={{ width:"100%" }}>
      <StickyHeader C={C} icon="gear" title="Postavke"
        right={
          <button onClick={()=>setSubPg("general")} title="Opće postavke" style={{ background:"transparent", border:"none", cursor:"pointer", padding:4, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Ic n="dots" s={22} c={C.accent}/>
          </button>
        }
      />
      
      <div style={{ padding:"12px 16px 0" }}>

        <div style={{ marginTop:4, marginBottom:6 }}>
          <SL t="Aktivna godina" icon="cal"/>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:13 }}>
            <p style={{ fontSize:12, color:C.textMuted, marginBottom:9, display:"flex", alignItems:"center", gap:5 }}><Ic n="cal" s={12} c={C.textMuted}/>Prikazana godina</p>
            <select value={prefs.year} onChange={e=>updPrefs({year:+e.target.value})} style={sel}>
              {years.map(y=><option key={y} value={y}>{y}{y===cy?" (trenutna)":""}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginTop:14, marginBottom:6 }}>
          <SL t="Redovne obveze" icon="repeat"/>
          <Row icon="repeat" label="Upravljaj obvezama" sub={`${(lists.recurring||[]).length} definiranih obveza`} onClick={()=>setSubPg("recurring")}/>
        </div>

        <div style={{ marginTop:14, marginBottom:6 }}>
          <SL t="Prilagodba popisa" icon="list"/>
          {[{id:"cat_exp",ic:"tag",lb:"Kategorije troškova",n:lists.categories_expense.length},{id:"cat_inc",ic:"tag",lb:"Kategorije primici",n:lists.categories_income.length},{id:"locations",ic:"pin",lb:"Lokacije",n:lists.locations.length},{id:"payments",ic:"card",lb:"Načini plaćanja",n:lists.payments.length},{id:"statuses",ic:"check",lb:"Statusi",n:lists.statuses.length}].map(({id,ic,lb,n})=>(
            <Row key={id} icon={ic} label={lb} right={`${n} stavki`} onClick={()=>setSubPg(id)}/>
          ))}
        </div>

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:15, marginBottom:28, marginTop:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:"flex", alignItems:"center", justifyContent:"center" }}><Ic n="wallet" s={20} c="#fff"/></div>
            <div><div style={{ fontSize:15, fontWeight:700, color:C.text }}>Moja lova</div><div style={{ fontSize:11, color:C.textMuted }}>Verzija 1.1</div></div>
          </div>
          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:11 }}>
            <p style={{ fontSize:13, fontWeight:600, color:C.text }}>Autor: Bojan Vivoda</p>
            <p style={{ fontSize:11, color:C.textMuted, marginTop:3 }}>© {cy} Bojan Vivoda · Sva prava pridržana.</p>
            <p style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>Osobna upotreba · Nije za komercijalnu distribuciju.</p>
          </div>
        </div>

      </div>
    </div>
  );
}