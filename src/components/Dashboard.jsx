import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { MONTHS, MONTHS_EN, MSHORT, MSHORT_EN, DEF_LISTS, T, CHART_COLORS, BACKUP_SNOOZE_MS } from '../lib/constants.js';
import { fmtEur, monthOf, curYear, curMonthIdx, needsBackupReminder, expandSplits } from '../lib/helpers.js';
import { Ic, LynxLogo } from './ui.jsx';
import { categoryIcon } from '../lib/categoryIcons.js';
import { useAdvisor } from '../hooks/useAdvisor.js';

const WALLET_GAUGE_ICON = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+PHJlY3QgeD0iMiIgeT0iNyIgd2lkdGg9IjIwIiBoZWlnaHQ9IjEzIiByeD0iMiIgZmlsbD0iIzFlM2E1ZiIgc3Ryb2tlPSIjMjJkM2VlIiBzdHJva2Utd2lkdGg9IjEuMiIvPjxwYXRoIGQ9Ik02IDdWNWEyIDIgMCAwIDEgMi0yaDhhMiAyIDAgMCAxIDIgMnYyIiBzdHJva2U9IiMyMmQzZWUiIHN0cm9rZS13aWR0aD0iMS4yIi8+PHJlY3QgeD0iMTYiIHk9IjExIiB3aWR0aD0iNCIgaGVpZ2h0PSIzIiByeD0iMSIgZmlsbD0iIzIyZDNlZSIvPjxjaXJjbGUgY3g9IjkiIGN5PSIxNSIgcj0iMi41IiBmaWxsPSJub25lIiBzdHJva2U9IiM0YWRlODAiIHN0cm9rZS13aWR0aD0iMS4yIi8+PHBhdGggZD0iTTcgMTYuMkEyLjUgMi41IDAgMCAxIDkgMTIuNSIgc3Ryb2tlPSIjNGFkZTgwIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PGxpbmUgeDE9IjkiIHkxPSIxNSIgeDI9IjEwLjUiIHkyPSIxMy41IiBzdHJva2U9IiM0YWRlODAiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9zdmc+";

