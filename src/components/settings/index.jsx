import { useState, useEffect, useMemo, useRef } from 'react';
import { K, DEF_LISTS, T, MONTHS, MONTHS_EN, MSHORT, MSHORT_EN, MAX_ATT, BACKUP_SNOOZE_MS, CURRENCIES, TIMEZONES } from '../../lib/constants.js';
import { fmtEur, fDate, load, save, curYear, buildCSV, buildSummary, nativeSaveAndShare, isCapacitor } from '../../lib/helpers.js';
import { hashPinV2, hashPinLegacy } from '../../lib/crypto.js';
import { Ic, LynxLogo, LynxLogoWhite, StickyHeader } from '../ui.jsx';
import { SetupPin } from '../auth.jsx';
import { ListEditor }      from './ListEditor.jsx';
import { ShareModal }      from './ShareModal.jsx';
import { RecurringEditor } from './RecurringEditor.jsx';
import { GeneralSettings } from './GeneralSettings.jsx';
import { AboutScreen }     from './AboutScreen.jsx';
import { BudgetEditor }    from './BudgetEditor.jsx';

function Settings({ C, txs, setTxs, drafts, prefs, updPrefs, user, updUser, lists, setLists, subPg, setSubPg, year, sec, updSec, setUnlocked, setSetupMode, onChangePinCrypto, onRemovePinCrypto, supaUser, onSignOut, onSyncToCloud, t, lang }) {
  const cy = curYear();
  const years = Array.from({length:12},(_,i)=>cy-5+i);

  if (subPg) {
    if (subPg === "general") {
      return <GeneralSettings C={C} txs={txs} setTxs={setTxs} drafts={drafts} lists={lists} setLists={setLists} prefs={prefs} updPrefs={updPrefs} user={user} updUser={updUser} sec={sec} updSec={updSec} year={year} setSetupMode={setSetupMode} setUnlocked={setUnlocked} onBack={()=>setSubPg(null)} onAbout={()=>setSubPg("about")} onChangePinCrypto={onChangePinCrypto} onRemovePinCrypto={onRemovePinCrypto} supaUser={supaUser} onSignOut={onSignOut} onSyncToCloud={onSyncToCloud} t={t} lang={lang} />;
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

        {/* Account section — shown when logged in via Supabase */}
        {supaUser && (
          <div style={{ background:C.card, border:`1px solid ${C.accent}30`, borderLeft:`4px solid ${C.accent}`, borderRadius:13, padding:"12px 14px", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:34, height:34, borderRadius:10, background:`${C.accent}20`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Ic n="user" s={16} c={C.accent}/>
                </div>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:C.text }}>{supaUser.user_metadata?.full_name || supaUser.email}</div>
                  <div style={{ fontSize:11, color:C.textMuted }}>{supaUser.email}</div>
                </div>
              </div>
              <button onClick={onSignOut}
                style={{ padding:"6px 12px", background:`${C.expense}15`, border:`1px solid ${C.expense}40`, borderRadius:8, color:C.expense, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                {t("Odjava")}
              </button>
            </div>
          </div>
        )}

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
            <div style={{ width:40, height:40, borderRadius:12, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:"flex", alignItems:"center", justifyContent:"center" }}><LynxLogoWhite s={20}/></div>
            <div style={{ flex:1 }}><div style={{ fontSize:15, fontWeight:700, color:C.text }}>{t("Money Lynx")}</div><div style={{ fontSize:11, color:C.textMuted }}>{t("Verzija")} .4</div></div>
            <button onClick={()=>setSubPg("about")}
              style={{ width:32, height:32, borderRadius:"50%", background:`${C.accent}20`, border:`1.5px solid ${C.accent}50`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
              <span style={{ fontSize:14, fontWeight:700, color:C.accent, fontFamily:"serif", lineHeight:1 }}>i</span>
            </button>
          </div>
          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:11 }}>
            <p style={{ fontSize:13, fontWeight:600, color:C.accent }}>moneylynx.net</p>
            <p style={{ fontSize:11, color:C.textMuted, marginTop:3 }}>E-mail: <a href="mailto:info@moneylynx.net" style={{ color:C.accent, textDecoration:"none" }}>info@moneylynx.net</a></p>
            <p style={{ fontSize:11, color:C.textMuted, marginTop:3 }}>© {cy} Money Lynx · {t("Sva prava pridržana.")}</p>
            <p style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{t("Osobna upotreba · Nije za komercijalnu distribuciju.")}</p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Settings;
