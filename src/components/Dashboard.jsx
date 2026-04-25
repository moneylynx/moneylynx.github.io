import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { MONTHS, MONTHS_EN, MSHORT, MSHORT_EN, DEF_LISTS, T, CHART_COLORS, BACKUP_SNOOZE_MS } from '../lib/constants.js';
import { fmtEur, monthOf, curYear, curMonthIdx, needsBackupReminder } from '../lib/helpers.js';
import { Ic } from './ui.jsx';

function Dashboard({ C, data, setTxs, year, user, lists, setPage, setTxFilter, onQuickAdd, t, lang, prefs, updPrefs, setSubPg, syncing, supaUser, fmt: fmtProp, fmtD }) {
  const fmt = fmtProp || fmtEur;
  const cmIdx = curMonthIdx();
  const cm  = MONTHS[cmIdx]; 
  const cmName = lang==="en" ? MONTHS_EN[cmIdx] : cm;

  const yd  = data.filter(x=>new Date(x.date).getFullYear()===year);
  const md  = yd.filter(x=>monthOf(x.date)===cm);
  
  const inc = yd.filter(x=>x.type==="Primitak").reduce((s,x)=>s+(+x.amount||0),0);
  const exp = yd.filter(x=>x.type==="Isplata").reduce((s,x)=>s+(+x.amount||0),0);
  const bal = inc - exp;
  
  const mI  = md.filter(x=>x.type==="Primitak").reduce((s,x)=>s+(+x.amount||0),0);
  const mE  = md.filter(x=>x.type==="Isplata" && x.status==="Plaćeno").reduce((s,x)=>s+(+x.amount||0),0);
  
  const pendingMonth = useMemo(() => {
    const pendingTxs = md.filter(x => x.status === "Čeka plaćanje" || x.status === "U obradi").reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
    const rec = lists.recurring || [];
    const recTxsIds = new Set(md.filter(x => x.recurringId).map(x => x.recurringId));
    const unpaidRecSum = rec.filter(r => !recTxsIds.has(r.id)).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    return pendingTxs + unpaidRecSum;
  }, [md, lists.recurring]);

  // ─── To-Do widget data ─────────────────────────────────────────────────────
  // Unified "things to pay this month" list: pending/processing transactions
  // PLUS recurring obligations that haven't been materialized yet this month.
  // Sorted by due date so the most urgent shows first.
  const todoItems = useMemo(() => {
    const items = [];
    const today = new Date(); today.setHours(23,59,59,999);

    // 1) Pending/processing transactions for current month AND overdue from past months
    data.filter(x =>
      x.type === "Isplata" &&
      (x.status === "Čeka plaćanje" || x.status === "U obradi") &&
      new Date(x.date) <= today
    ).forEach(x => items.push({
      kind: "tx",
      id: x.id,
      date: x.date,
      description: x.description,
      category: x.category,
      location: x.location,
      amount: parseFloat(x.amount) || 0,
      status: x.status,
    }));

    // 2) Recurring obligations that have NOT produced a transaction yet this month.
    const rec = lists.recurring || [];
    const recTxsIds = new Set(md.filter(x => x.recurringId).map(x => x.recurringId));
    const cy = new Date().getFullYear();
    const cmi = new Date().getMonth();
    rec.forEach(r => {
      if (recTxsIds.has(r.id)) return;
      const day = Math.max(1, Math.min(28, parseInt(r.dueDay) || 1));
      const dueDate = new Date(cy, cmi, day).toISOString().split("T")[0];
      items.push({
        kind: "recurring",
        id: r.id,
        date: dueDate,
        description: r.description,
        category: r.category,
        location: r.location,
        amount: parseFloat(r.amount) || 0,
        recurring: r,
      });
    });

    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [data, md, lists.recurring]);

  // Handle Pay action from the To-Do widget. Works for both kinds:
  // - tx: flip status to Plaćeno, stamp today's date
  // - recurring: create a new transaction with status Plaćeno this month
  const payTodoItem = (item) => {
    if (!setTxs) return;
    const today = new Date().toISOString().split("T")[0];
    if (item.kind === "tx") {
      setTxs(p => p.map(x => x.id === item.id ? { ...x, status: "Plaćeno", date: today } : x));
      return;
    }
    // Recurring: instantiate a concrete tx for this month.
    const r = item.recurring;
    setTxs(p => [...p, {
      id: Date.now().toString(),
      type: "Isplata",
      date: today,
      description: r.description,
      amount: r.amount,
      category: r.category,
      location: r.location,
      payment: r.payment,
      status: "Plaćeno",
      notes: r.notes || "",
      recurringId: r.id,
      installments: 0,
    }]);
  };

  const catsMonth = useMemo(() => {
    const m={};
    md.filter(x=>x.type==="Isplata").forEach(x=>{ m[x.category]=(m[x.category]||0)+(+x.amount||0); });
    return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  },[md]);

  const mBar = useMemo(()=>MONTHS.map((m,i)=>{
    const mt = yd.filter(x=>monthOf(x.date)===m);
    const mLabel = (lang==="en" ? MSHORT_EN : MSHORT)[i];
    return { name:mLabel, P:mt.filter(x=>x.type==="Primitak").reduce((s,x)=>s+(+x.amount||0),0), T:mt.filter(x=>x.type==="Isplata").reduce((s,x)=>s+(+x.amount||0),0) };
  }),[yd, lang]);

  const now = new Date();
  const wd  = now.toLocaleDateString(lang==="en"?"en-US":"hr-HR",{weekday:"short"}).replace(".","").toUpperCase();
  const dd  = String(now.getDate()).padStart(2,"0");
  const mm  = String(now.getMonth()+1).padStart(2,"0");
  const yy  = now.getFullYear();
  const W   = Math.min(window.innerWidth??480,480)-64;
  const tt  = { contentStyle:{background:C.cardAlt,border:`1px solid ${C.border}`,borderRadius:10,color:C.text,fontSize:11}, formatter:v=>fmt(v) };
  const dn  = [user.firstName, user.lastName].filter(Boolean).join(" ");

  const cards = [
    { icon:<Ic n="up"    s={13} c={C.income}/>,  label:`${cmName} ${t("primici")}`,  val:fmt(mI), color:C.income  },
    { icon:<Ic n="down"  s={13} c={C.expense}/>, label:`${cmName} ${t("plaćeno")}`,  val:fmt(mE), color:C.expense },
  ];

  return (
    <div className="fi" style={{ width:"100%" }}>
      <div className="hdr" style={{ position:"sticky", top:0, zIndex:50, background:C.bg, paddingBottom:10, paddingLeft:16, paddingRight:16, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, display:"flex", alignItems:"center", gap:8, color:C.accent }}>
              <Ic n="wallet" s={22} c={C.accent}/> {t("Moja lova")} <span style={{fontSize:14, color:C.textMuted, fontWeight:500, verticalAlign:"middle", position:"relative", top:2}}>· {year}.</span>
            </h1>
            {dn && <span style={{ fontSize:12, color:C.textMuted, display:"flex", alignItems:"center", gap:4, marginTop:3 }}><span style={{ width:6, height:6, borderRadius:"50%", background:C.income, display:"inline-block" }}/>{t("Bok,")} {user.firstName || dn}!</span>}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {syncing && (
              <span title={t("Sinkronizacija…")} style={{ width:8, height:8, borderRadius:"50%", background:C.warning, display:"inline-block", animation:"pulse 1s infinite" }}/>
            )}
            {!syncing && supaUser && (
              <span title={supaUser.email} style={{ width:8, height:8, borderRadius:"50%", background:C.income, display:"inline-block" }}/>
            )}
            <button onClick={onQuickAdd} style={{ background:`${C.warning}18`, border:`1px solid ${C.warning}50`, borderRadius:12, padding:"6px 10px", fontSize:12, fontWeight:700, color:C.warning, display:"flex", alignItems:"center", gap:5, cursor:"pointer", boxShadow:`0 2px 10px ${C.warning}20` }}>
              <Ic n="zap" s={14} c={C.warning}/> {t("Brzi unos")}
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding:"12px 16px 0" }}>
        {/* Backup reminder — shown when it's been 30+ days since last backup.
            User can click to jump straight to the Backup screen, or dismiss
            with the X for 7 days. */}
        {needsBackupReminder(prefs) && (
          <div className="su" style={{
            background: `linear-gradient(135deg, ${C.warning}28, ${C.warning}14)`,
            border: `1px solid ${C.warning}60`,
            borderRadius: 14, padding: "12px 14px", marginBottom: 10,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div
              onClick={() => { setPage("settings"); setSubPg && setSubPg("general"); }}
              style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${C.warning}30`, display: "flex",
                alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Ic n="dl" s={18} c={C.warning}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>
                  {t("Davno nisi napravio backup")}
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.35 }}>
                  {t("Klikni ovdje da sačuvaš kopiju podataka.")}
                </div>
              </div>
              <Ic n="chevron" s={14} c={C.warning} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}/>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                updPrefs({ backupSnoozedUntil: Date.now() + BACKUP_SNOOZE_MS });
              }}
              title={t("Podsjeti me za 7 dana")}
              style={{
                background: "transparent", border: "none", padding: 4,
                cursor: "pointer", color: C.textMuted, flexShrink: 0,
              }}
            >
              <Ic n="x" s={14} c={C.textMuted}/>
            </button>
          </div>
        )}

        <div className="su" style={{ background:`linear-gradient(135deg,${C.accent}22,${bal>=0?C.income:C.expense}18)`, border:`1px solid ${bal>=0?C.income:C.expense}40`, borderRadius:18, padding:"16px 18px 16px 16px", marginBottom:10, position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:12, right:18, textAlign:"right" }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.textSub, letterSpacing:.3, marginRight:6 }}>{wd}</div>
            <div style={{ fontSize:13, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:C.textSub, marginRight:-6 }}>{dd}.{mm}.</div>
            <div style={{ fontSize:10, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:C.textMuted, marginTop:1, marginRight:-6 }}>{yy}.</div>
          </div>
          <div style={{ fontSize:11, color:C.textSub, marginBottom:4, textAlign:"left" }}>{t("Bilanca")} {year}.</div>
          <div style={{ fontSize:28, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:bal>=0?C.income:C.expense, textAlign:"left", paddingRight:65 }}>{fmt(bal)}</div>
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

        {yd.length === 0 ? (
          <div className="su" style={{ background:C.cardAlt, border:`1px dashed ${C.border}`, borderRadius:16, padding:"24px 20px", textAlign:"center", marginTop:16 }}>
            <div style={{ width:56, height:56, borderRadius:20, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", boxShadow:`0 4px 15px ${C.accentGlow}` }}>
              <Ic n="plus" s={28} c="#fff"/>
            </div>
            <h3 style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:8 }}>{t("Vrijeme je za prvi unos!")}</h3>
            <p style={{ fontSize:13, color:C.textMuted, lineHeight:1.5 }}>{t("Pritisnite plavi plus gumb na dnu ekrana i zabilježite svoj prvi trošak ili primitak. Statistike će se pojaviti automatski.")}</p>
          </div>
        ) : (
          <>
            {/* Top kategorije — kompaktno, dovoljno konteksta bez previše prostora */}
            {catsMonth.length>0 && (
              <div className="su" style={{ background:C.card, border:`1px solid ${C.accent}40`, borderLeft:`4px solid ${C.accent}`, borderRadius:14, padding:"10px 12px", marginBottom:10 }}>
                <div style={{ fontSize:11, fontWeight:600, color:C.textMuted, marginBottom:10, display:"flex", alignItems:"center", gap:5 }}>
                  <Ic n="tag" s={12} c={C.textMuted}/>{t("Top kategorije")} · {cmName} {year}.
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ flexShrink:0 }}>
                    <PieChart width={Math.round(W*.38)} height={100}>
                      <Pie data={catsMonth.slice(0,4)} cx="50%" cy="50%" innerRadius={20} outerRadius={45} dataKey="value" stroke="none">
                        {catsMonth.slice(0,4).map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                      </Pie>
                    </PieChart>
                  </div>
                  <div style={{ flex:1, maxHeight:100, overflowY:"auto", paddingRight:4 }}>
                    {catsMonth.map((c,i)=>(
                      <div key={c.name} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom: i<catsMonth.length-1?`1px solid ${C.border}40`:"none", fontSize:11 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ width:7, height:7, borderRadius:2, background:CHART_COLORS[i%CHART_COLORS.length], flexShrink:0 }}/>
                          <span style={{ color:C.textSub, maxWidth:80, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t(c.name)}</span>
                        </div>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:600, fontSize:11 }}>{fmt(c.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Za platiti ovog mjeseca — uvijek prikazano */}
            {todoItems.length === 0 ? (
              <div className="su" style={{ background:C.card, border:`1px solid ${C.income}40`, borderLeft:`4px solid ${C.income}`, borderRadius:14, padding:"12px 14px", marginBottom:10, display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:10, background:`${C.income}20`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Ic n="check" s={16} c={C.income}/>
                </div>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:C.income }}>{t("Ovaj mjesec nemate više obveza za platiti!")}</div>
                  <div style={{ fontSize:10, color:C.textMuted, marginTop:2 }}>{cmName} {year}.</div>
                </div>
              </div>
            ) : (
              <div className="su" style={{ background:C.card, border:`1px solid ${C.warning}40`, borderLeft:`4px solid ${C.warning}`, borderRadius:14, marginBottom:10, display:"flex", flexDirection:"column", maxHeight:"calc(100vh - 498px)", minHeight:280, overflow:"hidden" }}>
                {/* Fiksni header */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px 8px", flexShrink:0 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:C.warning, display:"flex", alignItems:"center", gap:5 }}>
                    <Ic n="coins" s={12} c={C.warning}/>{t("Za platiti ovog mjeseca")}
                    {todoItems.length > 0 && <span style={{ background:`${C.warning}25`, borderRadius:10, padding:"1px 7px", fontSize:10, fontWeight:700, color:C.warning }}>{todoItems.length}</span>}
                  </div>
                  <div style={{ fontSize:12, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:C.warning }}>
                    {fmt(todoItems.reduce((s,i)=>s+i.amount,0))}
                  </div>
                </div>
                {/* Skrolabili srednji dio — sve stavke */}
                <div style={{ overflowY:"auto", flex:1, padding:"0 12px", display:"flex", flexDirection:"column", gap:6 }}>
                  {todoItems.map(item => (
                    <div key={item.kind+"-"+item.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 9px", background:C.cardAlt, borderRadius:9, border:`1px solid ${C.border}`, flexShrink:0 }}>
                      <div style={{
                        width:28, height:28, borderRadius:8,
                        background: item.kind==="recurring" ? `${C.accent}20` : `${C.warning}20`,
                        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                      }}>
                        <Ic n={item.kind==="recurring"?"repeat":"coins"} s={12} c={item.kind==="recurring"?C.accent:C.warning}/>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {item.description || t(item.category)}
                        </div>
                        <div style={{ fontSize:10, color:C.textMuted, display:"flex", alignItems:"center", gap:4, marginTop:1, flexWrap:"wrap" }}>
                          <Ic n="cal" s={9} c={C.textMuted}/>
                          {new Date(item.date).getDate()}.{new Date(item.date).getMonth()+1}.
                          {item.category && item.category !== "Ostalo" && <span>· {t(item.category)}</span>}
                          {item.location && item.location !== "Ostalo" && <span>· {t(item.location)}</span>}
                          {item.kind==="recurring" && <span style={{ color:C.accent, fontWeight:600 }}>· {t("Redovno")}</span>}
                        </div>
                      </div>
                      <div style={{ fontSize:12, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:C.text, flexShrink:0 }}>
                        {fmt(item.amount)}
                      </div>
                      <button
                        onClick={()=>payTodoItem(item)}
                        style={{
                          padding:"5px 10px", background:C.income, border:"none", borderRadius:7,
                          color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer",
                          display:"flex", alignItems:"center", gap:4, flexShrink:0,
                        }}
                      >
                        <Ic n="check" s={10} c="#fff"/>{t("Plati")}
                      </button>
                    </div>
                  ))}
                </div>
                {/* Fiksni footer */}
                <div style={{ padding:"10px 12px", flexShrink:0, borderTop:`1px solid ${C.border}` }}>
                  <button
                    onClick={()=>{ if(setTxFilter) setTxFilter("overdue"); setPage("transactions"); }}
                    style={{ width:"100%", padding:"6px", background:"transparent", border:"none", color:C.accent, fontSize:11, fontWeight:600, cursor:"pointer" }}
                  >
                    {t("Prikaži sve")} ({todoItems.length})
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


export default Dashboard;
