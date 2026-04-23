import { useState, useEffect, useMemo } from 'react';
import { K, DEF_LISTS, T, MONTHS, MONTHS_EN, MSHORT, MSHORT_EN, MAX_ATT, BACKUP_SNOOZE_MS } from '../lib/constants.js';
import { fmtEur, fDate, load, save, curYear, buildCSV, buildSummary, nativeSaveAndShare, isCapacitor } from '../lib/helpers.js';
import { hashPinV2, hashPinLegacy } from '../lib/crypto.js';
import { Ic, StickyHeader } from './ui.jsx';
import { SetupPin } from './auth.jsx';

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

// ─── ShareModal ───────────────────────────────────────────────────────────────
function ShareModal({ C, txs, year, user, onClose, t, lang }) {
  const [fmt2, setFmt2] = useState("summary");
  const [copied, setCopied] = useState(false);

  const sumTxt = buildSummary(txs, year, user, t);
  const csvTxt = buildCSV(txs, t, lang);
  const content = fmt2==="summary" ? sumTxt : csvTxt;
  const subj    = encodeURIComponent(`${t("Moja lova")} — ${year}.`);
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

// ─── RecurringScreen ──────────────────────────────────────────────────────────
function RecurringScreen({ C, lists, data, setTxs, onBack, t, lang }) {
  const cmIdx= new Date().getMonth();
  const cmName = lang==="en" ? MONTHS_EN[cmIdx] : MONTHS[cmIdx];
  const now  = new Date();
  const cmYr = now.getFullYear();
  
  const initialOrderRef = useRef(null);

  const items = useMemo(() => {
    const list = [];
    const rec = lists.recurring || [];
    const recTxsThisMonth = data.filter(x => {
      const d = new Date(x.date);
      return d.getMonth()===cmIdx && d.getFullYear()===cmYr && x.recurringId;
    });
    const paidMap = {};
    recTxsThisMonth.forEach(x => paidMap[x.recurringId] = x);

    rec.forEach(r => {
      const tx = paidMap[r.id];
      list.push({ uid: `rec_${r.id}`, type: "recurring", isPaid: !!tx, txId: tx ? tx.id : null, template: r, description: r.description, amount: r.amount, category: r.category, location: r.location, payment: r.payment, dueDate: r.dueDate, totalPayments: r.totalPayments, endDate: r.endDate });
    });

    const instThisMonth = data.filter(x => {
      const d = new Date(x.date);
      return d.getMonth()===cmIdx && d.getFullYear()===cmYr && x.installmentGroup;
    });

    instThisMonth.forEach(inst => {
      list.push({ uid: `inst_${inst.id}`, type: "installment", isPaid: inst.status === "Plaćeno", txId: inst.id, data: inst, description: inst.description, amount: inst.amount, category: inst.category, location: inst.location, payment: inst.payment });
    });

    const otherPendingThisMonth = data.filter(x => {
        const d = new Date(x.date);
        return d.getMonth()===cmIdx && d.getFullYear()===cmYr && (x.status === "Čeka plaćanje" || x.status === "U obradi") && !x.installmentGroup && !x.recurringId;
    });
    
    otherPendingThisMonth.forEach(ot => {
        list.push({ uid: `oth_${ot.id}`, type: "other", isPaid: false, txId: ot.id, data: ot, description: ot.description, amount: ot.amount, category: ot.category, location: ot.location, payment: ot.payment })
    });

    if (!initialOrderRef.current) {
        list.sort((a,b) => (a.isPaid === b.isPaid ? 0 : a.isPaid ? 1 : -1));
        initialOrderRef.current = list.map(x => x.uid);
    } else {
        list.sort((a,b) => {
            const idxA = initialOrderRef.current.indexOf(a.uid);
            const idxB = initialOrderRef.current.indexOf(b.uid);
            if (idxA === -1 && idxB === -1) return 0;
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
        });
    }
    return list;
  }, [data, lists.recurring, cmIdx, cmYr]);

  const paidCount = items.filter(it => it.isPaid).length;

  const togglePay = (item) => {
    if (item.isPaid) {
      if (item.type === "recurring") setTxs(p => p.filter(x => x.id !== item.txId));
      else if (item.type === "installment") setTxs(p => p.map(x => x.id === item.txId ? {...x, status: "Čeka plaćanje"} : x));
    } else {
      if (item.type === "recurring") {
        const newTx = {
          id: Date.now().toString(), date: now.toISOString().split("T")[0], type: "Isplata",
          description: item.description, category: item.category || "", location: item.location || "", payment: item.payment || "",
          status: "Plaćeno", amount: parseFloat(item.amount) || 0, notes: `${t("Redovna obveza")} · ${cmName} ${cmYr}.`, installments: 0, recurringId: item.template.id,
        };
        setTxs(p => [...p, newTx]);
      } else if (item.type === "installment" || item.type === "other") {
        setTxs(p => p.map(x => x.id === item.txId ? {...x, status: "Plaćeno", date: now.toISOString().split("T")[0]} : x));
      }
    }
  };

  return (
    <div className="fi" style={{ width:"100%" }}>
      <div className="hdr" style={{ position:"sticky", top:0, zIndex:50, background:C.bg, paddingBottom:10, paddingLeft:16, paddingRight:16, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h2 style={{ fontSize:18, fontWeight:700, display:"flex", alignItems:"center", gap:8, color:C.text }}>
            <Ic n="repeat" s={18} c={C.accent}/>{t("Obveze")} · {cmName} {cmYr}.
          </h2>
          <button onClick={onBack} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, color:C.textMuted, padding:"8px 14px", borderRadius:10, fontSize:13, cursor:"pointer" }}>{t("Natrag")}</button>
        </div>
      </div>

      <div style={{ padding:"14px 16px 0" }}>
        {items.length > 0 && (
          <div className="su" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"12px 14px", marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:12, color:C.textMuted }}>{t("Plaćeno ovaj mjesec")}</span>
              <span style={{ fontSize:13, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:paidCount===items.length?C.income:C.accent }}>{paidCount}/{items.length}</span>
            </div>
            <div style={{ height:6, borderRadius:3, background:C.cardAlt, overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:3, width:`${items.length>0?(paidCount/items.length*100):0}%`, background:`linear-gradient(90deg,${C.accent},${C.income})`, transition:"width .4s" }}/>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div style={{ textAlign:"center", padding:"50px 20px", color:C.textMuted }}>
            <Ic n="repeat" s={44} c={C.border} style={{ marginBottom:12, opacity:.3 }}/>
            <p style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>{t("Nema obveza za ovaj mjesec")}</p>
            <p style={{ fontSize:12 }}>{t("Ovdje će se pojaviti redovne obveze i obroci čiji datum pada u tekući mjesec.")}</p>
          </div>
        ) : items.map((item, i) => {
          return (
            <div key={item.uid} className="su" style={{
              background: item.isPaid ? `${C.income}08` : C.card,
              border: `1px solid ${item.isPaid ? C.income+"40" : C.border}`,
              borderLeft: `3px solid ${item.isPaid ? C.income : item.type==="recurring" ? C.accent : C.warning}`,
              borderRadius:14, padding:14, marginBottom:8, animationDelay:`${i*.03}s`,
              opacity: item.isPaid ? .7 : 1, transition:"all .2s"
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1, minWidth:0, textAlign:"left" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <Ic n={item.isPaid?"check": item.type==="recurring"?"repeat":"coins"} s={15} c={item.isPaid?C.income: item.type==="recurring"?C.accent:C.warning}/>
                    <span style={{ fontWeight:600, fontSize:14, color:C.text }}>{item.description}</span>
                  </div>
                  <div style={{ fontSize:11, color:C.textMuted, marginTop:4, paddingLeft:22 }}>
                    {item.category && <span>{t(item.category)}</span>}
                    {item.type==="recurring" && item.dueDate && <span> · {t("dospijeva")} {item.dueDate}. {t("u mj.")}</span>}
                    {item.type==="installment" && <span> · {t("Obrok")}</span>}
                    {item.location && <span> · {t(item.location)}</span>}
                    {item.type==="recurring" && item.totalPayments>0 && <span> · {item.totalPayments} {t("obroka ukupno")}</span>}
                  </div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0, marginLeft:10, display:"flex", flexDirection:"column", alignItems:"flex-end" }}>
                  <div style={{ fontSize:16, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:item.isPaid?C.income:C.expense }}>
                    {fmtEur(+item.amount||0)}
                  </div>
                  
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8 }}>
                    <span style={{ fontSize:11, fontWeight:600, color:item.isPaid?C.income:C.warning }}>
                        {item.isPaid ? t("Plaćeno") : t("Čeka plaćanje")}
                    </span>
                    <button onClick={()=>togglePay(item)}
                        style={{ fontSize:11, fontWeight:700, padding:"5px 12px", borderRadius:8, border:"none", background:item.isPaid?C.cardAlt:C.income, color:item.isPaid?C.textMuted:"#fff", cursor:"pointer", display:"flex", alignItems:"center", gap:4, transition:"all .2s", boxShadow:item.isPaid?"none":`0 2px 8px ${C.income}40` }}>
                        {item.isPaid ? <><Ic n="arrow_l" s={11} c={C.textMuted}/> {t("Vrati")}</> : <><Ic n="check" s={11} c="#fff"/> {t("Plati")}</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── RecurringEditor ──────────────────────────────────────────────────────────
function RecurringEditor({ C, items, lists, onBack, t }) {
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
      <div className="hdr" style={{ position:"sticky", top:0, zIndex:50, background:C.bg, paddingBottom:10, paddingLeft:16, paddingRight:16, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button title={t("Natrag")} onClick={()=>onBack(arr)} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:10, padding:"8px 10px", cursor:"pointer", display:"flex", alignItems:"center" }}><Ic n="arrow_l" s={18} c={C.accent}/></button>
          <h2 style={{ fontSize:17, fontWeight:700, color:C.text }}>{t("Redovne obveze")}</h2>
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

              <div style={{ flex:1, minWidth:0, textAlign:"left" }}>
                <div style={{ fontWeight:600, fontSize:14, color:C.text }}>{item.description}</div>
                <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>
                  {fmtEur(+item.amount||0)}
                  {item.category && ` · ${t(item.category)}`}
                  {item.dueDate && ` · ${t("dospijeva")} ${item.dueDate}.`}
                  {item.totalPayments>0 && ` · ${item.totalPayments} ${t("obroka")}`}
                  {item.endDate && ` · ${t("do")} ${fDate(item.endDate)}`}
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
                  <Ic n="edit" s={12} c={C.accent}/>{t("Uredi redovnu obvezu")}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:8 }}>
                    <div>
                      <label style={lbl}>{t("Opis")}</label>
                      <input type="text" placeholder={t("Npr. Kredit")} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={fld}/>
                    </div>
                    <div>
                      <label style={lbl}>{t("Iznos €")}</label>
                      <input type="number" step="0.01" placeholder="0,00" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} style={{...fld,fontFamily:"'JetBrains Mono',monospace"}}/>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    <div>
                      <label style={lbl}>{t("Kategorija")}</label>
                      <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={{...fld,color:!form.category?C.textMuted:C.text}}>
                        <option value="">{t("- opcija -")}</option>
                        {lists.categories_expense.map(c=><option key={c} value={c}>{t(c)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>{t("Lokacija")}</label>
                      <select value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} style={{...fld,color:!form.location?C.textMuted:C.text}}>
                        <option value="">{t("- opcija -")}</option>
                        {lists.locations.map(l=><option key={l} value={l}>{t(l)}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    <div>
                      <label style={lbl}>{t("Plaćanje")}</label>
                      <select value={form.payment} onChange={e=>setForm(f=>({...f,payment:e.target.value}))} style={{...fld,color:!form.payment?C.textMuted:C.text}}>
                        <option value="">{t("- opcija -")}</option>
                        {lists.payments.map(p=><option key={p} value={p}>{t(p)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>{t("DAN DOSPJECA")}</label>
                      <input type="number" min="1" max="31" placeholder={t("Dan (npr. 15)")} value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))} style={fld}/>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    <div>
                      <label style={{...lbl, opacity:form.endDate?0.4:1}}>{t("Broj obroka")}</label>
                      <input type="number" min="0" placeholder={form.endDate?t("(blokiran)"):t("0 = neograničeno")} value={form.totalPayments} disabled={!!form.endDate} onChange={e=>setForm(f=>({...f,totalPayments:e.target.value}))} style={{...fld, opacity:form.endDate?0.4:1, cursor:form.endDate?"not-allowed":"text"}}/>
                    </div>
                    <div>
                      <label style={{...lbl, opacity:form.totalPayments?0.4:1}}>{t("Do datuma")}</label>
                      <input type="date" value={form.endDate} disabled={!!form.totalPayments} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))} style={{...fld, opacity:form.totalPayments?0.4:1, cursor:form.totalPayments?"not-allowed":"text"}}/>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, marginTop:4 }}>
                    <button onClick={saveItem} style={{ flex:1, padding:10, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:10, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                      <Ic n="check" s={14} c="#fff"/>{t("Spremi")}
                    </button>
                    <button onClick={cancelForm} style={{ flex:1, padding:10, background:C.card, border:`1px solid ${C.border}`, borderRadius:10, color:C.textMuted, fontSize:13, fontWeight:600, cursor:"pointer" }}>{t("Odustani")}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {adding ? (
          <div style={{ background:C.cardAlt, border:`1.5px dashed ${C.accent}40`, borderRadius:14, padding:14, marginBottom:10 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.accent, marginBottom:10, display:"flex", alignItems:"center", gap:5 }}>
              <Ic n="plus" s={12} c={C.accent}/>{t("Nova redovna obveza")}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:8 }}>
                <div>
                  <label style={lbl}>{t("Opis")}</label>
                  <input type="text" placeholder={t("Npr. Kredit")} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={fld}/>
                </div>
                <div>
                  <label style={lbl}>{t("Iznos €")}</label>
                  <input type="number" step="0.01" placeholder="0,00" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} style={{...fld,fontFamily:"'JetBrains Mono',monospace"}}/>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div>
                  <label style={lbl}>{t("Kategorija")}</label>
                  <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={{...fld,color:!form.category?C.textMuted:C.text}}>
                    <option value="">{t("- opcija -")}</option>
                    {lists.categories_expense.map(c=><option key={c} value={c}>{t(c)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>{t("Lokacija")}</label>
                  <select value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} style={{...fld,color:!form.location?C.textMuted:C.text}}>
                    <option value="">{t("- opcija -")}</option>
                    {lists.locations.map(l=><option key={l} value={l}>{t(l)}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div>
                  <label style={lbl}>{t("Plaćanje")}</label>
                  <select value={form.payment} onChange={e=>setForm(f=>({...f,payment:e.target.value}))} style={{...fld,color:!form.payment?C.textMuted:C.text}}>
                    <option value="">{t("- opcija -")}</option>
                    {lists.payments.map(p=><option key={p} value={p}>{t(p)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>{t("DAN DOSPJECA")}</label>
                  <input type="number" min="1" max="31" placeholder={t("Dan (npr. 15)")} value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))} style={fld}/>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div>
                  <label style={{...lbl, opacity:form.endDate?0.4:1}}>{t("Broj obroka")}</label>
                  <input type="number" min="0" placeholder={form.endDate?t("(blokiran)"):t("0 = neograničeno")} value={form.totalPayments} disabled={!!form.endDate} onChange={e=>setForm(f=>({...f,totalPayments:e.target.value}))} style={{...fld, opacity:form.endDate?0.4:1, cursor:form.endDate?"not-allowed":"text"}}/>
                </div>
                <div>
                  <label style={{...lbl, opacity:form.totalPayments?0.4:1}}>{t("Do datuma")}</label>
                  <input type="date" value={form.endDate} disabled={!!form.totalPayments} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))} style={{...fld, opacity:form.totalPayments?0.4:1, cursor:form.totalPayments?"not-allowed":"text"}}/>
                </div>
              </div>
              <div style={{ display:"flex", gap:8, marginTop:4 }}>
                <button onClick={saveItem} style={{ flex:1, padding:10, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:10, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                  <Ic n="check" s={14} c="#fff"/>{t("Dodaj")}
                </button>
                <button onClick={cancelForm} style={{ flex:1, padding:10, background:C.card, border:`1px solid ${C.border}`, borderRadius:10, color:C.textMuted, fontSize:13, fontWeight:600, cursor:"pointer" }}>{t("Odustani")}</button>
              </div>
            </div>
          </div>
        ) : (
          <button onClick={openAdd} style={{ width:"100%", padding:12, marginBottom:10, background:`${C.accent}15`, border:`1.5px dashed ${C.accent}50`, borderRadius:12, color:C.accent, fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <Ic n="plus" s={16} c={C.accent}/>{t("Dodaj redovnu obvezu")}
          </button>
        )}

        <button onClick={()=>onBack(arr)} style={{ width:"100%", padding:13, marginTop:6, background:`linear-gradient(135deg,${C.income},#059669)`, border:"none", borderRadius:13, color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <Ic n="check" s={16} c="#fff"/>{t("Spremi i vrati se")}
        </button>
      </div>
    </div>
  );
}

// ─── GeneralSettings ──────────────────────────────────────────────────────────
function GeneralSettings({ C, txs, setTxs, drafts, lists, setLists, prefs, updPrefs, user, updUser, sec, updSec, year, setSetupMode, setUnlocked, onBack, onAbout, onChangePinCrypto, onRemovePinCrypto, t, lang }) {
  const [pinChg,  setPinChg]  = useState(false);
  const [rmPin,   setRmPin]   = useState(false);
  const [vPin,    setVPin]    = useState("");
  const [vErr,    setVErr]    = useState("");
  const [share,   setShare]   = useState(false);
  const [confirm, setConfirm] = useState(false);
  // Fallback state: if no download/share path works (some APK wrappers block both),
  // we show the JSON in a modal with a Copy button so the user can paste into any
  // note/chat app and save it elsewhere.
  const [exportFallback, setExportFallback] = useState(null); // { filename, content }
  const [exportYear, setExportYear]         = useState("all"); // "all" or specific year

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
        app: "Moja lova",
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

  // Restore — validates payload, confirms, writes to localStorage, reloads.
  const fullImport = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    // Quick pre-check by name/type — avoid wasting time on images, PDFs, etc.
    // that the user may accidentally pick (Android's file picker shows everything).
    const looksJson = /\.json$/i.test(file.name) || file.type === "application/json" || file.type === "";
    if (!looksJson) { alert(t("Datoteka nije valjan Moja lova backup.")); return; }

    const reader = new FileReader();
    reader.onerror = () => alert(t("Greška pri čitanju datoteke."));
    reader.onload = (ev) => {
      let parsed;
      try { parsed = JSON.parse(ev.target.result); }
      catch { alert(t("Datoteka nije valjan Moja lova backup.")); return; }

      // Accept new format (__moja_lova_backup wrapper) OR legacy format (plain txs array)
      let data = null;
      if (parsed && parsed.__moja_lova_backup && parsed.data && typeof parsed.data === "object") {
        data = parsed.data;
      } else if (Array.isArray(parsed)) {
        data = { txs: parsed }; // legacy: file contained just the txs array
      }
      if (!data) { alert(t("Datoteka nije valjan Moja lova backup.")); return; }

      if (!window.confirm(t("Vraćanjem podataka trenutni podaci bit će ZAMIJENJENI. Nastaviti?"))) return;

      try {
        if (Array.isArray(data.txs))    save(K.db,  data.txs);
        if (Array.isArray(data.drafts)) save(K.drf, data.drafts);
        if (data.lists && typeof data.lists === "object") save(K.lst, { ...DEF_LISTS, ...data.lists });
        if (data.user  && typeof data.user  === "object") save(K.usr, data.user);
        if (data.prefs && typeof data.prefs === "object") {
          // Preserve onboarded=true so user doesn't re-enter onboarding after restore.
          // Set lastBackupAt=now since successful import means data exists in a backup file.
          save(K.prf, { ...load(K.prf,{}), ...data.prefs, onboarded: true, lastBackupAt: Date.now(), backupSnoozedUntil: null });
        }
        alert(t("Podaci su uspješno vraćeni. Aplikacija će se ponovno učitati."));
        window.location.reload();
      } catch {
        alert(t("Datoteka nije valjan Moja lova backup."));
      }
    };
    reader.readAsText(file);
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
      const userId = Uint8Array.from("mojalova_user", c=>c.charCodeAt(0));
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
                <input type="text" placeholder="Npr. Bojan" value={user.firstName} disabled={!isEditingProfile} onChange={e=>updUser({firstName:e.target.value})} style={{...fld, opacity:isEditingProfile?1:0.5}}/>
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

          {/* 3) IMPORT (RESTORE) — full JSON restore with confirm */}
          <label style={{ display:"block", cursor:"pointer", marginBottom:7 }}>
            <div style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 15px", background:`linear-gradient(135deg,${C.income}18,${C.income}08)`, border:`1px solid ${C.income}40`, borderRadius:13 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <Ic n="ul" s={19} c={C.income}/>
                <div style={{ textAlign:"left" }}>
                  <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{t("Učitaj (Import / Restore)")}</div>
                  <div style={{ fontSize:11, color:C.textMuted }}>{t("Vrati podatke iz prethodne kopije")}</div>
                </div>
              </div>
              <Ic n="chevron" s={14} c={C.income} style={{ transform:"rotate(-90deg)" }}/>
            </div>
            {/* Android opens the Files/Documents picker when accept is a
                wildcard; JSON validity is verified inside fullImport. */}
            <input type="file" accept="*/*" onChange={fullImport} style={{ display:"none" }}/>
          </label>
        </div>

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
        </div>

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:15, marginBottom:28, marginTop:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:"flex", alignItems:"center", justifyContent:"center" }}><Ic n="wallet" s={20} c="#fff"/></div>
            <div style={{ flex:1 }}><div style={{ fontSize:15, fontWeight:700, color:C.text }}>{t("Moja lova")}</div><div style={{ fontSize:11, color:C.textMuted }}>{t("Verzija")} 1.2</div></div>
            {onAbout && (
              <button onClick={onAbout}
                style={{ width:32, height:32, borderRadius:"50%", background:`${C.accent}20`, border:`1.5px solid ${C.accent}50`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
                <span style={{ fontSize:14, fontWeight:700, color:C.accent, fontFamily:"serif", lineHeight:1 }}>i</span>
              </button>
            )}
          </div>
          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:11 }}>
            <p style={{ fontSize:13, fontWeight:600, color:C.text }}>{t("Autor:")} Bojan Vivoda</p>
            <p style={{ fontSize:11, color:C.textMuted, marginTop:3 }}>© {cy} Bojan Vivoda · {t("Sva prava pridržana.")}</p>
            <p style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{t("Osobna upotreba · Nije za komercijalnu distribuciju.")}</p>
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
                        await navigator.share({ files: [file], title: "Moja lova — Backup", text: filename });
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
  );
}

// ─── Settings (Glavni izbornik) ───────────────────────────────────────────────
// ─── AboutScreen ──────────────────────────────────────────────────────────────
function AboutScreen({ C, onBack, t, lang }) {
  const [section, setSection] = useState(null); // null = menu, string = content

  const sections = [
    { id:"help",        icon:"info",   label:t("Pomoć") },
    { id:"licences",    icon:"lock",   label:t("Licencni uvjeti") },
    { id:"disclaimer",  icon:"alert",  label:t("Odricanje odgovornosti") },
    { id:"privacy",     icon:"lock",   label:t("Privatnost i kolačići") },
    { id:"contact",     icon:"mail",   label:t("Kontaktiraj nas") },
    { id:"feedback",    icon:"zap",    label:t("Pošalji povratnu informaciju") },
    { id:"diagnostics", icon:"bar",    label:t("Dijagnostika") },
  ];

  const content = {
    help: {
      title: t("Pomoć"),
      body: lang === "en" ? `
GETTING STARTED
Open the app and tap the blue + button at the bottom to record your first transaction. Choose between Expense or Income, fill in the amount, description, category, location and payment method.

TRANSACTIONS
• Expense: a payment or cost
• Income: money received (salary, transfer…)
• Recurring obligation: a monthly repeating expense (subscription, loan, rent). Enable the "Recurring obligation?" toggle inside the Expense form.
• Installments: a purchase spread over multiple months (e.g. 24 installments for an appliance). Enable the "Installments?" toggle inside the Expense form.

DASHBOARD
The home screen shows your yearly balance, monthly income/expenses, top spending categories and a "To pay this month" list. Tap Pay next to any item to mark it as paid instantly.

TRANSACTIONS SCREEN
Filters at the top let you view: All, Pending, Paid, Processing, Income. The default view shows "Pending" so you immediately see what needs attention.

STATISTICS
Four views: Expected obligations, Categories, Overview/Balance, Payments & Locations. Use the month pills to narrow down to a specific period.

SETTINGS
• Active Year — switch the year you're analyzing
• Manage Obligations — edit or delete recurring obligations
• List Customization — add your own categories, locations, payment methods
• General Settings — profile, theme, language, security, backup

BACKUP & RESTORE
Your data lives only on your device. Go to Settings → General → Export (Backup) and use Copy, Share, or Download to save your data. To restore, use Settings → General → Import (Restore) and pick your JSON backup file.

PIN & BIOMETRICS
Set a 4-6 digit PIN in Settings → General → Set PIN Protection. After 5 wrong attempts the app locks for 30 seconds. After 10 wrong attempts all data is wiped. Enable Face ID / fingerprint in Settings → General → Biometrics.
`.trim() : `
POČETAK RADA
Otvori aplikaciju i pritisni plavi + gumb na dnu za unos prve transakcije. Odaberi Isplata ili Primitak, unesi iznos, opis, kategoriju, lokaciju i način plaćanja.

TRANSAKCIJE
• Isplata: plaćanje ili trošak
• Primitak: primljeni novac (plaća, uplata…)
• Redovna obveza: trošak koji se ponavlja svaki mjesec (pretplata, kredit, najam). Uključi prekidač "Redovna obveza?" unutar forme za Isplatu.
• Obročna otplata: kupnja raspoređena na više mjeseci (npr. 24 rate za uređaj). Uključi prekidač "Obročna otplata?" unutar forme za Isplatu.

POČETNI EKRAN
Prikazuje godišnju bilancu, primike/troškove za tekući mjesec, top kategorije potrošnje i popis "Za platiti ovog mjeseca". Pritisni Plati pored stavke da je odmah označi kao plaćenu.

EKRAN TRANSAKCIJE
Filteri na vrhu: Sve, Čeka plaćanje, Plaćeno, U obradi, Primici. Zadani prikaz je "Čeka plaćanje" da odmah vidiš što treba platiti.

STATISTIKA
Četiri prikaza: Očekivano, Kategorije, Pregled/Saldo, Plaćanje i Lokacije. Koristi pill gumbe za odabir određenog mjeseca ili cijele godine.

POSTAVKE
• Aktivna godina — prebaci godinu za analizu
• Upravljaj obvezama — uredi ili obriši redovne obveze
• Prilagodba popisa — dodaj vlastite kategorije, lokacije, načine plaćanja
• Opće postavke — profil, tema, jezik, sigurnost, backup

BACKUP I VRAĆANJE PODATAKA
Podaci se čuvaju isključivo na tvom uređaju. Idi u Postavke → Opće → Izvezi (Backup) i koristi Kopiraj, Podijeli ili Preuzmi za spremanje podataka. Za vraćanje: Postavke → Opće → Učitaj (Restore).

PIN I BIOMETRIJA
Postavi 4-6 znamenkasti PIN u Postavke → Opće → Postavi PIN zaštitu. Nakon 5 krivih pokušaja aplikacija se zaključa 30 sekundi. Nakon 10 krivih pokušaja svi podaci se brišu. Fingerprint/Face ID aktiviraj u Postavke → Opće → Biometrija.
`.trim()
    },
    licences: {
      title: t("Licencni uvjeti"),
      body: `Moja lova — Licencni uvjeti / Licence Terms

© 2024–2026 Bojan Vivoda. Sva prava pridržana.
All rights reserved.

UVJETI KORIŠTENJA (HR)
Ova aplikacija licencirana je isključivo za osobnu, nekomercijalnu upotrebu. Zabranjeno je: redistribuirati, prodavati, mijenjati ili koristiti kod, dizajn ili sadržaj ove aplikacije u komercijalne svrhe bez pisanog dopuštenja autora.

TERMS OF USE (EN)
This application is licensed for personal, non-commercial use only. Redistribution, sale, modification, or commercial use of the code, design, or content of this application without the author's written permission is prohibited.

KOMPONENTE OTVORENOG KODA / OPEN SOURCE COMPONENTS
Ova aplikacija koristi sljedeće open-source biblioteke:

• React 18.2 — MIT License — facebook/react
• Recharts 2.12 — MIT License — recharts/recharts
• Vite 5 — MIT License — vitejs/vite
• Capacitor 8 — MIT License — ionic-team/capacitor

Pune tekstove licenci za ove biblioteke možete pronaći na:
Full license texts available at: https://opensource.org/licenses/MIT`
    },
    disclaimer: {
      title: t("Odricanje odgovornosti"),
      body: lang === "en" ? `DISCLAIMER

Moja lova is provided "as is" without warranty of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.

FINANCIAL DECISIONS
This app is a personal budgeting tool only. It does not provide financial, investment, tax, or legal advice. All financial decisions made based on data entered into this app are the sole responsibility of the user. The author is not liable for any financial loss or damage arising from the use of this application.

DATA LOSS
The author is not responsible for loss of data resulting from: device failure, accidental deletion, uninstallation of the app, browser cache clearing, or any other cause. Users are strongly advised to regularly export backups.

ACCURACY
The app performs calculations based on user-entered data. The accuracy of all outputs depends entirely on the accuracy of the data entered.

AVAILABILITY
The author does not guarantee continuous availability of the web version (moja-lova-app.vercel.app). The app may be unavailable due to maintenance, updates, or third-party service outages.` :
`ODRICANJE ODGOVORNOSTI

Aplikacija Moja lova pruža se "kakva jest" bez ikakvih izričitih ili implicitnih jamstava, uključujući, ali ne ograničavajući se na jamstva prodajnosti, prikladnosti za određenu svrhu ili nekršenja prava.

FINANCIJSKE ODLUKE
Ova aplikacija je isključivo alat za osobno budžetiranje. Ne pruža financijske, investicijske, porezne niti pravne savjete. Sve financijske odluke donesene na temelju podataka unesenih u aplikaciju isključiva su odgovornost korisnika. Autor nije odgovoran za financijske gubitke ili štete nastale korištenjem aplikacije.

GUBITAK PODATAKA
Autor nije odgovoran za gubitak podataka uslijed: kvara uređaja, slučajnog brisanja, deinstalacije aplikacije, brisanja predmemorije preglednika ili bilo kojeg drugog uzroka. Korisnicima se snažno preporuča redovit izvoz sigurnosnih kopija.

TOČNOST
Aplikacija vrši izračune na temelju korisnikovih podataka. Točnost svih rezultata u potpunosti ovisi o točnosti unesenih podataka.

DOSTUPNOST
Autor ne jamči neprekidnu dostupnost web verzije (moja-lova-app.vercel.app). Aplikacija može biti nedostupna zbog održavanja, ažuriranja ili zastoja usluga trećih strana.`
    },
    privacy: {
      title: t("Privatnost i kolačići"),
      body: lang === "en" ? `PRIVACY & COOKIES POLICY

DATA COLLECTION
Moja lova does not collect, transmit, or store any personal data on external servers. All data entered into the app (transactions, categories, profile information) is stored exclusively on your device using browser localStorage or, in the Android app, the device's local storage.

No data is sent to the developer, third parties, or any cloud service without your explicit action (e.g. you choosing to export and email your data).

COOKIES
The web version (moja-lova-app.vercel.app) does not use tracking cookies, advertising cookies, or analytics cookies. The app may use browser storage (localStorage) to save your preferences and data — this is not a "cookie" in the traditional sense but serves a similar local storage function.

THIRD-PARTY SERVICES
The web app is hosted on Vercel (vercel.com). Vercel may log standard server access data (IP address, browser type, access times) as part of normal hosting operations. Please refer to Vercel's privacy policy for details.

The app loads fonts from Google Fonts CDN (fonts.googleapis.com). Google may collect standard CDN access logs. Please refer to Google's privacy policy for details.

YOUR RIGHTS
Since no personal data is collected or stored by the developer, there is no data to request, correct, or delete on our end. Your data is entirely under your control on your own device.

CONTACT
For privacy-related questions: see the "Contact us" section.` :
`POLITIKA PRIVATNOSTI I KOLAČIĆA

PRIKUPLJANJE PODATAKA
Moja lova ne prikuplja, ne prenosi niti pohranjuje nikakve osobne podatke na vanjskim poslužiteljima. Svi podaci uneseni u aplikaciju (transakcije, kategorije, podaci profila) pohranjuju se isključivo na tvom uređaju putem browser localStorage-a ili, u Android verziji, lokalne pohrane uređaja.

Nikakvi podaci ne šalju se programeru, trećim stranama niti nijednoj usluzi u oblaku bez tvoje izričite radnje (npr. kad odlučiš izvesti i e-mailom poslati svoje podatke).

KOLAČIĆI
Web verzija (moja-lova-app.vercel.app) ne koristi kolačiće za praćenje, oglašavanje niti analitiku. Aplikacija može koristiti browser localStorage za pohranu tvojih postavki i podataka — to nije "kolačić" u tradicionalnom smislu, ali služi sličnoj lokalnoj funkciji pohrane.

USLUGE TREĆIH STRANA
Web aplikacija je hostirana na Vercelu (vercel.com). Vercel može bilježiti standardne podatke o pristupu poslužitelju (IP adresa, vrsta preglednika, vremena pristupa) kao dio normalnog rada hostinga.

Aplikacija učitava fontove s Google Fonts CDN-a (fonts.googleapis.com). Google može prikupljati standardne CDN pristupne zapise.

TVOJA PRAVA
Budući da programer ne prikuplja niti pohranjuje osobne podatke, nema podataka koje bismo morali ispraviti ili obrisati s naše strane. Tvoji podaci u potpunosti su pod tvojom kontrolom, na tvom uređaju.`
    },
    contact: {
      title: t("Kontaktiraj nas"),
      body: `Moja lova
Autor: Bojan Vivoda

${lang === "en" ? "For questions, suggestions or bug reports, please reach out via:" : "Za pitanja, prijedloge ili prijavu grešaka, obratite se putem:"}

GitHub: github.com/bvivoda/Moja-lova-app
${lang === "en" ? "Web app:" : "Web aplikacija:"} moja-lova-app.vercel.app

${lang === "en" ? "When reporting a bug, please include:" : "Kod prijave greške, navedite:"}
${lang === "en" ? "• App version (1.2)" : "• Verziju aplikacije (1.2)"}
${lang === "en" ? "• Device and OS version" : "• Uređaj i verziju OS-a"}
${lang === "en" ? "• Steps to reproduce the issue" : "• Korake koji reproduciraju problem"}`
    },
    feedback: {
      title: t("Pošalji povratnu informaciju"),
      body: lang === "en" ? `SEND FEEDBACK

We appreciate your feedback! It helps improve the app for everyone.

Ways to provide feedback:

• GitHub Issues — for bug reports and feature requests:
  github.com/bvivoda/Moja-lova-app/issues

• GitHub Discussions — for general suggestions and ideas

Please describe:
1. What you were trying to do
2. What happened instead
3. What you expected to happen
4. Your device and OS version

Thank you for using Moja lova!` :
`POŠALJI POVRATNU INFORMACIJU

Hvala na povratnoj informaciji! Pomaže nam poboljšati aplikaciju za sve.

Načini pružanja povratnih informacija:

• GitHub Issues — za prijave grešaka i zahtjeve za nove značajke:
  github.com/bvivoda/Moja-lova-app/issues

• GitHub Discussions — za opće prijedloge i ideje

Molimo opiši:
1. Što si pokušavao napraviti
2. Što se umjesto toga dogodilo
3. Što si očekivao da se dogodi
4. Tvoj uređaj i verziju OS-a

Hvala što koristiš Moja lova!`
    },
    diagnostics: {
      title: t("Dijagnostika"),
      body: [
        `${lang==="en"?"App version":"Verzija aplikacije"}: 1.2`,
        `${lang==="en"?"Platform":"Platforma"}: ${typeof window !== "undefined" && window.Capacitor && window.Capacitor.isNativePlatform() ? "Android APK" : "Web / PWA"}`,
        `${lang==="en"?"User Agent":"User Agent"}: ${typeof navigator !== "undefined" ? navigator.userAgent : "N/A"}`,
        `${lang==="en"?"Language":"Jezik"}: ${typeof navigator !== "undefined" ? navigator.language : "N/A"}`,
        `${lang==="en"?"Screen":"Zaslon"}: ${typeof window !== "undefined" ? `${window.screen.width}×${window.screen.height}` : "N/A"}`,
        `${lang==="en"?"Online":"Online"}: ${typeof navigator !== "undefined" ? (navigator.onLine ? (lang==="en"?"Yes":"Da") : (lang==="en"?"No":"Ne")) : "N/A"}`,
        `${lang==="en"?"Service Worker":"Service Worker"}: ${"serviceWorker" in navigator ? (lang==="en"?"Supported":"Podržan") : (lang==="en"?"Not supported":"Nije podržan")}`,
        `${lang==="en"?"Storage available":"Pohrana dostupna"}: ${(() => { try { const t = "ml_test"; localStorage.setItem(t,"1"); localStorage.removeItem(t); return lang==="en"?"Yes":"Da"; } catch { return lang==="en"?"No":"Ne"; }})()}`,
      ].join("\n")
    },
  };

  const item = section ? content[section] : null;

  return (
    <div className="fi" style={{ width:"100%" }}>
      <StickyHeader C={C} icon="info" title={item ? item.title : t("O aplikaciji")}
        right={<button onClick={item ? ()=>setSection(null) : onBack}
          style={{ background:C.cardAlt, border:`1px solid ${C.border}`, color:C.textMuted, padding:"8px 14px", borderRadius:10, fontSize:13, cursor:"pointer" }}>
          {t("Natrag")}
        </button>}
      />
      <div style={{ padding:"14px 16px 24px" }}>
        {!section ? (
          <>
            <div style={{ background:`linear-gradient(135deg,${C.accent}18,${C.accent}08)`, border:`1px solid ${C.accent}30`, borderRadius:14, padding:"14px 16px", marginBottom:18, display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:44, height:44, borderRadius:14, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Ic n="wallet" s={22} c="#fff"/>
              </div>
              <div>
                <div style={{ fontSize:17, fontWeight:700, color:C.text }}>Moja lova</div>
                <div style={{ fontSize:12, color:C.textMuted }}>{t("Verzija")} 1.2 · © 2026 Bojan Vivoda</div>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {sections.map(s=>(
                <button key={s.id} onClick={()=>setSection(s.id)}
                  style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 15px", background:C.card, border:`1px solid ${C.border}`, borderRadius:13, cursor:"pointer", textAlign:"left" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:9, background:`${C.accent}18`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Ic n={s.icon} s={15} c={C.accent}/>
                    </div>
                    <span style={{ fontSize:14, fontWeight:500, color:C.text }}>{s.label}</span>
                  </div>
                  <Ic n="chevron" s={14} c={C.textMuted} style={{ transform:"rotate(-90deg)" }}/>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:16 }}>
            <pre style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, lineHeight:1.7, color:C.text, whiteSpace:"pre-wrap", wordBreak:"break-word", margin:0 }}>
              {item.body}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BudgetEditor ─────────────────────────────────────────────────────────────
function BudgetEditor({ C, cats, budgets, onBack, t }) {
  const [local, setLocal] = useState(() => ({ ...budgets }));

  const set = (cat, val) => {
    const n = parseFloat(val);
    setLocal(b => ({ ...b, [cat]: isNaN(n) || n <= 0 ? 0 : n }));
  };

  return (
    <div className="fi" style={{ width:"100%" }}>
      <StickyHeader C={C} icon="coins" title={t("Budžet limiti")}
        right={<button onClick={()=>onBack(local)} style={{ background:C.accent, border:"none", color:"#fff", padding:"8px 16px", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer" }}>{t("Spremi")}</button>}
      />
      <div style={{ padding:"14px 16px 24px" }}>
        <p style={{ fontSize:12, color:C.textMuted, marginBottom:14, lineHeight:1.5 }}>
          {t("Postavi mj. limit za svaku kategoriju troškova.")}
          {" "}{t("Bit ćeš upozoren/a pri unosu troška koji bi prešao limit.")}
        </p>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {cats.map(cat => {
            const val = local[cat] || "";
            const active = val > 0;
            return (
              <div key={cat} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 13px", background:C.card, border:`1px solid ${active ? C.warning+"80" : C.border}`, borderRadius:12 }}>
                <div style={{ flex:1, fontSize:13, fontWeight:500, color:C.text }}>{t(cat)}</div>
                <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
                  <input
                    type="number" min="0" step="1" placeholder={t("Bez limita")}
                    value={val === 0 ? "" : val}
                    onChange={e=>set(cat, e.target.value)}
                    style={{ width:100, padding:"6px 28px 6px 10px", background:C.cardAlt, border:`1px solid ${active?C.warning:C.border}`, borderRadius:8, color:active?C.warning:C.text, fontSize:13, fontWeight:active?700:400, fontFamily:"'JetBrains Mono',monospace", textAlign:"right" }}
                  />
                  <span style={{ position:"absolute", right:8, fontSize:11, color:C.textMuted, pointerEvents:"none" }}>€</span>
                </div>
                {active && (
                  <button onClick={()=>set(cat,0)} style={{ background:"transparent", border:"none", cursor:"pointer", padding:2 }}>
                    <Ic n="x" s={13} c={C.textMuted}/>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Settings (Glavni izbornik) ───────────────────────────────────────────────
function Settings({ C, txs, setTxs, drafts, prefs, updPrefs, user, updUser, lists, setLists, subPg, setSubPg, year, sec, updSec, setUnlocked, setSetupMode, onChangePinCrypto, onRemovePinCrypto, t, lang }) {
  const cy = curYear();
  const years = Array.from({length:12},(_,i)=>cy-5+i);

  if (subPg) {
    if (subPg === "general") {
      return <GeneralSettings C={C} txs={txs} setTxs={setTxs} drafts={drafts} lists={lists} setLists={setLists} prefs={prefs} updPrefs={updPrefs} user={user} updUser={updUser} sec={sec} updSec={updSec} year={year} setSetupMode={setSetupMode} setUnlocked={setUnlocked} onBack={()=>setSubPg(null)} onAbout={()=>setSubPg("about")} onChangePinCrypto={onChangePinCrypto} onRemovePinCrypto={onRemovePinCrypto} t={t} lang={lang} />;
    }
    if (subPg === "recurring") {
      return <RecurringEditor C={C} items={lists.recurring||[]} lists={lists} t={t} onBack={arr=>{ setLists(l=>({...l,recurring:arr})); setSubPg(null); }}/>;
    }
    if (subPg === "about") {
      return <AboutScreen C={C} onBack={()=>setSubPg(null)} t={t} lang={lang}/>;
    }
    if (subPg === "budgets") {
      return <BudgetEditor C={C} cats={lists.categories_expense} budgets={lists.budgets||{}} t={t}
        onBack={b=>{ setLists(l=>({...l,budgets:b})); setSubPg(null); }}/>;
    }
    const MAP = { cat_exp:{title:"Kategorije troškova",key:"categories_expense"}, cat_inc:{title:"Kategorije primici",key:"categories_income"}, locations:{title:"Lokacije",key:"locations"}, payments:{title:"Načini plaćanja",key:"payments"}, statuses:{title:"Statusi",key:"statuses"} };
    const m = MAP[subPg];
    return <ListEditor C={C} title={m.title} items={lists[m.key]} t={t} onBack={arr=>{ setLists(l=>({...l,[m.key]:arr})); setSubPg(null); }}/>;
  }

  const fld = { width:"100%", height:46, padding:"0 12px", background:C.cardAlt, border:`1.5px solid ${C.border}`, borderRadius:12, color:C.text, fontSize:14 };
  const sel = { ...fld, backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat:"no-repeat", backgroundPosition:"right 12px center" };

  const SL = ({text,icon}) => (
    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:9, marginTop:4 }}>
      <Ic n={icon} s={13} c={C.textMuted}/>
      <p style={{ fontSize:10, fontWeight:700, color:C.textMuted, letterSpacing:1.2, textTransform:"uppercase" }}>{text}</p>
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
      <StickyHeader C={C} icon="gear" title={t("Postavke")}
        right={
          <button onClick={()=>setSubPg("general")} title={t("Opće postavke")} style={{ background:"transparent", border:"none", cursor:"pointer", padding:4, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Ic n="dots" s={22} c={C.accent}/>
          </button>
        }
      />
      
      <div style={{ padding:"12px 16px 0" }}>

        <div style={{ marginTop:4, marginBottom:6 }}>
          <SL text={t("Aktivna godina")} icon="cal"/>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:13 }}>
            <p style={{ fontSize:12, color:C.textMuted, marginBottom:9, display:"flex", alignItems:"center", gap:5 }}><Ic n="cal" s={12} c={C.textMuted}/>{t("Prikazana godina")}</p>
            <select value={prefs.year} onChange={e=>updPrefs({year:+e.target.value})} style={sel}>
              {years.map(y=><option key={y} value={y}>{y}{y===cy?` ${t("(trenutna)")}`:""}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginTop:14, marginBottom:6 }}>
          <SL text={t("Redovne obveze")} icon="repeat"/>
          <Row icon="repeat" label={t("Upravljaj obvezama")} sub={`${(lists.recurring||[]).length} ${t("definiranih obveza")}`} onClick={()=>setSubPg("recurring")}/>
        </div>

        <div style={{ marginTop:14, marginBottom:6 }}>
          <SL text={t("Prilagodba popisa")} icon="list"/>
          {[
            {id:"cat_exp",ic:"tag",lb:t("Kategorije troškova"),n:lists.categories_expense.length},
            {id:"cat_inc",ic:"tag",lb:t("Kategorije primici"),n:lists.categories_income.length},
            {id:"locations",ic:"pin",lb:t("Lokacije"),n:lists.locations.length},
            {id:"payments",ic:"card",lb:t("Načini plaćanja"),n:lists.payments.length},
            {id:"statuses",ic:"check",lb:t("Statusi"),n:lists.statuses.length}
          ].map(({id,ic,lb,n})=>(
            <Row key={id} icon={ic} label={lb} right={`${n} ${t("stavki")}`} onClick={()=>setSubPg(id)}/>
          ))}
          <Row icon="coins" label={t("Budžet limiti")}
            right={`${Object.values(lists.budgets||{}).filter(v=>v>0).length} ${t("stavki")}`}
            onClick={()=>setSubPg("budgets")}/>
        </div>

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:15, marginBottom:28, marginTop:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:"flex", alignItems:"center", justifyContent:"center" }}><Ic n="wallet" s={20} c="#fff"/></div>
            <div style={{ flex:1 }}><div style={{ fontSize:15, fontWeight:700, color:C.text }}>{t("Moja lova")}</div><div style={{ fontSize:11, color:C.textMuted }}>{t("Verzija")} 1.2</div></div>
            <button onClick={()=>setSubPg("about")}
              style={{ width:32, height:32, borderRadius:"50%", background:`${C.accent}20`, border:`1.5px solid ${C.accent}50`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
              <span style={{ fontSize:14, fontWeight:700, color:C.accent, fontFamily:"serif", lineHeight:1 }}>i</span>
            </button>
          </div>
          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:11 }}>
            <p style={{ fontSize:13, fontWeight:600, color:C.text }}>{t("Autor:")} Bojan Vivoda</p>
            <p style={{ fontSize:11, color:C.textMuted, marginTop:3 }}>© {cy} Bojan Vivoda · {t("Sva prava pridržana.")}</p>
            <p style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{t("Osobna upotreba · Nije za komercijalnu distribuciju.")}</p>
          </div>
        </div>

      </div>
    </div>
  );
}
export { ListEditor, ShareModal, RecurringScreen, RecurringEditor, GeneralSettings, AboutScreen, BudgetEditor };
export default Settings;
