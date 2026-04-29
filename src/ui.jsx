import { useState } from 'react';
import { fmtEur, fDate } from '../lib/helpers.js';

// ─── Icon system ─────────────────────────────────────────────────────────────
export const Ic = ({ n, s=20, c="#fff", style={} }) => {
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
    zap:         <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"{...p}/></>
  };
  return <svg viewBox="0 0 24 24" style={{ width:s, height:s, flexShrink:0, ...style }}>{map[n] ?? null}</svg>;
};

// ─── Pill (filter buttons) ────────────────────────────────────────────────────
export const Pill = ({ label, active, color, inactiveColor, onClick }) => (
  <button onClick={onClick} style={{
    padding:"6px 14px", borderRadius:20, cursor:"pointer",
    border:`1.5px solid ${active ? color : "transparent"}`,
    background: active ? `${color}20` : "transparent",
    color: active ? color : (inactiveColor || "#64748B"),
    fontSize:12, fontWeight: active ? 600 : 400,
    whiteSpace:"nowrap", flexShrink:0, transition:"all .2s",
  }}>{label}</button>
);

// ─── StickyHeader ─────────────────────────────────────────────────────────────
export const StickyHeader = ({ C, icon, title, right }) => (
  <div className="hdr" style={{
    position:"sticky", top:0, zIndex:50,
    background:C.bg, paddingBottom:10,
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

// ─── QuickAddModal ────────────────────────────────────────────────────────────
export function QuickAddModal({ C, t, onClose, onSave }) {
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const fld = { width:"100%", height:46, padding:"0 12px", background:C.cardAlt, border:`1.5px solid ${C.border}`, borderRadius:12, color:C.text, fontSize:14 };

  return (
    <div className="fi" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="su" style={{background:C.card,borderRadius:18,width:"100%",maxWidth:340,padding:20,border:`1px solid ${C.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h3 style={{fontSize:16,fontWeight:700,color:C.text,display:"flex",alignItems:"center",gap:6}}><Ic n="zap" s={18} c={C.warning}/> {t("Brzi unos")}</h3>
          <button onClick={onClose} style={{background:C.cardAlt,border:`1px solid ${C.border}`,borderRadius:8,padding:6,cursor:"pointer"}}><Ic n="x" s={14} c={C.textMuted}/></button>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,fontWeight:600,color:C.textMuted,marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:.5}}>{t("Iznos (€)")}</label>
          <input type="number" step="0.01" autoFocus placeholder="0,00" value={amount} onChange={e=>setAmount(e.target.value)} style={{...fld,fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:18,color:C.warning}}/>
        </div>
        <div style={{marginBottom:20}}>
          <label style={{fontSize:11,fontWeight:600,color:C.textMuted,marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:.5}}>{t("Opis / Kratko")}</label>
          <input type="text" placeholder={t("Npr. Stanarina")} value={desc} onChange={e=>setDesc(e.target.value)} style={fld}/>
        </div>
        <button onClick={()=>{ if(amount&&desc){onSave({amount,desc});} }} style={{width:"100%",padding:14,background:`linear-gradient(135deg,${C.warning},#F59E0B)`,border:"none",borderRadius:14,color:"#000",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <Ic n="check" s={16} c="#000"/>{t("Spremi skicu")}
        </button>
      </div>
    </div>
  );
}

// ─── ActionHubModal ───────────────────────────────────────────────────────────
export function ActionHubModal({ C, t, drafts, onClose, onNew, onSelect, onDel }) {
  return (
    <div className="fi" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="su" style={{background:C.bg,borderRadius:20,width:"100%",maxWidth:360,padding:"20px 16px",border:`1px solid ${C.border}`,boxShadow:`0 10px 40px rgba(0,0,0,0.3)`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{fontSize:16,fontWeight:700,color:C.text}}>{t("Što želite dodati?")}</h3>
          <button onClick={onClose} style={{background:C.cardAlt,border:`1px solid ${C.border}`,borderRadius:8,padding:6,cursor:"pointer"}}><Ic n="x" s={14} c={C.textMuted}/></button>
        </div>
        <button onClick={onNew} style={{width:"100%",padding:16,background:`linear-gradient(135deg,${C.accent},${C.accentDk})`,border:"none",borderRadius:14,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:20}}>
          <Ic n="plus" s={18} c="#fff"/> {t("Novi puni unos")}
        </button>
        {drafts.length > 0 && (
          <div>
            <div style={{fontSize:11,fontWeight:600,color:C.textMuted,marginBottom:10,textTransform:"uppercase",letterSpacing:.5,display:"flex",alignItems:"center",gap:6}}>
              <Ic n="zap" s={13} c={C.warning}/> {t("Nedovršene skice")} ({drafts.length})
            </div>
            <div style={{maxHeight:250,overflowY:"auto"}}>
              {drafts.map(d => (
                <div key={d.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:12,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,marginBottom:8}}>
                   <div style={{display:"flex",flexDirection:"column",flex:1,cursor:"pointer",textAlign:"left"}} onClick={()=>onSelect(d)}>
                     <span style={{fontSize:14,fontWeight:600,color:C.text}}>{d.description}</span>
                     <span style={{fontSize:11,color:C.textMuted}}>{fDate(d.date)} · {t("Brzi unos")}</span>
                   </div>
                   <div style={{display:"flex",alignItems:"center",gap:10}}>
                     <span style={{fontSize:15,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:C.warning}}>{fmtEur(d.amount)}</span>
                     <button onClick={()=>onDel(d.id)} style={{background:C.cardAlt,border:`1px solid ${C.border}`,borderRadius:8,padding:6,cursor:"pointer"}}><Ic n="trash" s={14} c={C.expense}/></button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