function Dashboard({ C, data, setTxs, year, user, lists, setPage, setTxFilter, onQuickAdd, t, lang, prefs, updPrefs, setSubPg, syncing, supaUser, fmt: fmtProp, fmtD, onGoToTransactions }) {
  const fmt = fmtProp || fmtEur;
  const cmIdx = curMonthIdx();
  const cm     = MONTHS[cmIdx];
  const cmName = lang === "en" ? MONTHS_EN[cmIdx] : cm;
  const MONTHS_GEN_HR = ["siječnja","veljače","ožujka","travnja","svibnja","lipnja","srpnja","kolovoza","rujna","listopada","studenoga","prosinca"];
  const projectionMonthLabel = lang === "en" ? `Projection at the end of ${cmName}` : `Projekcija na kraju ${MONTHS_GEN_HR[cmIdx]}`;

  const yd = data.filter(x => new Date(x.date).getFullYear() === year);
  const md = yd.filter(x => monthOf(x.date) === cm);

  const inc = yd.filter(x => x.type === "Primitak").reduce((s,x) => s + (+x.amount||0), 0);
  const exp = yd.filter(x => x.type === "Isplata").reduce((s,x) => s + (+x.amount||0), 0);
  const bal = inc - exp;

  const mI = md.filter(x => x.type === "Primitak").reduce((s,x) => s + (+x.amount||0), 0);
  const mE = md.filter(x => x.type === "Isplata" && x.status === "Plaćeno").reduce((s,x) => s + (+x.amount||0), 0);

  // ── Daily Limit calculations ────────────────────────────────────────────────
  // x = svi primici tekućeg mjeseca (plaćeni + očekivani iz recurring)
  // y = svi izdaci tekućeg mjeseca (plaćeni + pending + recurring koji nisu plaćeni)
  // A = (x - y) / dani_do_kraja_mjeseca - B
  const [dlSavingsEdit, setDlSavingsEdit] = useState(false);
  const [dlDetailOpen, setDlDetailOpen] = useState(false); // savings detail cards open by default
  const [dlSavingsInput, setDlSavingsInput] = useState("");
  const [dlSavingsPeriod, setDlSavingsPeriod] = useState(() => prefs?.plannedSavingsPeriod || "monthly");

  const plannedSavingsRaw = parseFloat(prefs?.plannedSavings) || 0;
  const savedPeriod = prefs?.plannedSavingsPeriod || "monthly";
  // Normalize to monthly for formula
  const plannedSavings = savedPeriod === "yearly" ? plannedSavingsRaw / 12 : plannedSavingsRaw;

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - today.getDate();

  // Next payday: find largest recurring income, compute days until next dueDay
  const nextPayday = (() => {
    const recInc = lists.recurring_income || [];
    if (recInc.length === 0) return null;
    // Find largest by amount
    const biggest = recInc.reduce((best, r) => (parseFloat(r.amount)||0) > (parseFloat(best.amount)||0) ? r : best, recInc[0]);
    const dDay = Math.max(1, Math.min(28, parseInt(biggest.dueDay)||1));
    const tDay = today.getDate();
    // Days until next occurrence
    let daysUntil;
    if (dDay >= tDay) {
      daysUntil = dDay - tDay;
    } else {
      // Next month
      const nextOcc = new Date(today.getFullYear(), today.getMonth()+1, dDay);
      daysUntil = Math.ceil((nextOcc - today) / 86400000);
    }
    return { name: biggest.description, days: daysUntil, dDay };
  })();

  const daysLeftYear = (() => { const e=new Date(today.getFullYear(),11,31); return Math.ceil((e-today)/86400000); })();

  // x = monthly income (paid + upcoming recurring this month)
  const recIncUnpaid = (lists.recurring_income||[]).filter(r=>!md.find(x=>x.recurringIncomeId===r.id)).reduce((s,r)=>s+(parseFloat(r.amount)||0),0);
  const xIncome = mI + recIncUnpaid;

  // xYear = yearly income (all year + remaining recurring months)
  const ydYear = data.filter(x=>new Date(x.date).getFullYear()===today.getFullYear());
  const monthsLeft = 12-(today.getMonth()+1);
  const xIncomeYear = ydYear.filter(x=>x.type==="Primitak").reduce((s,x)=>s+(+x.amount||0),0)
    + (lists.recurring_income||[]).reduce((s,r)=>s+(parseFloat(r.amount)||0)*monthsLeft,0);

  // y = monthly expenses (paid + pending + unpaid recurring)
  const mEPending = md.filter(x=>x.type==="Isplata"&&x.status!=="Plaćeno").reduce((s,x)=>s+(+x.amount||0),0);
  const recUnpaid = (lists.recurring||[]).filter(r=>!md.find(x=>x.recurringId===r.id)).reduce((s,r)=>s+(parseFloat(r.amount)||0),0);
  const yExpenses = mE + mEPending + recUnpaid;

  // yYear = yearly expenses + remaining recurring
  const yExpensesYear = ydYear.filter(x=>x.type==="Isplata").reduce((s,x)=>s+(+x.amount||0),0)
    + (lists.recurring||[]).reduce((s,r)=>s+(parseFloat(r.amount)||0)*monthsLeft,0);

  // Savings validation: reject if exceeds available funds
  const maxSavings = savedPeriod==="yearly" ? Math.max(0,xIncomeYear-yExpensesYear) : Math.max(0,xIncome-yExpenses);
  const savingsExceedsIncome = plannedSavingsRaw > 0 && plannedSavingsRaw > maxSavings && maxSavings > 0;

  // Effective daily savings contribution
  const effectiveSavings = savedPeriod==="yearly"
    ? (daysLeftYear>0 ? plannedSavingsRaw*(daysLeft/daysLeftYear) : 0)
    : plannedSavings;
  const dailyLimitRaw = daysLeft>0 ? (xIncome-yExpenses-effectiveSavings)/daysLeft : 0;
  const dailyLimit = Math.round(dailyLimitRaw * 100) / 100;
  const dlGood = dailyLimit >= 0;

  // ── Savings metrics for detail cards ─────────────────────────────────────
  const plannedMonthly = savedPeriod === "yearly" ? plannedSavingsRaw / 12 : plannedSavings;
  const plannedYearly  = savedPeriod === "yearly" ? plannedSavingsRaw : plannedSavings * 12;
  // "Ušteđeno do sada" = net surplus this month (paid income - paid expenses)
  const savedSoFar     = Math.max(0, mI - mE);
  const savingsProgress = plannedMonthly > 0 ? Math.min(1, savedSoFar / plannedMonthly) : 0;
  const savingsProgressColor = savingsProgress >= 1 ? C.income : savingsProgress >= 0.5 ? C.warning : C.expense;
  const dlColor = dailyLimit >= 20 ? C.income : dailyLimit >= 0 ? C.warning : C.expense;

  const { forecast, anomalies, insights } = useAdvisor(data, lists, fmt, t);
  const [forecastOpen, setForecastOpen] = useState(false);

  // ── To-Do items ────────────────────────────────────────────────────────────
  const todoItems = useMemo(() => {
    const items = [];
    const today = new Date(); today.setHours(23,59,59,999);
    data.filter(x =>
      x.type === "Isplata" &&
      (x.status === "Čeka plaćanje" || x.status === "U obradi") &&
      new Date(x.date) <= today
    ).forEach(x => items.push({ kind:"tx", id:x.id, date:x.date, description:x.description, category:x.category, location:x.location, amount:parseFloat(x.amount)||0, status:x.status }));

    const rec = lists.recurring || [];
    const recTxsIds = new Set(md.filter(x => x.recurringId).map(x => x.recurringId));
    const cy = new Date().getFullYear(), cmi = new Date().getMonth();
    rec.forEach(r => {
      if (recTxsIds.has(r.id)) return;
      const day = Math.max(1, Math.min(28, parseInt(r.dueDay)||1));
      items.push({ kind:"recurring", id:r.id, date:new Date(cy,cmi,day).toISOString().split("T")[0], description:r.description, category:r.category, location:r.location, amount:parseFloat(r.amount)||0, recurring:r });
    });
    // ── Upcoming recurring income ────────────────────────────────────────
    const recInc = lists.recurring_income || [];
    const recIncPaidIds = new Set(md.filter(x => x.recurringIncomeId).map(x => x.recurringIncomeId));
    const todayDate = new Date();
    recInc.forEach(r => {
      if (recIncPaidIds.has(r.id)) return;
      const day = Math.max(1, Math.min(28, parseInt(r.dueDay)||1));
      // If dueDay already passed this month → show next month's occurrence
      let incDate;
      if (day < todayDate.getDate()) {
        incDate = new Date(cy, cmi + 1, day);
      } else {
        incDate = new Date(cy, cmi, day);
      }
      items.push({ kind:"recurring_income", id:r.id, date:incDate.toISOString().split("T")[0], description:r.description, category:r.category, amount:parseFloat(r.amount)||0, recurring:r });
    });

    return items.sort((a,b) => a.date.localeCompare(b.date));
  }, [data, md, lists.recurring, lists.recurring_income]);

  const payTodoItem = (item) => {
    if (!setTxs) return;
    try { navigator.vibrate?.(40); } catch {}
    const today = new Date().toISOString().split("T")[0];
    if (item.kind === "tx") { setTxs(p => p.map(x => x.id === item.id ? {...x, status:"Plaćeno", date:today} : x)); return; }
    const r = item.recurring;
    if (item.kind === "recurring_income") {
      setTxs(p => [...p, { id:Date.now().toString(), type:"Primitak", date:today, description:r.description, amount:r.amount, category:r.category||"Plaća", location:"Ostalo", payment:r.payment||"Bankovni prijenos", status:"Plaćeno", notes:r.notes||"", recurringIncomeId:r.id, installments:0 }]);
      return;
    }
    setTxs(p => [...p, { id:Date.now().toString(), type:"Isplata", date:today, description:r.description, amount:r.amount, category:r.category, location:r.location, payment:r.payment, status:"Plaćeno", notes:r.notes||"", recurringId:r.id, installments:0 }]);
  };

  const catsMonth = useMemo(() => {
    const m = {};
    expandSplits(md.filter(x => x.type === "Isplata")).forEach(x => { m[x.category]=(m[x.category]||0)+(parseFloat(x.amount)||0); });
    return Object.entries(m).map(([name,value]) => ({name,value})).sort((a,b) => b.value-a.value);
  }, [md]);

  const now = new Date();
  const wd  = now.toLocaleDateString(lang==="en"?"en-US":"hr-HR",{weekday:"short"}).replace(".","").toUpperCase();
  const dd  = String(now.getDate()).padStart(2,"0");
  const mm  = String(now.getMonth()+1).padStart(2,"0");
  const yy  = now.getFullYear();
  const W   = Math.min(window.innerWidth??480,480)-64;
  const VH  = typeof window !== "undefined" ? Math.min(window.innerHeight || 720, 900) : 720;
  const todoMaxHeight = Math.max(116, Math.min(238, Math.round(VH * 0.24)));
  const dn  = [user.firstName, user.lastName].filter(Boolean).join(" ");

  const insightColor = (color) => ({ income:C.income, expense:C.expense, warning:C.warning, accent:C.accent }[color] || C.accent);
  const visibleInsights = insights.filter(ins => ins.type !== "forecast");

  // Forecast projection line — shown inside balance card
  const forecastBal = forecast.hasHistory && forecast.daysLeft > 0 ? forecast.projectedBalance : null;
  const forecastColor = forecastBal === null ? null : forecastBal >= 0 ? C.income : C.expense;

  // Positive month comparison vs last year (for mini-cards)
  const lastYrME = useMemo(() => {
    const ly = year - 1;
    return data.filter(x => new Date(x.date).getFullYear()===ly && monthOf(x.date)===cm && x.type==="Isplata" && x.status==="Plaćeno").reduce((s,x)=>s+(+x.amount||0),0);
  }, [data, year, cm]);
  const monthImprovement = lastYrME > 0 && mE > 0 ? (lastYrME - mE) / lastYrME : null;

  // Empty state onboarding steps
  const onboardingSteps = useMemo(() => {
    const hasTx   = data.length > 0;
    const hasRec  = (lists.recurring||[]).length > 0;
    const hasBudg = lists.budgets && Object.keys(lists.budgets).some(k => lists.budgets[k] > 0);
    return [
      { done:hasTx,  icon:"💳", title:t("Dodaj prvu transakciju"), body:t("Zabileži prihod ili trošak — aplikacija počinje učiti tvoje navike."), action:()=>setPage("add"), cta:t("Dodaj sada →") },
      { done:hasRec, icon:"🔄", title:t("Dodaj redovnu obvezu"), body:t("Najam, pretplate, kredit — jednom dodaj, aplikacija te svaki mjesec podsjeća."), action:()=>{setPage("settings");setSubPg&&setSubPg("recurring");}, cta:t("Postavi obveze →") },
      { done:hasBudg,icon:"🎯", title:t("Postavi budžet kategorije"), body:t("Odredi limit za npr. Hranu ili Zabavu — aplikacija upozori kad se priblizavaš."), action:()=>{setPage("settings");setSubPg&&setSubPg("budgets");}, cta:t("Postavi budžet →") },
    ];
  }, [data, lists]);

  return (
    <div className="fi" style={{ width:"100%" }}>
      {/* ── Sticky header ──────────────────────────────────────────────── */}
      <div className="hdr" style={{ position:"sticky", top:0, zIndex:50, background:C.bg, paddingBottom:10, paddingLeft:16, paddingRight:16, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, display:"flex", alignItems:"center", gap:8, color:C.accent }}>
              <LynxLogo s={22} color={C.accent}/> {t("Moja Lova")} <span style={{fontSize:14,color:C.textMuted,fontWeight:500,verticalAlign:"middle",position:"relative",top:2}}>· {year}.</span>
            </h1>
            {dn && <span style={{ fontSize:12, color:C.textMuted, display:"flex", alignItems:"center", gap:4, marginTop:3 }}><span style={{ width:6, height:6, borderRadius:"50%", background:C.income, display:"inline-block" }}/>{t("Bok,")} {user.firstName || dn}!</span>}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {syncing && <span title={t("Sinkronizacija…")} style={{ width:8,height:8,borderRadius:"50%",background:C.warning,display:"inline-block",animation:"pulse 1s infinite" }}/>}
            {!syncing && supaUser && <span title={supaUser.email} style={{ width:8,height:8,borderRadius:"50%",background:C.income,display:"inline-block" }}/>}
            <button onClick={onQuickAdd} style={{ background:`${C.warning}18`,border:`1px solid ${C.warning}50`,borderRadius:12,padding:"6px 10px",fontSize:12,fontWeight:700,color:C.warning,display:"flex",alignItems:"center",gap:5,cursor:"pointer",boxShadow:`0 2px 10px ${C.warning}20` }}>
              <Ic n="zap" s={14} c={C.warning}/> {t("Brzi unos")}
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding:"12px 16px 0" }}>
        {/* Backup reminder */}
        {needsBackupReminder(prefs) && (
          <div className="su" style={{ background:`linear-gradient(135deg,${C.warning}28,${C.warning}14)`, border:`1px solid ${C.warning}60`, borderRadius:14, padding:"12px 14px", marginBottom:10, display:"flex", alignItems:"center", gap:10 }}>
            <div onClick={()=>{setPage("settings");setSubPg&&setSubPg("general");}} style={{ flex:1,display:"flex",alignItems:"center",gap:10,cursor:"pointer" }}>
              <div style={{ width:36,height:36,borderRadius:10,background:`${C.warning}30`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><Ic n="dl" s={18} c={C.warning}/></div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:13,fontWeight:700,color:C.text,marginBottom:2 }}>{t("Davno nisi napravio backup")}</div>
                <div style={{ fontSize:11,color:C.textMuted,lineHeight:1.35 }}>{t("Klikni ovdje da sačuvaš kopiju podataka.")}</div>
              </div>
              <Ic n="chevron" s={14} c={C.warning} style={{ transform:"rotate(-90deg)",flexShrink:0 }}/>
            </div>
            <button onClick={e=>{e.stopPropagation();updPrefs({backupSnoozedUntil:Date.now()+BACKUP_SNOOZE_MS});}} title={t("Podsjeti me za 7 dana")} style={{ background:"transparent",border:"none",padding:4,cursor:"pointer",color:C.textMuted,flexShrink:0 }}>
              <Ic n="x" s={14} c={C.textMuted}/>
            </button>
          </div>
        )}

        {/* ── 1. HERO BALANCE CARD — ultra-modern redesign ────────── */}
        <div className="su" onClick={() => forecast.hasHistory && setForecastOpen(v => !v)}
          style={{ background:bal>=0?`linear-gradient(135deg,${C.accent}18 0%,${C.income}12 100%)`:`linear-gradient(135deg,${C.expense}22 0%,${C.accent}10 100%)`, border:`1.5px solid ${bal>=0?C.income:C.expense}35`, borderRadius:22, padding:"18px 18px 16px", marginBottom:10, position:"relative", overflow:"hidden", cursor: forecast.hasHistory ? "pointer" : "default",
            boxShadow:`0 4px 24px ${bal>=0?C.income:C.expense}18` }}>
          {/* Background decoration */}
          <div style={{ position:"absolute",right:-30,top:-30,width:120,height:120,borderRadius:"50%",background:`${bal>=0?C.income:C.expense}12`,pointerEvents:"none" }}/>
          <div style={{ position:"absolute",right:20,bottom:-20,width:80,height:80,borderRadius:"50%",background:`${C.accent}08`,pointerEvents:"none" }}/>

          {/* Top row: label + date */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:6,height:6,borderRadius:"50%",background:bal>=0?C.income:C.expense,boxShadow:`0 0 6px ${bal>=0?C.income:C.expense}` }}/>
              <span style={{ fontSize:11,fontWeight:600,color:C.textSub,letterSpacing:.5,textTransform:"uppercase" }}>{t("Stanje na dan")}</span>
            </div>
            <div style={{ textAlign:"right" }}>
              <span style={{ fontSize:12,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:C.textSub }}>{dd}.{mm}.</span>
              <span style={{ fontSize:10,color:C.textMuted,marginLeft:3 }}>{yy}.</span>
            </div>
          </div>

          {/* Balance amount */}
          <div style={{ fontSize:bal>=0&&Math.abs(bal)<10000?36:32,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:bal>=0?C.income:C.expense,letterSpacing:-1,lineHeight:1.1,marginBottom:2 }}>{fmt(bal)}</div>

          {/* Inline forecast row */}
          {forecastBal !== null && (
            <div style={{ marginTop:8, paddingTop:8, borderTop:`1px solid ${bal>=0?C.income:C.expense}25`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:11, color:C.textMuted, display:"flex", alignItems:"center", gap:4 }}>
                <span style={{ fontSize:12 }}>📊</span> {projectionMonthLabel}
              </span>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:13, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:forecastColor }}>
                  {forecastBal >= 0 ? "+" : ""}{fmt(forecastBal)}
                </span>
                <Ic n="chevron" s={11} c={C.textMuted} style={{ transform: forecastOpen ? "rotate(90deg)" : "rotate(-90deg)", transition:"transform .2s" }}/>
              </div>
            </div>
          )}

          {/* Expandable forecast detail */}
          {forecastOpen && forecast.hasHistory && (
            <div className="su" style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${forecastColor}30` }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                {[
                  { lb:t("Plaćeno"),  val:fmt(forecast.paidSoFar),    col:C.expense },
                  { lb:t("Obveze"),   val:fmt(forecast.recurringLeft), col:C.accent  },
                  { lb:t("Procjena"),  val:fmt(forecast.discForecast), col:C.textMuted },
                  { lb:t("Prihodi"),  val:fmt(forecast.incomeSoFar),   col:C.income  },
                  { lb:t("U čekanju"),val:fmt(forecast.pendingKnown),  col:C.warning },
                  { lb:`${forecast.daysLeft} ${t("dana")}`, val:`${fmt(forecast.dailyDisc)}/${t("dan")}`, col:C.textMuted },
                ].map(({lb,val,col:c}) => (
                  <div key={lb} style={{ background:`${C.bg}80`, borderRadius:8, padding:"6px 8px", border:`1px solid ${c}20` }}>
                    <div style={{ fontSize:9,color:C.textMuted,marginBottom:2,textTransform:"uppercase",letterSpacing:.4 }}>{lb}</div>
                    <div style={{ fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:c }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ position:"absolute",right:-20,top:-20,width:90,height:90,borderRadius:"50%",background:`${bal>=0?C.income:C.expense}10` }}/>
        </div>

        {/* ── 2. MINI CARDS — modern glassmorphism style ──────────── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
          <div className="su" style={{ background:C.card,border:`1px solid ${C.border}`,borderLeft:`3px solid ${C.income}`,borderRadius:14,padding:"10px 12px" }}>
            <div style={{ fontSize:10,color:C.textMuted,marginBottom:3,display:"flex",alignItems:"center",gap:4 }}><Ic n="up" s={13} c={C.income}/>{cmName} {t("primici")}</div>
            <div style={{ fontSize:14,fontWeight:700,color:C.income,fontFamily:"'JetBrains Mono',monospace" }}>{fmt(mI)}</div>
          </div>
          <div className="su" style={{ background:C.card,border:`1px solid ${C.border}`,borderLeft:`3px solid ${C.expense}`,borderRadius:14,padding:"10px 12px" }}>
            <div style={{ fontSize:10,color:C.textMuted,marginBottom:3,display:"flex",alignItems:"center",gap:4 }}><Ic n="down" s={13} c={C.expense}/>{cmName} {t("plaćeno")}</div>
            <div style={{ display:"flex",alignItems:"baseline",gap:6 }}>
              <div style={{ fontSize:14,fontWeight:700,color:C.expense,fontFamily:"'JetBrains Mono',monospace" }}>{fmt(mE)}</div>
              {/* YoY improvement badge */}
              {monthImprovement !== null && monthImprovement >= 0.05 && (
                <span style={{ fontSize:10,fontWeight:700,color:C.income,background:`${C.income}18`,borderRadius:8,padding:"1px 5px",display:"flex",alignItems:"center",gap:2 }}>
                  ↓{Math.round(monthImprovement*100)}%
                </span>
              )}
              {monthImprovement !== null && monthImprovement < -0.05 && (
                <span style={{ fontSize:10,fontWeight:700,color:C.expense,background:`${C.expense}18`,borderRadius:8,padding:"1px 5px",display:"flex",alignItems:"center",gap:2 }}>
                  ↑{Math.round(Math.abs(monthImprovement)*100)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {yd.length === 0 ? (
          /* ── EMPTY STATE — onboarding guide ─────────────────────────── */
          <div className="su" style={{ marginTop:8 }}>
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ width:60,height:60,borderRadius:20,background:`linear-gradient(135deg,${C.accent},${C.accentDk})`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",boxShadow:`0 4px 15px ${C.accentGlow}`,cursor:"pointer" }}
                onClick={()=>setPage("add")}>
                <Ic n="plus" s={28} c="#fff"/>
              </div>
              <h3 style={{ fontSize:17,fontWeight:700,color:C.text,marginBottom:6 }}>{t("Dobrodošao u Moja Lova!")}</h3>
              <p style={{ fontSize:13,color:C.textMuted,lineHeight:1.5 }}>{t("Prati financije u 3 koraka:")}</p>
            </div>

            {onboardingSteps.map((step, i) => (
              <div key={i} onClick={!step.done ? step.action : undefined}
                style={{ display:"flex",alignItems:"flex-start",gap:12,padding:"12px 14px",background:step.done?`${C.income}08`:C.cardAlt,border:`1px solid ${step.done?C.income+"40":C.border}`,borderRadius:14,marginBottom:8,cursor:step.done?"default":"pointer",transition:"all .2s" }}>
                <div style={{ width:36,height:36,borderRadius:11,background:step.done?`${C.income}20`:`${C.accent}15`,border:`1px solid ${step.done?C.income:C.accent}30`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18 }}>
                  {step.done ? "✅" : step.icon}
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:13,fontWeight:700,color:step.done?C.income:C.text,marginBottom:3,display:"flex",alignItems:"center",gap:6 }}>
                    {step.title}
                    {step.done && <span style={{ fontSize:10,fontWeight:700,color:C.income }}>✓</span>}
                  </div>
                  <div style={{ fontSize:11,color:C.textMuted,lineHeight:1.4 }}>{step.body}</div>
                </div>
                {!step.done && (
                  <span style={{ fontSize:11,fontWeight:700,color:C.accent,flexShrink:0,whiteSpace:"nowrap",alignSelf:"center" }}>{step.cta}</span>
                )}
              </div>
            ))}

            <div style={{ textAlign:"center",marginTop:8,padding:"10px 0" }}>
              <button onClick={()=>setPage("add")} style={{ background:`linear-gradient(135deg,${C.accent},${C.accentDk})`,border:"none",borderRadius:14,padding:"12px 28px",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:`0 4px 15px ${C.accentGlow}` }}>
                <Ic n="plus" s={16} c="#fff" style={{ marginRight:6,verticalAlign:"middle" }}/>{t("Dodaj prvu transakciju")}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── 3. ZA PLATITI — moved up, compact, 4 items max ─────── */}
            {todoItems.length === 0 ? (
              <div className="su" style={{ background:C.card,border:`1px solid ${C.income}40`,borderLeft:`4px solid ${C.income}`,borderRadius:14,padding:"10px 14px",marginBottom:10,display:"flex",alignItems:"center",gap:10 }}>
                <div style={{ width:30,height:30,borderRadius:9,background:`${C.income}20`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  <Ic n="check" s={15} c={C.income}/>
                </div>
                <div>
                  <div style={{ fontSize:12,fontWeight:700,color:C.income }}>{t("Sve obveze podmirene!")}</div>
                  <div style={{ fontSize:10,color:C.textMuted,marginTop:1 }}>{cmName} {year}.</div>
                </div>
              </div>
            ) : (
              <div className="su" style={{ background:C.card,border:`1px solid ${C.warning}40`,borderLeft:`4px solid ${C.warning}`,borderRadius:14,marginBottom:10,overflow:"hidden" }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px 7px",borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:11,fontWeight:600,color:C.warning,display:"flex",alignItems:"center",gap:5 }}>
                    <Ic n="coins" s={12} c={C.warning}/>
                    {todoItems.some(i=>i.kind==="recurring_income") && todoItems.some(i=>i.kind!=="recurring_income")
                      ? t("Dospijeva")
                      : todoItems.every(i=>i.kind==="recurring_income")
                      ? t("Za naplatiti")
                      : t("Za platiti")}
                    <span style={{ background:`${C.warning}25`,borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700,color:C.warning }}>{todoItems.length}</span>
                  </div>
                  <div style={{ fontSize:12,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:C.warning }}>{fmt(todoItems.reduce((s,i)=>s+i.amount,0))}</div>
                </div>
                {/* Scrollable list — fits ~3.5 items, scrolls if more. Subtle bottom fade hints at more content below. */}
                <div style={{ position:"relative" }}>
                  <div style={{
                    padding:"6px 10px",
                    display:"flex",
                    flexDirection:"column",
                    gap:5,
                    maxHeight: todoMaxHeight,
                    overflowY: todoItems.length > Math.max(3, Math.floor(todoMaxHeight / 44)) ? "auto" : "visible",
                    overscrollBehavior: "contain",
                    WebkitOverflowScrolling: "touch",
                  }}>
                    {todoItems.map(item => (
                      <div key={item.kind+"-"+item.id} style={{ display:"flex",alignItems:"center",gap:8,padding:"6px 8px",background:C.cardAlt,borderRadius:9,border:`1px solid ${C.border}`,flexShrink:0 }}>
                        <div style={{ width:26,height:26,borderRadius:7,background:item.kind==="recurring_income"?`${C.income}15`:item.kind==="recurring"?`${C.accent}15`:`${C.warning}15`,border:`1px solid ${item.kind==="recurring_income"?C.income:item.kind==="recurring"?C.accent:C.warning}30`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:13 }}>
                          {item.kind==="recurring_income" ? "💵" : categoryIcon(item.category)}
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:12,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{item.description || t(item.category)}</div>
                          <div style={{ fontSize:10,color:C.textMuted,display:"flex",alignItems:"center",gap:3,marginTop:1 }}>
                            <Ic n="cal" s={9} c={C.textMuted}/>{new Date(item.date).getDate()}.{new Date(item.date).getMonth()+1}.
                            {item.kind==="recurring" && <span style={{ color:C.accent,fontWeight:600 }}>· {t("Redovna obveza")}</span>}
                            {item.kind==="recurring_income" && <span style={{ color:C.income,fontWeight:600 }}>· {t("Redovni primitak")}</span>}
                          </div>
                        </div>
                        <div style={{ fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:C.text,flexShrink:0 }}>{fmt(item.amount)}</div>
                        <button onClick={()=>payTodoItem(item)} style={{ padding:"4px 8px",background:C.income,border:"none",borderRadius:6,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0 }}>
                          <Ic n="check" s={10} c="#fff"/>
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Bottom fade hint — only when scroll is active */}
                  {todoItems.length > Math.max(3, Math.floor(todoMaxHeight / 44)) && (
                    <div style={{ position:"absolute", left:0, right:0, bottom:0, height:14, pointerEvents:"none", background:`linear-gradient(180deg, transparent 0%, ${C.card} 95%)` }}/>
                  )}
                </div>
                {/* Footer — always visible */}
                <div style={{ padding:"6px 12px 8px",borderTop:`1px solid ${C.border}` }}>
                  <button onClick={()=>{ if (onGoToTransactions) onGoToTransactions("overdue"); else { if(setTxFilter)setTxFilter("overdue"); setPage("transactions"); } }}
                    style={{ width:"100%",padding:"5px",background:"transparent",border:"none",color:C.accent,fontSize:11,fontWeight:600,cursor:"pointer" }}>
                    {todoItems.length > 3 ? `${t("Prikaži sve")} (${todoItems.length}) →` : `${t("Otvori transakcije")} →`}
                  </button>
                </div>
              </div>
            )}

            {/* ── 3b. DAILY LIMIT WIDGET ──────────────────────────────── */}
            <div className="su" style={{ background:C.card, border:`1px solid ${dlColor}40`, borderRadius:18, padding:"14px 16px", marginBottom:10, overflow:"hidden", position:"relative" }}>
              {/* Subtle background glow */}
              <div style={{ position:"absolute", top:0, right:0, width:120, height:120, borderRadius:"50%", background:`${dlColor}12`, transform:"translate(30%,-30%)", pointerEvents:"none" }}/>

              {/* Header row */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <div style={{ width:28, height:28, borderRadius:9, background:`${dlColor}20`, border:`1px solid ${dlColor}25`, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                    <img src={WALLET_GAUGE_ICON} style={{ width:22, height:22 }} alt=""/>
                  </div>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:C.textSub, textTransform:"uppercase", letterSpacing:.5 }}>{t("Dnevni limit potrošnje")}</div>
                    <div style={{ fontSize:10, color:C.textMuted, marginTop:1 }}>
                      {nextPayday && nextPayday.days <= 31
                        ? <>{nextPayday.days === 0 ? t("Danas") : `${nextPayday.days} ${t("dana do")} ${nextPayday.name}`}</>
                        : <>{daysLeft} {t("dana do kraja mjeseca")}</>
                      }
                    </div>
                  </div>
                </div>
                {/* Savings edit button */}
                <button onClick={() => {
                    if (dlDetailOpen && dlSavingsEdit) {
                      // Both open → close both
                      setDlDetailOpen(false); setDlSavingsEdit(false);
                    } else {
                      // Open both
                      setDlDetailOpen(true); setDlSavingsEdit(true);
                      setDlSavingsInput(plannedSavingsRaw > 0 ? String(plannedSavingsRaw) : "");
                      setDlSavingsPeriod(savedPeriod);
                    }
                  }}
                  style={{ background:`${C.accent}18`, border:`1px solid ${C.accent}40`, borderRadius:20, padding:"4px 10px", fontSize:11, fontWeight:600, color:C.accent, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                  🎯 {t("Štednja")}
                </button>
              </div>

              {/* Main daily limit number */}
              <div style={{ display:"flex", alignItems:"flex-end", gap:8, marginBottom:10 }}>
                <div style={{ fontSize:36, fontWeight:800, fontFamily:"'JetBrains Mono',monospace", color:dlColor, lineHeight:1 }}>
                  {dlGood ? "" : "-"}{fmt(Math.abs(dailyLimit))}
                </div>
                <div style={{ fontSize:16, color:dlColor, marginBottom:5, fontWeight:700, opacity:.75 }}>{t("/ dan")}</div>
              </div>

              {/* Status message */}
              <div style={{ fontSize:12, color:dlColor, fontWeight:600, marginBottom:10, display:"flex", alignItems:"center", gap:5 }}>
                <span>{dailyLimit >= 20 ? "✅" : dailyLimit >= 0 ? "⚠️" : "🚨"}</span>
                <span>
                  {dailyLimit >= 20
                    ? t("Dobro si! Možeš trošiti ovaj iznos dnevno.")
                    : dailyLimit >= 0
                    ? t("Pažnja — mali prostor za potrošnju.")
                    : t("Prekoračenje — smanji rashode ili štednju.")}
                </span>
              </div>

              {/* ── Savings detail cards (toggle with 💸) ─────────── */}
              {dlDetailOpen && (
                <div style={{ marginBottom: dlSavingsEdit ? 10 : 0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <div style={{ flex:1, height:1, background:C.border }}/>
                    <span style={{ fontSize:9, fontWeight:700, color:C.textMuted, letterSpacing:1, textTransform:"uppercase" }}>{t("Štednja")}</span>
                    <div style={{ flex:1, height:1, background:C.border }}/>
                  </div>
                  <div style={{ display:"flex", gap:7, marginBottom:8 }}>
                    <div style={{ flex:1, background:C.cardAlt, borderRadius:12, padding:"8px 9px", border:`1px solid ${C.income}30` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:5 }}>
                        <span style={{ fontSize:12 }}>💰</span>
                        <span style={{ fontSize:9, fontWeight:700, color:C.income, textTransform:"uppercase", letterSpacing:.5 }}>{t("Mjes.")}</span>
                      </div>
                      <div style={{ fontSize:13, fontWeight:800, fontFamily:"'JetBrains Mono',monospace", color:C.income }}>{fmt(plannedMonthly)}</div>
                      <div style={{ fontSize:9, color:C.textMuted, marginTop:3, fontStyle:"italic" }}>{t("planirano")}</div>
                    </div>
                    <div style={{ flex:1, background:C.cardAlt, borderRadius:12, padding:"8px 9px", border:`1px solid ${C.accent}30` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:5 }}>
                        <span style={{ fontSize:12 }}>📅</span>
                        <span style={{ fontSize:9, fontWeight:700, color:C.accent, textTransform:"uppercase", letterSpacing:.5 }}>{t("God.")}</span>
                      </div>
                      <div style={{ fontSize:13, fontWeight:800, fontFamily:"'JetBrains Mono',monospace", color:C.accent }}>{fmt(plannedYearly)}</div>
                      <div style={{ fontSize:9, color:C.textMuted, marginTop:3, fontStyle:"italic" }}>{t("planirano")}</div>
                    </div>
                    <div style={{ flex:1, background:C.cardAlt, borderRadius:12, padding:"8px 9px", border:`1.5px solid ${savingsProgressColor}50` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:5 }}>
                        <span style={{ fontSize:12 }}>{savingsProgress >= 1 ? "🏆" : savingsProgress >= .5 ? "📊" : "🎯"}</span>
                        <span style={{ fontSize:9, fontWeight:700, color:savingsProgressColor, textTransform:"uppercase", letterSpacing:.5 }}>{t("Ukupno")}</span>
                      </div>
                      <div style={{ fontSize:13, fontWeight:800, fontFamily:"'JetBrains Mono',monospace", color:savingsProgressColor }}>{fmt(savedSoFar)}</div>
                      {plannedMonthly > 0 ? (
                        <div style={{ marginTop:4 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                            <span style={{ fontSize:8, color:C.textMuted }}>{Math.round(savingsProgress*100)}%</span>
                            <span style={{ fontSize:8, color:savingsProgressColor, fontWeight:700 }}>{fmt(plannedMonthly)}</span>
                          </div>
                          <div style={{ height:4, borderRadius:3, background:`${C.textMuted}20` }}>
                            <div style={{ height:"100%", width:`${Math.min(100,savingsProgress*100)}%`, background:`linear-gradient(90deg,${savingsProgressColor}90,${savingsProgressColor})`, borderRadius:3, transition:"width .5s" }}/>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize:8, color:C.textMuted, marginTop:3, fontStyle:"italic" }}>{t("Postavi cilj")}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}


              {/* Otvori/Zatvori štednju toggle */}
              <div onClick={() => { setDlDetailOpen(v=>!v); if (!dlDetailOpen) setDlSavingsEdit(false); }}
                style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, cursor:"pointer", padding:"6px 0 2px", marginBottom:4 }}>
                <span style={{ fontSize:11, color:C.accent, fontWeight:600 }}>
                  {dlDetailOpen ? t("Zatvori štednju") : t("Otvori štednju")}
                </span>
                <span style={{ fontSize:11, color:C.accent, transform:dlDetailOpen?"rotate(180deg)":"rotate(0deg)", transition:"transform .2s", display:"inline-block" }}>▼</span>
              </div>
              {/* Savings input panel */}
              {dlSavingsEdit && (
                <div style={{ marginTop:10 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:C.textMuted, letterSpacing:.3 }}>{t("Planirana štednja")}</div>
                    <div style={{ display:"flex", gap:6 }}>
                      {[{k:"monthly",lhr:"Mjesečno",len:"Monthly"},{k:"yearly",lhr:"Godišnje",len:"Yearly"}].map(opt=>(
                        <button key={opt.k} onClick={()=>setDlSavingsPeriod(opt.k)}
                          style={{ fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:20, cursor:"pointer", border:`1px solid ${dlSavingsPeriod===opt.k?C.accent:C.border}`, background:dlSavingsPeriod===opt.k?C.accent:"transparent", color:dlSavingsPeriod===opt.k?"#fff":C.textMuted, transition:"all .2s" }}>
                          {t(opt.lhr)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ fontSize:10, color:C.textMuted, marginBottom:6 }}>{dlSavingsPeriod==="monthly" ? t("Iznos koji odvajate svaki mjesec") : t("Godišnji iznos — dijelit će se s 12")}</div>
                  {savingsExceedsIncome && (
                    <div style={{ fontSize:10, color:C.expense, fontWeight:600, marginBottom:8, padding:"4px 8px", background:`${C.expense}12`, borderRadius:6, border:`1px solid ${C.expense}30` }}>
                      ⚠️ {t("Planirana štednja premašuje raspoložive prihode")}
                    </div>
                  )}
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <div style={{ flex:1, position:"relative" }}>
                    <input
                      type="number" min="0" step="10"
                      value={dlSavingsInput}
                      onChange={e => setDlSavingsInput(e.target.value)}
                      placeholder="0"
                      style={{ width:"100%", background:C.cardAlt, border:`1.5px solid ${C.accent}60`, borderRadius:10, padding:"8px 36px 8px 10px", fontSize:14, fontWeight:700, color:C.text, fontFamily:"'JetBrains Mono',monospace", outline:"none", boxSizing:"border-box" }}
                      autoFocus
                    />
                    <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", fontSize:12, color:C.textMuted, fontWeight:600 }}>€</span>
                  </div>
                  <button
                    onClick={() => {
                      const v = parseFloat(dlSavingsInput) || 0;
                      updPrefs({ plannedSavings: v, plannedSavingsPeriod: dlSavingsPeriod });
                      setDlSavingsEdit(false);
                    }}
                    style={{ background:C.accent, color:"#fff", border:"none", borderRadius:10, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                    {t("Spremi")}
                  </button>
                  <button
                    onClick={() => setDlSavingsEdit(false)}
                    style={{ background:C.cardAlt, color:C.textMuted, border:`1px solid ${C.border}`, borderRadius:10, padding:"8px 12px", fontSize:13, cursor:"pointer" }}>
                    ✕
                  </button>
                </div>
                </div>
              )}
            </div>

            {/* ── 4. ADVISOR INSIGHTS — anomalies + positive ──────────── */}
            {visibleInsights.length > 0 && (
              <div style={{ marginBottom:10 }}>
                {visibleInsights.map((ins, i) => {
                  const col = insightColor(ins.color);
                  return (
                    <div key={i} className="su"
                      style={{ background:`linear-gradient(135deg,${col}18,${col}08)`, border:`1px solid ${col}40`, borderLeft:`4px solid ${col}`, borderRadius:14, padding:"9px 12px", marginBottom:i<visibleInsights.length-1?6:0, animationDelay:`${i*.05}s` }}>
                      <div style={{ display:"flex",alignItems:"flex-start",gap:8 }}>
                        {ins.icon === 'WALLET_GAUGE' ? <img src={WALLET_GAUGE_ICON} style={{ width:20,height:20,flexShrink:0 }} alt=""/> : <span style={{ fontSize:15,flexShrink:0,lineHeight:1.3 }}>{ins.icon}</span>}
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:12,fontWeight:700,color:col,marginBottom:1 }}>{ins.title}</div>
                          <div style={{ fontSize:11,color:C.textMuted,lineHeight:1.4 }}>{ins.body}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── 5. TOP KATEGORIJE — horizontal bar chart, mobile-optimized ── */}
            {catsMonth.length > 0 && (() => {
              const topN     = catsMonth.slice(0, 4);
              const maxVal   = topN[0].value;
              const totalAll = catsMonth.reduce((s,c)=>s+c.value, 0);
              const totalTop = topN.reduce((s,c)=>s+c.value, 0);
              return (
                <div className="su" style={{ background:C.card,border:`1px solid ${C.accent}40`,borderLeft:`4px solid ${C.accent}`,borderRadius:14,padding:"10px 12px 8px",marginBottom:10 }}>
                  {/* Header row: title + total */}
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9,paddingBottom:7,borderBottom:`1px solid ${C.border}40` }}>
                    <div style={{ fontSize:11,fontWeight:600,color:C.textMuted,display:"flex",alignItems:"center",gap:5 }}>
                      <Ic n="tag" s={12} c={C.textMuted}/>{t("Top kategorije")} · {cmName}
                    </div>
                    <div style={{ fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:C.text }}>
                      {fmt(totalTop)}
                    </div>
                  </div>

                  {/* Bar rows */}
                  <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                    {topN.map((c, i) => {
                      const pctMax   = Math.max(2, Math.round((c.value / maxVal) * 100));
                      const pctTotal = totalAll > 0 ? Math.round((c.value / totalAll) * 100) : 0;
                      const color    = CHART_COLORS[i % CHART_COLORS.length];
                      const isHot    = !!anomalies.find(a => a.category === c.name);
                      return (
                        <div key={c.name} style={{ display:"flex",alignItems:"center",gap:8 }}>
                          <span style={{ fontSize:14,flexShrink:0,lineHeight:1,width:18,textAlign:"center" }}>{categoryIcon(c.name)}</span>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3,gap:6 }}>
                              <span style={{ fontSize:11,fontWeight:500,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,minWidth:0 }}>{t(c.name)}</span>
                              <div style={{ display:"flex",alignItems:"center",gap:5,flexShrink:0 }}>
                                {isHot && (
                                  <span title={t("Iznad prosjeka")} style={{ fontSize:9,fontWeight:700,color:C.warning,background:`${C.warning}20`,borderRadius:6,padding:"1px 5px",lineHeight:1.3 }}>↑</span>
                                )}
                                <span style={{ fontSize:10,color:C.textMuted,fontFamily:"'JetBrains Mono',monospace",fontWeight:500 }}>{pctTotal}%</span>
                                <span style={{ fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:11,color:C.text,minWidth:48,textAlign:"right" }}>{fmt(c.value)}</span>
                              </div>
                            </div>
                            {/* Bar */}
                            <div style={{ height:7,background:`${C.cardAlt}`,borderRadius:4,overflow:"hidden",boxShadow:`inset 0 1px 1px rgba(0,0,0,.08)` }}>
                              <div style={{
                                height:"100%",
                                width:`${pctMax}%`,
                                background:`linear-gradient(90deg, ${color}AA 0%, ${color} 60%, ${color} 100%)`,
                                borderRadius:4,
                                transition:"width .55s cubic-bezier(.2,.8,.2,1)",
                                boxShadow:`0 1px 2px ${color}40`
                              }}/>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {catsMonth.length > 4 && (
                    <button onClick={()=>{setPage("charts");}} style={{ marginTop:8,width:"100%",padding:"5px 0 2px",background:"transparent",border:"none",borderTop:`1px solid ${C.border}30`,color:C.accent,fontSize:11,fontWeight:600,cursor:"pointer" }}>
                      + {catsMonth.length - 4} {t("više")} · {t("Otvori statistiku →")}
                    </button>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}


export default Dashboard;
