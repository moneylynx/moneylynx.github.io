import { useState, useEffect, useMemo, useRef } from 'react';
import { K, DEF_LISTS, T, MONTHS, MONTHS_EN, MSHORT, MSHORT_EN, MAX_ATT, BACKUP_SNOOZE_MS, CURRENCIES, TIMEZONES } from '../../lib/constants.js';
import { fmtEur, fDate, load, save, curYear, buildCSV, buildSummary, nativeSaveAndShare, isCapacitor } from '../../lib/helpers.js';
import { hashPinV2, hashPinLegacy } from '../../lib/crypto.js';
import { Ic, LynxLogo, LynxLogoWhite, StickyHeader } from '../ui.jsx';
import { SetupPin } from '../auth.jsx';

function ShareModal({ C, txs, year, user, onClose, t, lang }) {
  const [fmt2, setFmt2] = useState("summary");
  const [copied, setCopied] = useState(false);

  const sumTxt = buildSummary(txs, year, user, t);
  const csvTxt = buildCSV(txs, t, lang);
  const content = fmt2==="summary" ? sumTxt : csvTxt;
  const subj    = encodeURIComponent(`${t("Moja Lova")} — ${year}.`);
  const body    = encodeURIComponent(fmt2==="summary" ? sumTxt : `CSV — ${year}.\n\nUser: ${[user.firstName,user.lastName].filter(Boolean).join(" ")||"—"}`);

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
    {lb:"E-mail",   ic:"mail",  col:"#EA4335", fn:()=>window.open(`mailto:${encodeURIComponent(user.email||"")}?subject=${subj}&body=${body}`, "_blank", "noopener,noreferrer")},
    {lb:"WhatsApp", ic:"share", col:"#25D366", fn:()=>window.open(`https://wa.me/?text=${encodeURIComponent(sumTxt)}`, "_blank", "noopener,noreferrer")},
    {lb:"Telegram", ic:"share", col:"#2AABEE", fn:()=>window.open(`https://t.me/share/url?url=&text=${encodeURIComponent(sumTxt)}`, "_blank", "noopener,noreferrer")},
    {lb:"Viber",    ic:"phone", col:"#7360F2", fn:()=>window.open(`viber://forward?text=${encodeURIComponent(sumTxt.slice(0,1000))}`, "_blank", "noopener,noreferrer")},
    {lb:"SMS",      ic:"phone", col:"#4CAF50", fn:()=>window.open(`sms:?body=${encodeURIComponent(sumTxt.slice(0,500))}`, "_blank", "noopener,noreferrer")},
    {lb:copied?t("Kopirano!"):t("Kopiraj"), ic:copied?"check":"copy", col:copied?C.income:C.accent, fn:cp},
    {lb:t("Preuzmi"),  ic:"dl",    col:C.warning, fn:dl},
  ];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={e=>{ if(e.target===e.currentTarget)onClose(); }}>
      <div className="su" style={{ background:C.card, borderRadius:20, width:"100%", maxWidth:420, padding:"20px 16px 20px", maxHeight:"85vh", overflowY:"auto", border:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <h3 style={{ fontSize:17, fontWeight:700, color:C.text, display:"flex", alignItems:"center", gap:8 }}><Ic n="share" s={18} c={C.accent}/>{t("Dijeli / Izvezi")}</h3>
          <button onClick={onClose} title={t("Zatvori")} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:10, padding:"6px 10px", cursor:"pointer" }}><Ic n="x" s={16} c={C.textMuted}/></button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
          {[["summary",t("Sažetak")],["csv",t("CSV tablica")]].map(([id,lb])=>(
            <button key={id} onClick={()=>setFmt2(id)}
              style={{ padding:"10px 8px", border:`1.5px solid ${fmt2===id?C.accent:C.border}`, borderRadius:12, background:fmt2===id?`${C.accent}15`:"transparent", color:fmt2===id?C.accent:C.textMuted, fontSize:13, fontWeight:fmt2===id?600:400, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              <Ic n={id==="summary"?"list":"bar"} s={14} c={fmt2===id?C.accent:C.textMuted}/>{lb}
            </button>
          ))}
        </div>
        <div style={{ background:C.cardAlt, borderRadius:12, padding:11, marginBottom:14, maxHeight:150, overflowY:"auto" }}>
          <pre style={{ fontSize:10, color:C.textSub, whiteSpace:"pre-wrap", fontFamily:"'JetBrains Mono',monospace", lineHeight:1.6 }}>{content.slice(0,600)}{content.length>600?"…":""}</pre>
        </div>
        <p style={{ fontSize:11, fontWeight:600, color:C.textMuted, letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>{t("Odaberi kanal")}</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:14 }}>
          {channels.map(({lb,ic,col,fn})=>(
            <button key={lb} onClick={fn} style={{ padding:"11px 4px", background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:13, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
              <Ic n={ic} s={21} c={col}/><span style={{ fontSize:10, color:C.textMuted, textAlign:"center", lineHeight:1.2 }}>{lb}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export { ShareModal };
export default ShareModal;
