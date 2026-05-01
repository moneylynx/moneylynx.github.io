import { useState, useEffect, useMemo, useRef } from 'react';
import { K, DEF_LISTS, T, MONTHS, MONTHS_EN, MSHORT, MSHORT_EN, MAX_ATT, BACKUP_SNOOZE_MS, CURRENCIES, TIMEZONES } from '../../lib/constants.js';
import { fmtEur, fDate, load, save, curYear, buildCSV, buildSummary, nativeSaveAndShare, isCapacitor } from '../../lib/helpers.js';
import { hashPinV2, hashPinLegacy } from '../../lib/crypto.js';
import { Ic, LynxLogo, LynxLogoWhite, StickyHeader } from '../ui.jsx';
import { SetupPin } from '../auth.jsx';

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

export { RecurringScreen };
export default RecurringScreen;
