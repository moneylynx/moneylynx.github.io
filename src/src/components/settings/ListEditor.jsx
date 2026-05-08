import { useState, useEffect, useMemo, useRef } from 'react';
import { K, DEF_LISTS, T, MONTHS, MONTHS_EN, MSHORT, MSHORT_EN, MAX_ATT, BACKUP_SNOOZE_MS, CURRENCIES, TIMEZONES } from '../../lib/constants.js';
import { fmtEur, fDate, load, save, curYear, buildCSV, buildSummary, nativeSaveAndShare, isCapacitor } from '../../lib/helpers.js';
import { hashPinV2, hashPinLegacy } from '../../lib/crypto.js';
import { Ic, LynxLogo, LynxLogoWhite, StickyHeader } from '../ui.jsx';
import { SetupPin } from '../auth.jsx';

function ListEditor({ C, title, items, onBack, t }) {
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
      <div className="hdr" style={{ position:"sticky", top:0, zIndex:50, background:C.bg, paddingBottom:10, paddingLeft:16, paddingRight:16, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={()=>onBack(arr)} title={t("Natrag")} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:10, padding:"8px 10px", cursor:"pointer", display:"flex", alignItems:"center" }}><Ic n="arrow_l" s={18} c={C.accent}/></button>
          <h2 style={{ fontSize:17, fontWeight:700, color:C.text }}>{t(title)}</h2>
        </div>
      </div>
      <div style={{ padding:"14px 16px 0" }}>
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        <input type="text" placeholder={t("Nova stavka…")} value={nv} onChange={e=>setNv(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} style={fld}/>
        <button onClick={add} title={t("Dodaj")} style={{ height:42, padding:"0 16px", background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:10, color:"#fff", cursor:"pointer", display:"flex", alignItems:"center" }}><Ic n="plus" s={20} c="#fff"/></button>
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
                <button onClick={()=>{ const v=eVal.trim(); if(v)setArr(a=>a.map((x,j)=>j===i?v:x)); setEIdx(null); }} title={t("Spremi")} style={{ background:C.income, border:"none", borderRadius:8, padding:"6px 10px", cursor:"pointer" }}><Ic n="check" s={14} c="#fff"/></button>
                <button onClick={()=>setEIdx(null)} title={t("Odustani")} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 10px", cursor:"pointer" }}><Ic n="x" s={14} c={C.textMuted}/></button>
              </>
            : <>
                <span style={{ flex:1, fontSize:14, color:C.text }}>{t(item)}</span>
                <button onClick={()=>{ setEIdx(i); setEVal(item); }} title={t("Uredi")} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 8px", cursor:"pointer" }}><Ic n="edit" s={13} c={C.accent}/></button>
                {arr.length>1 && <button onClick={()=>setArr(a=>a.filter((_,j)=>j!==i))} title={t("Obriši")} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 8px", cursor:"pointer" }}><Ic n="trash" s={13} c={C.expense}/></button>}
              </>
          }
        </div>
      ))}
      <button onClick={()=>onBack(arr)} style={{ width:"100%", padding:13, marginTop:10, background:`linear-gradient(135deg,${C.income},#059669)`, border:"none", borderRadius:13, color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
        <Ic n="check" s={16} c="#fff"/>{t("Spremi i vrati se")}
      </button>
      </div>
    </div>
  );
}

export { ListEditor };
export default ListEditor;
