import { useState, useMemo, useEffect } from 'react';
import { fmtEur, fDate } from '../lib/helpers.js';
import { Ic, Pill, StickyHeader } from './ui.jsx';

function TxList({ C, data, year, filter, setFilter, onEdit, onDelete, onDeleteGroup, onPay, t, fmt: fmtProp }) {
  const fmt = fmtProp || fmtEur;
  const [q, setQ]          = useState("");
  const [delCfm,setDelCfm] = useState(null);
  const [grpCfm,setGrpCfm] = useState(null);
  const [page, setPage]    = useState(1);
  const PAGE_SIZE = 50;

  // Default to overdue on mount
  useEffect(() => { setFilter("overdue"); }, []);

  // Color map for filter → left border color
  const filterColor = {
    all:        null, // use type-based color
    expense:    C.income,
    pending:    C.warning,
    processing: "#FB923C",
    income:     C.income,
    overdue:    C.expense, // keep as-is
  };

  // Detect potential duplicates — same amount, date, description
  const dupIds = useMemo(() => {
    const seen = {};
    const dups = new Set();
    data.forEach(x => {
      const key = `${x.date}|${x.amount}|${x.description?.trim().toLowerCase()}`;
      if (seen[key]) { dups.add(x.id); dups.add(seen[key]); }
      else seen[key] = x.id;
    });
    return dups;
  }, [data]);

  const rows = useMemo(()=>{
    let f = data.filter(x=>new Date(x.date).getFullYear()===year);
    if (filter==="expense")  f = f.filter(x=>x.type==="Isplata" && x.status==="Plaćeno");
    if (filter==="income")   f = f.filter(x=>x.type==="Primitak");
    if (filter==="pending")  f = f.filter(x=>x.status==="Čeka plaćanje");
    if (filter==="processing") f = f.filter(x=>x.status==="U obradi");
    // "overdue" = pending/processing with date <= today (current + past months, unpaid)
    if (filter==="overdue") {
      const today = new Date(); today.setHours(23,59,59,999);
      f = data.filter(x =>
        (x.status==="Čeka plaćanje" || x.status==="U obradi") &&
        new Date(x.date) <= today
      );
    }

    if (q) {
      const ql = q.toLowerCase();
      f = f.filter(x =>
        x.description?.toLowerCase().includes(ql) ||
        x.category?.toLowerCase().includes(ql) ||
        x.location?.toLowerCase().includes(ql) ||
        x.notes?.toLowerCase().includes(ql)
      );
    }

    if (filter === "pending" || filter === "processing" || filter === "overdue") {
        return f.sort((a,b)=>new Date(a.date)-new Date(b.date));
    }
    return f.sort((a,b)=>new Date(b.date)-new Date(a.date));
  },[data,filter,q,year]);

  // Reset to page 1 when filter or search changes.
  useEffect(() => { setPage(1); }, [filter, q]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="fi" style={{ width:"100%" }}>
      <StickyHeader C={C} icon="list" title={`${t("Transakcije")} · ${year}.`}/>
      <div style={{ padding:"12px 16px 0" }}>
        <div style={{ position:"relative", marginBottom:10 }}>
          <input type="text" placeholder={t("Pretraži…")} value={q} onChange={e=>setQ(e.target.value)}
            style={{ width:"100%", padding:"11px 14px 11px 40px", background:C.cardAlt, border:`1.5px solid ${C.border}`, borderRadius:12, color:C.text, fontSize:13 }}/>
          <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }}><Ic n="search" s={16} c={C.textMuted}/></span>
        </div>

        <div style={{ display:"flex", gap:6, marginBottom:4, overflowX:"auto", paddingBottom:4 }}>
          {[
            ["all",t("Sve")],
            ["expense",t("Plaćeno")],
            ["overdue",t("Dospjelo")],
            ["pending",t("Čeka plaćanje")],
            ["processing",t("U obradi")],
            ["income",t("Primici")]
          ].map(([id,lb])=>(
            <Pill key={id} label={lb} active={filter===id}
              color={id==="overdue" ? "#F87171" : id==="processing" ? "#FB923C" : id==="expense" ? C.income : id==="income" ? C.income : C.accent}
              inactiveColor={id==="overdue" ? "#FB923C" : undefined}
              onClick={()=>setFilter(id)}/>
          ))}
        </div>
        {filter==="overdue" && (
          <div style={{ fontSize:11, color:C.textMuted, marginBottom:8, padding:"4px 2px", display:"flex", alignItems:"center", gap:5 }}>
            <Ic n="alert" s={11} c={C.warning}/>
            {t("Prikazuje neplaćene stavke s rokom do danas (tekući + prošli mjeseci)")}
          </div>
        )}
        {rows.length===0
          ? <div style={{ textAlign:"center", padding:50, color:C.textMuted }}>
              <Ic n="list" s={44} c={C.border} style={{ marginBottom:12, opacity:.3 }}/>
              <p style={{ fontSize:14, fontWeight:600, color:C.text }}>{t("Nema transakcija")}</p>
              <p style={{ fontSize:12, marginTop:4 }}>{q ? t("Pokušajte s drugim pojmom za pretragu.") : filter !== "all" ? t("Nema stavki za odabrani filter.") : t("Pritisnite + za dodavanje.")}</p>
            </div>
          : pageRows.map((tx,i)=>{
            // Left border color: filter-based (except overdue keeps type-based), fallback to type
            const leftColor = filter === "overdue"
              ? (tx.installmentGroup ? C.warning : tx.type==="Primitak" ? C.income : C.expense)
              : filter === "all"
                ? (tx.installmentGroup ? C.warning : tx.type==="Primitak" ? C.income : C.expense)
                : (filterColor[filter] || (tx.type==="Primitak" ? C.income : C.expense));
            return (
            <div key={tx.id} className="su" style={{ background:C.card, border:`1px solid ${C.border}`, borderLeft:`3px solid ${leftColor}`, borderRadius:14, padding:13, marginBottom:8, animationDelay:`${i*.02}s` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"stretch" }}>
                <div style={{ flex:1, minWidth:0, textAlign:"left" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                    <span style={{ fontWeight:600, fontSize:14, color:C.text }}>{tx.description}</span>
                    {tx.installmentGroup && <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:10, background:`${C.warning}20`, color:C.warning }}>{tx.installmentNum}/{tx.installmentTotal}</span>}
                    {dupIds.has(tx.id) && (
                      <span title={t("Moguć duplikat")} style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:10, background:`${C.expense}20`, color:C.expense, display:"flex", alignItems:"center", gap:3 }}>
                        <Ic n="alert" s={9} c={C.expense}/>{t("Duplikat?")}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:11, color:C.textMuted, marginTop:3 }}>{fDate(tx.date)} · {t(tx.category)} · {t(tx.location)}</div>
                  <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{t(tx.payment)} · <span style={{ color:tx.status==="Plaćeno"?C.income:tx.status==="U obradi"?"#FB923C":C.warning }}>{t(tx.status)}</span></div>
                </div>
                
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", flexShrink:0, marginLeft:10 }}>
                  <div style={{ fontSize:15, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:tx.type==="Primitak"?C.income:C.expense }}>{tx.type==="Primitak"?"+":"-"}{fmt(+tx.amount)}</div>
                  <div style={{ display:"flex", gap:5, marginTop:"auto", justifyContent:"flex-end" }}>
                    {(tx.status==="Čeka plaćanje" || tx.status==="U obradi") && <button title={t("Plati")} onClick={()=>onPay(tx.id)} style={{ background:`${C.income}18`, border:`1px solid ${C.income}40`, borderRadius:8, padding:"5px 8px", cursor:"pointer" }}><Ic n="check" s={13} c={C.income}/></button>}
                    <button title={t("Uredi")} onClick={()=>onEdit(tx.id)} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"5px 8px", cursor:"pointer" }}><Ic n="edit" s={13} c={C.accent}/></button>
                    {tx.installmentGroup && grpCfm!==tx.id
                      ? <button title={t("Obriši")} onClick={()=>setGrpCfm(tx.id)} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"5px 8px", cursor:"pointer" }}><Ic n="trash" s={13} c={C.expense}/></button>
                      : !tx.installmentGroup && (
                          delCfm===tx.id
                          ? <button onClick={()=>{ onDelete(tx.id); setDelCfm(null); }} style={{ background:C.expense, border:"none", borderRadius:8, padding:"5px 10px", cursor:"pointer", color:"#fff", fontSize:11, fontWeight:700 }}>{t("Obriši!")}</button>
                          : <button title={t("Obriši")} onClick={()=>setDelCfm(tx.id)} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"5px 8px", cursor:"pointer" }}><Ic n="trash" s={13} c={C.expense}/></button>
                        )
                    }
                  </div>
                </div>
              </div>

              {tx.installmentGroup && grpCfm===tx.id && (
                <div style={{ marginTop:10, padding:"10px 12px", background:`${C.expense}10`, borderRadius:10, border:`1px solid ${C.expense}30`, textAlign:"left" }}>
                  <p style={{ fontSize:11, color:C.textMuted, marginBottom:8 }}>{t("Što obrisati?")}</p>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={()=>{ onDelete(tx.id); setGrpCfm(null); }} style={{ flex:1, padding:"8px 4px", background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:11, cursor:"pointer" }}>{t("Ovaj obrok")}</button>
                    <button onClick={()=>{ onDeleteGroup(tx.installmentGroup); setGrpCfm(null); }} style={{ flex:1, padding:"8px 4px", background:C.expense, border:"none", borderRadius:8, color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>{t("Sve obroke")} ({tx.installmentTotal})</button>
                    <button onClick={()=>setGrpCfm(null)} title={t("Zatvori")} style={{ padding:"8px 10px", background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, color:C.textMuted, cursor:"pointer" }}><Ic n="x" s={12} c={C.textMuted}/></button>
                  </div>
                </div>
              )}
              {tx.notes && <div style={{ fontSize:11, color:C.textMuted, marginTop:7, fontStyle:"italic", borderTop:`1px solid ${C.border}`, paddingTop:7, textAlign:"left" }}>💬 {tx.notes}</div>}
            </div>
            );
          })
        }
        <div style={{ textAlign:"center", padding:"10px 0", color:C.textMuted, fontSize:12 }}>
          {rows.length} transakcija · {year}.
        </div>
        {totalPages > 1 && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"8px 0 16px" }}>
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={safePage===1}
              style={{ padding:"7px 14px", background:safePage===1?C.cardAlt:C.card, border:`1px solid ${C.border}`, borderRadius:10, color:safePage===1?C.textMuted:C.accent, fontWeight:600, fontSize:12, cursor:safePage===1?"not-allowed":"pointer" }}>
              ← {t("Prethodna")}
            </button>
            <span style={{ fontSize:12, color:C.textMuted, minWidth:80, textAlign:"center" }}>
              {(safePage-1)*PAGE_SIZE+1}–{Math.min(safePage*PAGE_SIZE, rows.length)} / {rows.length}
            </span>
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={safePage===totalPages}
              style={{ padding:"7px 14px", background:safePage===totalPages?C.cardAlt:C.card, border:`1px solid ${C.border}`, borderRadius:10, color:safePage===totalPages?C.textMuted:C.accent, fontWeight:600, fontSize:12, cursor:safePage===totalPages?"not-allowed":"pointer" }}>
              {t("Sljedeća")} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


export default TxList;
