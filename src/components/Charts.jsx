import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, AreaChart, Area, ResponsiveContainer } from 'recharts';
import { MONTHS, MONTHS_EN, MSHORT, MSHORT_EN, CHART_COLORS } from '../lib/constants.js';
import { fmtEur, fDate, monthOf, curYear } from '../lib/helpers.js';
import { Ic, Pill, StickyHeader } from './ui.jsx';

function Charts({ C, data, year, lists, tab, setTab, selMonth, setSelMonth, expFilter, setExpFilter, t, lang }) {
  const isYear = selMonth === "YEAR";
  const isAll = selMonth === "ALL";
  const isMonth = !isYear && !isAll;

  const yd = data.filter(x=>new Date(x.date).getFullYear()===year);
  const fd = isMonth ? yd.filter(x=>monthOf(x.date)===selMonth) : yd;
  const W  = Math.min(window.innerWidth??480,480)-64;
  const tt = { contentStyle:{background:C.cardAlt,border:`1px solid ${C.border}`,borderRadius:10,color:C.text,fontSize:11}, formatter:v=>fmtEur(v) };
  const curMIdx = new Date().getMonth();
  const rec = lists.recurring || [];

  const mBar  = useMemo(()=>MONTHS.map((m,i)=>{
    const mt=yd.filter(x=>monthOf(x.date)===m);
    const recAmt = rec.reduce((s,r)=>s+(+r.amount||0),0);
    const mLabel = (lang==="en" ? MSHORT_EN : MSHORT)[i];
    return{
      name:mLabel,
      inc:  mt.filter(x=>x.type==="Primitak").reduce((s,x)=>s+(+x.amount||0),0),
      exp:  mt.filter(x=>x.type==="Isplata"&&x.status==="Plaćeno").reduce((s,x)=>s+(+x.amount||0),0),
      ceka: mt.filter(x=>x.status==="Čeka plaćanje").reduce((s,x)=>s+(+x.amount||0),0),
      obr:  mt.filter(x=>x.status==="U obradi").reduce((s,x)=>s+(+x.amount||0),0),
      rec:  recAmt,
    };
  }),[yd,rec,lang,t]);

  const saldo = useMemo(()=>{
    let c=0;
    const isCurrentYear = year === curYear();
    return MONTHS.map((m,i)=>{
      const mt=yd.filter(x=>monthOf(x.date)===m);
      c+=mt.filter(x=>x.type==="Primitak").reduce((s,x)=>s+(+x.amount||0),0)-mt.filter(x=>x.type==="Isplata").reduce((s,x)=>s+(+x.amount||0),0);
      const mLabel = (lang==="en" ? MSHORT_EN : MSHORT)[i];
      return{ name:mLabel, saldo:(isCurrentYear && i>curMIdx)?null:c };
    });
  },[yd,year,lang]);

  const catD  = useMemo(()=>{ const m={}; fd.filter(x=>x.type==="Isplata").forEach(x=>{ m[x.category]=(m[x.category]||0)+(+x.amount||0); }); return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value); },[fd]);
  const payD  = useMemo(()=>{ const m={}; fd.forEach(x=>{ m[x.payment]=(m[x.payment]||0)+(+x.amount||0); }); return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value); },[fd]);
  const locD  = useMemo(()=>{ const m={}; fd.forEach(x=>{ m[x.location]=(m[x.location]||0)+(+x.amount||0); }); return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value); },[fd]);

  const mDetail = useMemo(()=>{
    let mt;
    if (isMonth)     mt = yd.filter(x=>monthOf(x.date)===selMonth);
    else if (isYear) mt = yd;
    else             mt = data; // isAll
    const inc = mt.filter(x=>x.type==="Primitak").reduce((s,x)=>s+(+x.amount||0),0);
    const exp = mt.filter(x=>x.type==="Isplata").reduce((s,x)=>s+(+x.amount||0),0);
    return { inc, exp, bal:inc-exp, count:mt.length };
  },[selMonth, yd, data, isMonth, isYear, isAll]);

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
          return amt > 0 ? `(${Math.round(amt)} mj.)` : "0";
      }
      if (tp > 0) return `${tp}`;
      if (r.endDate) {
        const ed = new Date(r.endDate);
        const rem = Math.max(0, (ed.getFullYear() - nowY) * 12 + (ed.getMonth() - nowM) + 1);
        return `${rem} mj.`;
      }
      return "";
    };

    const items = [];
    if (expFilter.rate) {
      fd.filter(x=>x.installmentGroup&&(x.status==="Čeka plaćanje" || x.status==="U obradi"))
        .forEach(x=>items.push({type:"rata",desc:x.description,amount:+x.amount||0,date:x.date,cat:x.category}));
    }
    if (expFilter.recurring || expFilter.kredit) {
      rec.forEach(r=>{
        const isKred = r.category === "Kredit" || (r.description && r.description.toLowerCase().includes("kredit"));
        if (isKred && !expFilter.kredit) return;
        if (!isKred && !expFilter.recurring) return;

        const paid = fd.some(x=>x.recurringId===r.id&&x.status==="Plaćeno");
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
    
    if (expFilter.processing) {
      fd.filter(x=>(x.status==="Čeka plaćanje" || x.status==="U obradi") && !x.installmentGroup && !x.recurringId)
        .forEach(x=>items.push({
            type: x.status === "U obradi" ? "processing" : "pending", 
            desc: x.description, 
            amount: +x.amount||0, 
            date: x.date, 
            cat: x.category
        }));
    }
    return items;
  },[fd, rec, expFilter, isMonth, isYear, isAll, year]);

  const expTotal = expData.reduce((s,e)=>s+e.amount,0);
  const typeLabel = {rata:t("Obrok"), obveza:t("Obveze"), pending:t("Čeka plaćanje"), processing:t("U obradi"), kredit:t("Rate")};
  const typeColor = {rata:C.warning, obveza:C.accent, pending:C.warning, processing:"#FB923C", kredit:"#A78BFA"};

  const tabs=[["expected",t("Očekivano")],["categories",t("Kategorije")],["overview",t("Pregled/Saldo")],["paylocal",t("Plaćanje/Lokacije")],["trend",t("Trend 3g.")]];
  const chartCard = { background:C.card, border:`1px solid ${C.border}`, borderRadius:15, padding:13, overflowX:"auto", marginBottom:10 };
  const chartLbl = (ic,text) => <div style={{ fontSize:11, fontWeight:600, color:C.textMuted, marginBottom:8, display:"flex", alignItems:"center", gap:5 }}><Ic n={ic} s={12} c={C.textMuted}/>{text}</div>;

  const activeMonthName = useMemo(()=> isMonth ? (lang==="en" ? MONTHS_EN : MONTHS)[MONTHS.indexOf(selMonth)] : "", [isMonth, selMonth, lang]);

  return (
    <div className="fi" style={{ width:"100%" }}>
      <StickyHeader C={C} icon="bar" title={t("Statistika")}/>
      <div style={{ padding:"12px 16px 0" }}>

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:"10px 12px", marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:600, color:C.textMuted, marginBottom:8, display:"flex", alignItems:"center", gap:5 }}>
            <Ic n="cal" s={12} c={C.textMuted}/>{t("Period prikaza")}
          </div>
          <div style={{ display:"flex", gap:5, overflowX:"auto", paddingBottom:2 }}>
            <Pill label={`${year}. (${t("Sve")})`} active={isYear} color={C.accent} onClick={()=>setSelMonth("YEAR")}/>
            {MONTHS.map((m,i)=>(
              <Pill key={m} label={(lang==="en"?MSHORT_EN:MSHORT)[i]} active={selMonth===m} color={C.accent} onClick={()=>setSelMonth(m)}/>
            ))}
            <Pill label={t("Sve ukupno")} active={isAll} color={C.accent} onClick={()=>setSelMonth("ALL")}/>
          </div>
        </div>

        {mDetail && (
          <div className="su" style={{ background:`linear-gradient(135deg,${C.accent}15,${C.income}10)`, border:`1px solid ${C.accent}30`, borderRadius:14, padding:"12px 14px", marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
              <Ic n="cal" s={14} c={C.accent}/>
              {isMonth && `${activeMonthName} ${year}.`}
              {isYear  && `${year}. (${t("Sve")})`}
              {isAll   && t("Sve ukupno")}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:6 }}>
              {[
                { lb:t("Primici"), val:fmtEur(mDetail.inc), col:C.income },
                { lb:t("Troškovi"), val:fmtEur(mDetail.exp), col:C.expense },
                { lb:t("Bilanca"), val:fmtEur(mDetail.bal), col:mDetail.bal>=0?C.income:C.expense },
                { lb:t("Stavki"), val:mDetail.count, col:C.accent },
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
              <span style={{ fontSize:12, fontWeight:600, color:C.textMuted }}>{t("Ukupno očekivano")}</span>
              <span style={{ fontSize:16, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:C.expense }}>{fmtEur(expTotal)}</span>
            </div>
            <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
              {[
                {k:"recurring", lb:t("Obveze (short)"), col:C.accent},
                {k:"rate",      lb:t("Obroci (short)"), col:C.warning},
                {k:"kredit",    lb:t("Rate (short)"),   col:"#A78BFA"},
                {k:"processing",lb:t("Ostalo (short)"), col:"#FB923C"},
              ].map(({k,lb,col})=>(
                <button key={k} onClick={()=>setExpFilter(f=>({...f,[k]:!f[k]}))}
                  style={{ padding:"5px 12px", borderRadius:18, border:`1.5px solid ${expFilter[k]?col:C.border}`, background:expFilter[k]?`${col}18`:"transparent", color:expFilter[k]?col:C.textMuted, fontSize:11, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ width:7, height:7, borderRadius:2, background:expFilter[k]?col:C.border }}/>{lb}
                </button>
              ))}
            </div>
            {expData.length===0
              ? <p style={{ textAlign:"center", color:C.textMuted, padding:16, fontSize:13 }}>{t("Nema očekivanih obveza")}</p>
              : expData.map((e,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderBottom:i<expData.length-1?`1px solid ${C.border}`:"none" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:0, textAlign:"left" }}>
                    <div style={{ width:7, height:7, borderRadius:2, background:typeColor[e.type], flexShrink:0 }}/>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:500, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.desc}</div>
                      <div style={{ fontSize:10, color:C.textMuted }}>{typeLabel[e.type]}{e.cat?` · ${t(e.cat)}`:""}{e.remainLabel?` · ${e.remainLabel}`:""}{e.endDate&&!e.remainLabel?` · ${t("do")} ${fDate(e.endDate)}`:""}</div>
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
            {catD.length>0 ? <><PieChart width={W} height={200}><Pie data={catD} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" stroke="none">{catD.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}</Pie><Tooltip {...tt}/></PieChart><div style={{marginTop:10}}>{catD.map((c,i)=><div key={c.name} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:i<catD.length-1?`1px solid ${C.border}`:"none",fontSize:12,color:C.text}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:9,height:9,borderRadius:3,background:CHART_COLORS[i%CHART_COLORS.length]}}/>{t(c.name)}</div><span style={{fontFamily:"'JetBrains Mono',monospace"}}>{fmtEur(c.value)}</span></div>)}</div></> : <p style={{textAlign:"center",color:C.textMuted,padding:20,fontSize:13}}>{t("Nema podataka")}</p>}
          </div>
        )}

        {tab==="overview" && <>
          <div style={chartCard}>
            {chartLbl("bar",t("Primici vs Troškovi"))}
            <BarChart width={W} height={260} data={mBar}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="name" tick={{fill:C.textMuted,fontSize:9}} axisLine={false}/><YAxis tick={{fill:C.textMuted,fontSize:9}} axisLine={false} width={44} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/><Tooltip {...tt}/><Legend wrapperStyle={{fontSize:10}}/>
              <Bar dataKey="inc"  name={t("Primici")}         fill={C.income}          radius={[3,3,0,0]}/>
              <Bar dataKey="exp"  name={t("Troškovi")}        fill={C.expense}         radius={[3,3,0,0]}/>
              <Bar dataKey="ceka" name={t("Čeka plaćanje")}   fill={C.warning}         radius={[3,3,0,0]}/>
              <Bar dataKey="obr"  name={t("U obradi")}        fill="#FB923C"           radius={[3,3,0,0]}/>
              <Bar dataKey="rec"  name={t("Obveze")}          fill={`${C.accent}80`}   radius={[3,3,0,0]}/>
            </BarChart>
          </div>
          <div style={chartCard}>
            {chartLbl("up",t("Kumulativni saldo"))}
            <AreaChart width={W} height={220} data={saldo}><defs><linearGradient id="saldoFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.accent} stopOpacity={0.25}/><stop offset="95%" stopColor={C.accent} stopOpacity={0.03}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="name" tick={{fill:C.textMuted,fontSize:9}} axisLine={false}/><YAxis tick={{fill:C.textMuted,fontSize:9}} axisLine={false} width={44} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(1)}k`:v}/><Tooltip {...tt}/><Area type="monotone" dataKey="saldo" name={t("Kumulativni saldo")} stroke={C.accent} strokeWidth={2.5} fill="url(#saldoFill)" dot={{fill:C.accent,r:3}} activeDot={{r:6}} connectNulls={false}/></AreaChart>
          </div>
        </>}

        {tab==="paylocal" && <>
          <div style={chartCard}>
            {chartLbl("card",t("Po načinu plaćanja"))}
            {payD.length>0 ? <BarChart width={W} height={200} data={payD} layout="vertical"><XAxis type="number" tick={{fill:C.textMuted,fontSize:9}} axisLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/><YAxis type="category" dataKey="name" tick={{fill:C.textMuted,fontSize:11}} tickFormatter={v=>t(v)} axisLine={false} width={120}/><Tooltip {...tt}/><Bar dataKey="value" fill={C.warning} radius={[0,6,6,0]}/></BarChart> : <p style={{textAlign:"center",color:C.textMuted,padding:20,fontSize:13}}>{t("Nema podataka")}</p>}
          </div>
          <div style={chartCard}>
            {chartLbl("pin",t("Po lokacijama"))}
            {locD.length>0 ? <BarChart width={W} height={200} data={locD} layout="vertical"><XAxis type="number" tick={{fill:C.textMuted,fontSize:9}} axisLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/><YAxis type="category" dataKey="name" tick={{fill:C.textMuted,fontSize:11}} tickFormatter={v=>t(v)} axisLine={false} width={100}/><Tooltip {...tt}/><Bar dataKey="value" fill={C.accent} radius={[0,6,6,0]}/></BarChart> : <p style={{textAlign:"center",color:C.textMuted,padding:20,fontSize:13}}>{t("Nema podataka")}</p>}
          </div>
        </>}

        {tab==="trend" && (() => {
          const cy = curYear();
          // Build 3-year comparison data: current year and 2 previous.
          const years3 = [cy-2, cy-1, cy];
          const trendData = years3.map(yr => {
            const yrData = data.filter(x => new Date(x.date).getFullYear() === yr);
            const inc = yrData.filter(x=>x.type==="Primitak").reduce((s,x)=>s+(+x.amount||0),0);
            const exp = yrData.filter(x=>x.type==="Isplata").reduce((s,x)=>s+(+x.amount||0),0);
            return { name: `${yr}.`, [t("Primici")]: Math.round(inc*100)/100, [t("Troškovi")]: Math.round(exp*100)/100, [t("Saldo")]: Math.round((inc-exp)*100)/100 };
          });
          return <>
            <div style={chartCard}>
              {chartLbl("bar", t("Primici vs Troškovi — 3 godine"))}
              <BarChart width={W} height={200} data={trendData} barGap={3} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{fill:C.textMuted,fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:C.textMuted,fontSize:8}} axisLine={false} tickLine={false} width={38} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
                <Tooltip {...tt}/>
                <Bar dataKey={t("Primici")}  fill={C.income}  radius={[4,4,0,0]}/>
                <Bar dataKey={t("Troškovi")} fill={C.expense} radius={[4,4,0,0]}/>
              </BarChart>
            </div>
            <div style={chartCard}>
              {chartLbl("coins", t("Godišnji saldo — 3 godine"))}
              <BarChart width={W} height={150} data={trendData}>
                <XAxis dataKey="name" tick={{fill:C.textMuted,fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:C.textMuted,fontSize:8}} axisLine={false} tickLine={false} width={38} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
                <Tooltip {...tt}/>
                <Bar dataKey={t("Saldo")}
                  radius={[4,4,0,0]}
                  fill={C.accent}
                  // Colour each bar by sign: green=positive, red=negative.
                  label={false}
                >
                  {trendData.map((e,i)=>(
                    <Cell key={i} fill={e[t("Saldo")]>=0?C.income:C.expense}/>
                  ))}
                </Bar>
              </BarChart>
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              {trendData.map(d=>(
                <div key={d.name} style={{ flex:1, background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"10px 12px" }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, marginBottom:6 }}>{d.name}</div>
                  <div style={{ fontSize:11, color:C.income }}>↑ {fmtEur(d[t("Primici")])}</div>
                  <div style={{ fontSize:11, color:C.expense }}>↓ {fmtEur(d[t("Troškovi")])}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:d[t("Saldo")]>=0?C.income:C.expense, marginTop:4 }}>= {fmtEur(d[t("Saldo")])}</div>
                </div>
              ))}
            </div>
          </>;
        })()}

      </div>
    </div>
  );
}


export default Charts;
