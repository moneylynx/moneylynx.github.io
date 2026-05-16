import { useState, useMemo, useEffect, useRef } from 'react';
import { MONTHS, T } from '../lib/constants.js';
import { fmtEur, save } from '../lib/helpers.js';
import { categoryIcon } from '../lib/categoryIcons.js';
import { Ic, StickyHeader } from './ui.jsx';
import { useSmartDefaults } from '../hooks/useSmartDefaults.js';
import { recognizeReceiptFromFile } from '../lib/receiptOcr.js';

function TxForm({ C, tx, draft, lists, setLists, txs, onSubmit, onCancel, onGoRecurring, t }) {
  const init = tx ?? (draft ? {
    date: draft.date.split("T")[0],
    type: "Isplata",
    description: draft.description,
    amount: draft.amount,
    category: "", location: "", payment: "Gotovina", status: "Plaćeno", notes: "", installments: 0, installmentPeriod: "M"
  } : {
    date: new Date().toISOString().split("T")[0],
    type: "Isplata",
    description: "",
    category: "", location: "", payment: "Gotovina", status: "Plaćeno", amount: "", notes: "", installments: 0, installmentPeriod: "M"
  });

  const [form, setForm] = useState(init);
  const upd = patch => setForm(f=>({...f,...patch}));
  const receiptInputRef = useRef(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrMsg, setOcrMsg] = useState("");

  const [err, setErr] = useState({ msg: "", field: "" });
  const clearErr = () => setErr({ msg: "", field: "" });

  const [showInstSetup, setShowInstSetup] = useState(false);
  const [tempInst, setTempInst] = useState(form.installments || 3);
  const [tempPeriod, setTempPeriod] = useState(form.installmentPeriod || "M");

  const [isRecurring, setIsRecurring] = useState(false);
  const [recDueDay,   setRecDueDay]   = useState(new Date().getDate());
  const [recMonths,   setRecMonths]   = useState("");

  // ─── Mode flags (declared early — used by smart defaults below) ─────────────
  // NOTE: must be declared BEFORE useSmartDefaults() and any useEffect that
  // references isNewEntry, otherwise the bundler hoists those calls into a
  // temporal-dead-zone and throws "Cannot access … before initialization".
  const hasSecondaryData = !!(tx?.notes || tx?.location || draft?.notes);
  const isNewEntry = !tx && !draft;

  // ─── Smart defaults ─────────────────────────────────────────────────────────
  // Only active for new entries (not edit/draft). Predicts category/location/
  // payment from description, plus offers recent-combo chips.
  const { suggestField, recentCombos, predictions, AUTO_THRESHOLD } =
    useSmartDefaults(isNewEntry ? (txs || []) : [], form);

  // Track which fields have been auto-filled vs manually set, so we don't
  // overwrite a manual edit with a new prediction.
  const [autoFilledFields, setAutoFilledFields] = useState(new Set());

  // Apply auto-fill when description has high-confidence predictions.
  useEffect(() => {
    if (!isNewEntry || !form.description || form.description.trim().length < 3) return;

    const fieldsToAuto = ['category', 'location', 'payment'];
    const toApply = {};
    const newAutoSet = new Set(autoFilledFields);

    for (const f of fieldsToAuto) {
      // Don't auto-fill a field the user already edited manually.
      if (form[f] && !autoFilledFields.has(f)) continue;

      const suggested = suggestField(f, AUTO_THRESHOLD);
      if (suggested && suggested !== form[f]) {
        toApply[f] = suggested;
        newAutoSet.add(f);
      }
    }
    if (Object.keys(toApply).length > 0) {
      setForm(prev => ({ ...prev, ...toApply }));
      setAutoFilledFields(newAutoSet);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.description, form.type]);

  // Apply chip combo — fills description, category, location, payment from a recent tx.
  const applyCombo = (combo) => {
    setForm(prev => ({
      ...prev,
      description: combo.description,
      category:    combo.category,
      location:    combo.location,
      payment:     combo.payment,
    }));
    setAutoFilledFields(new Set(['category', 'location', 'payment']));
    clearErr();
  };

  const inst       = parseInt(form.installments) || 0;
  const isGotov    = form.payment === "Gotovina";
  const isPrimitak = form.type === "Primitak";
  const cats       = isPrimitak ? lists.categories_income : lists.categories_expense;

  const budgetWarning = useMemo(() => {
    if (isPrimitak || tx || !form.category || !lists.budgets) return null;
    const limit = lists.budgets[form.category];
    if (!limit || limit <= 0) return null;
    const now = new Date();
    const cm = MONTHS[now.getMonth()];
    const cy = now.getFullYear();
    const spent = (txs || [])
      .filter(x => x.type === "Isplata" && x.category === form.category && new Date(x.date).getFullYear() === cy && MONTHS[new Date(x.date).getMonth()] === cm)
      .reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
    const incoming = parseFloat(form.amount) || 0;
    if (spent + incoming > limit) {
      return { spent, incoming, limit, over: spent + incoming - limit };
    }
    return null;
  }, [form.category, form.amount, form.type, isPrimitak, tx, txs, lists.budgets]);

  const CARD_PAYMENTS = ["Kartica (debitna)", "Kreditna kartica"];
  const payments  = isPrimitak
    ? lists.payments.filter(p => !CARD_PAYMENTS.includes(p))
    : (inst>1 ? lists.payments.filter(p=>p!=="Gotovina") : lists.payments);

  const handleReceiptOcr = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setOcrBusy(true);
    setOcrMsg(t("Čitam račun…"));
    try {
      const res = await recognizeReceiptFromFile(file, { categories: lists.categories_expense || [] });
      if (!res.ok) {
        setOcrMsg(res.message || t("OCR nije dostupan u ovom načinu rada."));
        return;
      }
      const patch = {};
      if (res.fields.date) patch.date = res.fields.date;
      if (res.fields.amount) patch.amount = res.fields.amount;
      if (res.fields.description) patch.description = res.fields.description;
      if (res.fields.category && (lists.categories_expense || []).includes(res.fields.category)) patch.category = res.fields.category;
      if (res.fields.notes) patch.notes = res.fields.notes;
      patch.type = "Isplata";
      patch.status = form.status || "Plaćeno";
      setForm(prev => ({ ...prev, ...patch }));
      if (patch.category) setAutoFilledFields(prev => new Set([...prev, 'category']));
      setShowAdvanced(true);
      setOcrMsg(t("OCR je popunio podatke. Provjeri iznos, datum i kategoriju prije spremanja."));
    } catch (err) {
      console.warn("OCR failed", err);
      setOcrMsg(t("OCR čitanje nije uspjelo. Pokušaj jasniju fotografiju računa."));
    } finally {
      setOcrBusy(false);
    }
  };

  useEffect(()=>{
    if (!tx && !draft) {
      upd({
        category: "",
        status: "Plaćeno",
        payment: isPrimitak && CARD_PAYMENTS.includes(form.payment) ? "Gotovina" : form.payment,
      });
      setAutoFilledFields(new Set());
    } else if (tx && isPrimitak) {
      if (!form.status) upd({ status: "Plaćeno" });
      if (CARD_PAYMENTS.includes(form.payment)) upd({ payment: "Gotovina" });
    }
  },[form.type]);
  useEffect(()=>{ if (isGotov && inst>1) upd({ installments:0 }); },[form.payment]);
  useEffect(()=>{ if (inst>1 && isGotov) upd({ payment: lists.payments.find(p=>p!=="Gotovina") ?? lists.payments[0] }); },[form.installments]);

  // Progressive disclosure — secondary fields hidden until expanded
  // NOTE: isNewEntry & hasSecondaryData are declared earlier in this component
  // (before the smart-defaults hook) — do NOT redeclare here.
  const [showAdvanced, setShowAdvanced] = useState(!isNewEntry || hasSecondaryData);

  // Split transactions — expense entries only
  const canSplit  = isNewEntry && form.type === "Isplata";
  const [splitMode, setSplitMode] = useState(false);
  const [splits, setSplits] = useState([{id:"s1",amount:"",category:"",description:""},{id:"s2",amount:"",category:"",description:""}]);
  const splitsTotal    = splits.reduce((sum,sp)=>sum+(parseFloat(sp.amount)||0), 0);
  const splitRemainder = Math.round(((parseFloat(form.amount)||0)-splitsTotal)*100)/100;
  const updSplit = (id,patch) => setSplits(p=>p.map(sp=>sp.id===id?{...sp,...patch}:sp));
  const addSplit = () => setSplits(p=>[...p,{id:`s${Date.now()}`,amount:"",category:"",description:""}]);
  const delSplit = (id) => setSplits(p=>p.length>2?p.filter(sp=>sp.id!==id):p);

  const fld = { width:"100%", height:46, padding:"0 12px", background:C.cardAlt, border:`1.5px solid ${C.border}`, borderRadius:12, color:C.text, fontSize:14 };

  // Typography hierarchy: primary labels are more prominent than secondary
  const lblPrimary = { fontSize:12, fontWeight:700, color:C.text, marginBottom:6, display:"flex", alignItems:"center", gap:5, letterSpacing:.1 };
  const lbl        = { fontSize:11, fontWeight:600, color:C.textMuted, marginBottom:5, display:"flex", alignItems:"center", gap:5, letterSpacing:.2, textTransform:"uppercase" };
  const lblAdv     = { fontSize:10, fontWeight:600, color:C.textMuted, marginBottom:5, display:"flex", alignItems:"center", gap:4, letterSpacing:.3, textTransform:"uppercase", opacity:.8 };

  // Style accent for auto-filled fields — subtle green tint to show "we guessed this".
  const autoFilledStyle = (key) => autoFilledFields.has(key) ? {
    borderColor: `${C.income}80`,
    background:  `${C.income}08`,
  } : {};

  const submit = () => {
    clearErr();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0)   { setErr({ msg: t("Unesite ispravan iznos"),    field:"amount"      }); return; }
    if (!form.description.trim()) { setErr({ msg: t("Unesite opis"),              field:"description" }); return; }
    if (!form.payment)            { setErr({ msg: t("Odaberite način plaćanja"),  field:"payment"     }); return; }

    const finalCategory = form.category || t("Ostalo");
    const finalLocation = form.location || t("Ostalo");
    const finalForm = { ...form, category: finalCategory, location: finalLocation };

    if (!tx && isRecurring && form.type === "Isplata") {
      const day = Math.max(1, Math.min(31, parseInt(recDueDay) || 1));
      const months = parseInt(recMonths) || 0;
      const rec = {
        id: Date.now().toString(),
        description: form.description.trim(),
        amount, category: finalCategory, location: finalLocation,
        payment: form.payment, dueDay: day,
        months: months > 0 ? months : null,
        createdAt: Date.now(),
        notes: form.notes || "",
      };
      if (typeof setLists === "function") {
        setLists(l => ({ ...l, recurring: [...(l.recurring || []), rec] }));
      }
      const now = new Date();
      const firstDate = new Date(now.getFullYear(), now.getMonth(), Math.min(day, 28));
      onSubmit({
        ...finalForm, amount, installments: 0,
        date: firstDate.toISOString().split("T")[0],
        status: "Čeka plaćanje",
        recurringId: rec.id,
      });
      return;
    }

    if (inst <= 1 && !finalForm.status){ setErr({ msg: t("Odaberite status"), field:"status" }); return; }
    if (splitMode && canSplit) {
      const valid = splits.filter(sp => parseFloat(sp.amount)>0 && sp.category);
      if (valid.length < 2) { setErr({ msg: t("Unesite barem 2 stavke za podjelu"), field:"split" }); return; }
      const splitTotal = valid.reduce((s,sp)=>s+(parseFloat(sp.amount)||0),0);
      if (Math.abs(splitTotal-amount)>0.01) { setErr({ msg: `${t("Zbroj stavki")} ${fmtEur(splitTotal)} ≠ ${fmtEur(amount)}`, field:"split" }); return; }
      onSubmit({ ...finalForm, amount, installments:inst, splits:valid.map(sp=>({...sp,amount:parseFloat(sp.amount)||0})), category:"(split)" });
      return;
    }
    onSubmit({ ...finalForm, amount, installments: inst });
  };

  const bd = (name) => err.field === name ? C.expense : C.border;

  return (
    <div className="fi" style={{ width:"100%" }}>
      <StickyHeader C={C} icon={tx?"edit":draft?"zap":"plus"} title={tx?t("Uredi unos"):draft?t("Dovrši skicu"):t("Novi unos")}
        right={<button onClick={onCancel} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, color:C.textMuted, padding:"8px 14px", borderRadius:10, fontSize:13, cursor:"pointer" }}>{t("Odustani")}</button>}
      />
      <div style={{ padding:"14px 16px 0" }}>

        {draft && (
            <div style={{ background:`${C.warning}15`, border:`1px solid ${C.warning}40`, borderRadius:12, padding:"10px 14px", marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>
                <Ic n="info" s={16} c={C.warning}/>
                <span style={{ fontSize:12, color:C.text, fontWeight:500 }}>{t("Unos iz skice. Dovršite detalje i spremite.")}</span>
            </div>
        )}

        {isNewEntry && form.type === "Isplata" && (
          <div style={{ background:C.card, border:`1px solid ${C.accent}35`, borderRadius:14, padding:12, marginBottom:14 }}>
            <input ref={receiptInputRef} type="file" accept="image/*" capture="environment" onChange={handleReceiptOcr} style={{ display:"none" }}/>
            <button type="button" onClick={()=>receiptInputRef.current?.click()} disabled={ocrBusy}
              style={{ width:"100%", padding:"11px 12px", background:`linear-gradient(135deg,${C.accent}18,${C.income}12)`, border:`1px solid ${C.accent}45`, borderRadius:12, color:C.accent, fontSize:13, fontWeight:700, cursor:ocrBusy?"wait":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {ocrBusy ? <span style={{ width:14, height:14, borderRadius:"50%", border:`2px solid ${C.accent}`, borderTopColor:"transparent", animation:"spin 1s linear infinite" }}/> : <Ic n="camera" s={15} c={C.accent}/>}
              {ocrBusy ? t("Čitam račun…") : t("Skeniraj račun (OCR)")}
            </button>
            {ocrMsg && (
              <div style={{ marginTop:8, fontSize:11, color:ocrMsg.includes("Provjeri")?C.income:C.textMuted, lineHeight:1.45 }}>
                {ocrMsg}
              </div>
            )}
          </div>
        )}

        {/* ─── Recent combos chips — tap to fill the form ──────────────────── */}
        {isNewEntry && recentCombos.length > 0 && form.type === "Isplata" && !form.description && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.textMuted, letterSpacing:1.2, textTransform:"uppercase", marginBottom:8, display:"flex", alignItems:"center", gap:5 }}>
              <Ic n="zap" s={11} c={C.accent}/>{t("Brzi unos")}
            </div>
            <div style={{ display:"flex", gap:7, overflowX:"auto", paddingBottom:4, marginLeft:-2, paddingLeft:2 }}>
              {recentCombos.map((combo, i) => (
                <button key={i} onClick={()=>applyCombo(combo)}
                  style={{
                    flexShrink:0, padding:"7px 12px",
                    background:`${C.accent}10`,
                    border:`1px solid ${C.accent}40`,
                    borderRadius:18, cursor:"pointer",
                    display:"flex", alignItems:"center", gap:6,
                    fontSize:12, color:C.text, fontWeight:500,
                  }}>
                  <span style={{ fontSize:14 }}>{categoryIcon(combo.category)}</span>
                  <span style={{ maxWidth:100, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {combo.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
          {["Isplata","Primitak"].map(x=>(
            <button key={x} onClick={()=>upd({type:x})}
              style={{ padding:12, border:`2px solid ${form.type===x?(x==="Primitak"?C.income:C.expense):C.border}`, borderRadius:14, background:form.type===x?(x==="Primitak"?`${C.income}15`:`${C.expense}15`):"transparent", color:form.type===x?(x==="Primitak"?C.income:C.expense):C.textMuted, fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
              <Ic n={x==="Primitak"?"up":"down"} s={15} c={form.type===x?(x==="Primitak"?C.income:C.expense):C.textMuted}/>{t(x)}
            </button>
          ))}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <label style={lbl}><Ic n="cal" s={11} c={C.textMuted}/>{t("Datum")}</label>
              <input type="date" value={form.date} onChange={e=>upd({date:e.target.value})} style={fld}/>
            </div>
            <div>
              <label style={lblPrimary}><Ic n="coins" s={13} c={C.accent}/><span>{t("Iznos (€)")}</span></label>
              <input type="number" inputMode="decimal" step="0.01" min="0" placeholder="0,00" value={form.amount}
                onChange={e=>{ upd({amount:e.target.value}); clearErr(); }}
                style={{...fld, fontFamily:"'JetBrains Mono',monospace", fontWeight:600, borderColor:bd("amount")}}/>
            </div>
          </div>

          <div>
            <label style={lblPrimary}><Ic n="edit" s={13} c={C.accent}/><span>{t("Opis")}</span></label>
            <input type="text" placeholder="" value={form.description}
              onChange={e=>{
                upd({description:e.target.value});
                // User edited description — clear auto-fill markers so a new
                // prediction can run cleanly.
                if (autoFilledFields.size > 0) {
                  setForm(prev => ({...prev, description:e.target.value, category:"", location:"", payment: prev.payment === "Gotovina" ? "Gotovina" : ""}));
                  setAutoFilledFields(new Set());
                }
                clearErr();
              }} style={{...fld, borderColor:bd("description")}} lang="hr" autoCapitalize="sentences"/>
          </div>

          <div>
            <label style={lbl}>
              <span style={{ fontSize:13 }}>{form.category ? categoryIcon(form.category) : '🏷️'}</span>
              {t("Kategorija")}
              {autoFilledFields.has('category') && <span style={{ marginLeft:'auto', fontSize:9, color:C.income, fontWeight:700 }}>{t("auto")}</span>}
            </label>
            <select value={form.category} onChange={e=>{
              upd({category:e.target.value});
              setAutoFilledFields(prev => { const s = new Set(prev); s.delete('category'); return s; });
              clearErr();
            }} style={{...fld, color:!form.category?C.textMuted:C.text, borderColor:bd("category"), ...autoFilledStyle('category')}}>
              <option value="" disabled>{t("- odabrati -")}</option>
              {cats.map(c=><option key={c} value={c}>{categoryIcon(c)}  {t(c)}</option>)}
            </select>
          </div>

          {canSplit && parseFloat(form.amount)>0 && !isRecurring && inst<=1 && (
            <button type="button" onClick={()=>setSplitMode(v=>!v)}
              style={{ background:splitMode?`${C.warning}15`:"transparent", border:`1.5px solid ${splitMode?C.warning:C.border}`, padding:"6px 12px", borderRadius:20, cursor:"pointer", display:"flex", alignItems:"center", gap:6, color:splitMode?C.warning:C.textMuted, fontSize:12, fontWeight:600, alignSelf:"flex-start", transition:"all .2s" }}>
              🔀 {splitMode ? t("Ukloni podjelu") : t("Podijeli po kategorijama")}
            </button>
          )}
          {splitMode && canSplit && (
            <div className="su" style={{ background:C.cardAlt, border:`1.5px solid ${C.warning}50`, borderRadius:14, padding:"11px 12px 8px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.warning, marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span>🔀 {t("Podjela iznosa")}</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:splitRemainder===0?C.income:C.expense }}>
                  {splitRemainder===0?`✓ ${fmtEur(parseFloat(form.amount)||0)}`:splitRemainder>0?`−${fmtEur(splitRemainder)}`:(`+${fmtEur(Math.abs(splitRemainder))} prekoračeno`)}
                </span>
              </div>
              {splits.map(sp => (
                <div key={sp.id} style={{ display:"grid", gridTemplateColumns:"80px 1fr 28px", gap:5, marginBottom:7, alignItems:"end" }}>
                  <div>
                    <label style={lblAdv}>{t("Iznos €")}</label>
                    <input type="number" inputMode="decimal" placeholder="0,00" value={sp.amount} onChange={e=>updSplit(sp.id,{amount:e.target.value})} style={{...fld, height:38, fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:13}}/>
                  </div>
                  <div>
                    <label style={lblAdv}>{sp.category?categoryIcon(sp.category):"🏷️"} {t("Kategorija")}</label>
                    <select value={sp.category} onChange={e=>updSplit(sp.id,{category:e.target.value})} style={{...fld, height:38, color:!sp.category?C.textMuted:C.text}}>
                      <option value="" disabled>{t("- odabrati -")}</option>
                      {cats.map(c=><option key={c} value={c}>{categoryIcon(c)} {t(c)}</option>)}
                    </select>
                  </div>
                  <button onClick={()=>delSplit(sp.id)} disabled={splits.length<=2} style={{ height:38, background:"transparent", border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", opacity:splits.length<=2?0.3:1 }}>
                    <Ic n="x" s={11} c={C.textMuted}/>
                  </button>
                </div>
              ))}
              <div style={{ display:"flex", gap:6, marginTop:4 }}>
                <button onClick={addSplit} style={{ flex:1, padding:"6px 10px", background:"transparent", border:`1px dashed ${C.border}`, borderRadius:9, color:C.textMuted, fontSize:11, cursor:"pointer" }}>+ {t("Dodaj stavku")}</button>
                {splitRemainder>0.005 && (
                  <button onClick={()=>updSplit(splits[splits.length-1].id,{amount:String(Math.round((parseFloat(splits[splits.length-1].amount||0)+splitRemainder)*100)/100)})}
                    style={{ padding:"6px 10px", background:`${C.income}15`, border:`1px solid ${C.income}40`, borderRadius:9, color:C.income, fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                    ↓ {fmtEur(splitRemainder)}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── "Više opcija" toggle ─────────────────────────────────── */}
          <button type="button" onClick={() => setShowAdvanced(v => !v)}
            style={{ background:"transparent", border:"none", padding:"2px 0", cursor:"pointer", display:"flex", alignItems:"center", gap:6, color:C.textMuted, fontSize:12, fontWeight:600, alignSelf:"flex-start" }}>
            <Ic n={showAdvanced ? "chevron" : "chevron"} s={11} c={C.textMuted}
              style={{ transform: showAdvanced ? "rotate(90deg)" : "rotate(-90deg)", transition:"transform .2s" }}/>
            {showAdvanced ? t("Sakrij opcije") : t("Više opcija")}
            {/* Show hint badges when advanced fields have values */}
            {!showAdvanced && (form.location || form.notes || inst > 1 || isRecurring) && (
              <span style={{ background:C.accent, borderRadius:10, padding:"1px 6px", fontSize:9, fontWeight:700, color:"#fff" }}>
                {[form.location && form.location !== "Ostalo", form.notes, inst > 1, isRecurring].filter(Boolean).length}
              </span>
            )}
          </button>

          {showAdvanced && (<>
          <div>
            <label style={lblAdv}>
              <Ic n="pin" s={10} c={C.textMuted}/>{t("Lokacija")}
              {autoFilledFields.has('location') && <span style={{ marginLeft:'auto', fontSize:9, color:C.income, fontWeight:700 }}>{t("auto")}</span>}
            </label>
            <select value={form.location} onChange={e=>{
              upd({location:e.target.value});
              setAutoFilledFields(prev => { const s = new Set(prev); s.delete('location'); return s; });
              clearErr();
            }} style={{...fld, color:!form.location?C.textMuted:C.text, borderColor:bd("location"), ...autoFilledStyle('location')}}>
              <option value="" disabled>{t("- odabrati -")}</option>
              {lists.locations.map(l=><option key={l} value={l}>{t(l)}</option>)}
            </select>
          </div>

          {form.type==="Isplata" && !tx && (
            isGotov
              ? <div style={{ background:C.cardAlt, borderRadius:12, padding:"10px 14px", border:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:8 }}>
                  <Ic n="info" s={14} c={C.textMuted}/>
                  <span style={{ fontSize:12, color:C.textMuted }}>{t("Plaćanje gotovinom ne omogućuje obročnu otplatu.")}</span>
                </div>
              : <div style={{ background:C.cardAlt, borderRadius:14, padding:13, border:`1.5px solid ${inst>1 || showInstSetup ? C.warning : C.border}`, transition:"border-color .2s" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span style={{ fontSize:13, fontWeight:600, color:inst>1 || showInstSetup ? C.warning : C.textMuted, display:"flex", alignItems:"center", gap:6 }}>
                      <Ic n="tag" s={14} c={inst>1 || showInstSetup ? C.warning : C.textMuted}/>{t("Obročna otplata?")}
                    </span>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>{ setShowInstSetup(true); setTempInst(Math.max(2, inst)); }}
                        style={{ padding:"5px 14px", borderRadius:20, border:`1.5px solid ${inst>1 || showInstSetup ? C.warning : C.border}`, background:inst>1 || showInstSetup ? `${C.warning}20` : "transparent", color:inst>1 || showInstSetup ? C.warning : C.textMuted, fontSize:12, fontWeight:600, cursor:"pointer", transition:"all .2s" }}>{t("Da")}</button>
                      <button onClick={()=>{ upd({installments:0}); setShowInstSetup(false); }}
                        style={{ padding:"5px 14px", borderRadius:20, border:`1.5px solid ${inst<=1 && !showInstSetup ? C.accent : C.border}`, background:inst<=1 && !showInstSetup ? `${C.accent}20` : "transparent", color:inst<=1 && !showInstSetup ? C.accent : C.textMuted, fontSize:12, fontWeight:600, cursor:"pointer", transition:"all .2s" }}>{t("Ne")}</button>
                    </div>
                  </div>
                  {!showInstSetup && inst > 1 && (
                      <div style={{ fontSize:11, fontWeight:600, color:C.warning, marginTop:10, padding:"6px 10px", background:`${C.warning}15`, borderRadius:8, display:"inline-flex", alignItems:"center", gap:5 }}>
                          <Ic n="check" s={12} c={C.warning}/> {t("Aktivirano:")} {inst} {t("obroka")}
                      </div>
                  )}
                  {showInstSetup && (
                    <div className="su" style={{ background: C.bg, padding:14, borderRadius:12, border:`1px solid ${C.border}`, marginTop:12 }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                        <span style={{ fontSize:12, color:C.textMuted }}>{t("Dinamika:")}</span>
                        <div style={{ display:"flex", background:C.cardAlt, borderRadius:8, overflow:"hidden", border:`1px solid ${C.border}` }}>
                          <button onClick={()=>setTempPeriod("M")} style={{ padding:"5px 12px", fontSize:11, background:tempPeriod==="M"?C.warning:"transparent", color:tempPeriod==="M"?"#000":C.textMuted, border:"none", cursor:"pointer", fontWeight:600 }}>{t("Mjesečno")}</button>
                          <button onClick={()=>setTempPeriod("Y")} style={{ padding:"5px 12px", fontSize:11, background:tempPeriod==="Y"?C.warning:"transparent", color:tempPeriod==="Y"?"#000":C.textMuted, border:"none", cursor:"pointer", fontWeight:600 }}>{t("Godišnje")}</button>
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                        <span style={{ fontSize:12, color:C.textMuted, whiteSpace:"nowrap" }}>{t("Broj obroka:")}</span>
                        <input type="range" min="2" max="36" value={tempInst} onChange={e=>setTempInst(parseInt(e.target.value))} style={{ flex:1, accentColor:C.warning }}/>
                        <div style={{ background:C.cardAlt, borderRadius:8, border:`1px solid ${C.border}`, padding:"4px 10px", minWidth:38, textAlign:"center", fontSize:16, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:C.warning }}>{tempInst}</div>
                      </div>
                      {parseFloat(form.amount)>0 && (
                        <div style={{ padding:"10px 12px", background:`${C.warning}10`, borderRadius:10, border:`1px solid ${C.warning}30`, display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                          <div><div style={{ fontSize:11, color:C.textMuted }}>{t("Iznos obroka")}</div><div style={{ fontSize:15, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:C.warning }}>{fmtEur((parseFloat(form.amount)||0)/tempInst)}</div></div>
                        </div>
                      )}
                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={()=>{ upd({installments: tempInst, installmentPeriod: tempPeriod}); setShowInstSetup(false); }} style={{ flex:1, padding:10, background:C.warning, border:"none", borderRadius:10, color:"#000", fontWeight:700, fontSize:13, cursor:"pointer" }}>{t("Da, spremi")}</button>
                        <button onClick={()=>{ setShowInstSetup(false); upd({installments:0}); }} style={{ flex:1, padding:10, background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:10, color:C.textMuted, fontWeight:600, fontSize:13, cursor:"pointer" }}>{t("Ne, odustani")}</button>
                      </div>
                    </div>
                  )}
                </div>
          )}

          {form.type==="Isplata" && !tx && inst <= 1 && (
            <div style={{ background:C.cardAlt, borderRadius:14, padding:13, border:`1.5px solid ${isRecurring ? C.accent : C.border}`, transition:"border-color .2s" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:13, fontWeight:600, color:isRecurring ? C.accent : C.textMuted, display:"flex", alignItems:"center", gap:6 }}>
                  <Ic n="repeat" s={14} c={isRecurring ? C.accent : C.textMuted}/>{t("Redovna obveza?")}
                </span>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={()=>{
                    setIsRecurring(true);
                    if (inst > 1) { upd({ installments: 0 }); setShowInstSetup(false); }
                  }}
                    style={{ padding:"5px 14px", borderRadius:20, border:`1.5px solid ${isRecurring ? C.accent : C.border}`, background:isRecurring ? `${C.accent}20` : "transparent", color:isRecurring ? C.accent : C.textMuted, fontSize:12, fontWeight:600, cursor:"pointer", transition:"all .2s" }}>{t("Da")}</button>
                  <button onClick={()=>setIsRecurring(false)}
                    style={{ padding:"5px 14px", borderRadius:20, border:`1.5px solid ${!isRecurring ? C.accent : C.border}`, background:!isRecurring ? `${C.accent}20` : "transparent", color:!isRecurring ? C.accent : C.textMuted, fontSize:12, fontWeight:600, cursor:"pointer", transition:"all .2s" }}>{t("Ne")}</button>
                </div>
              </div>
              {isRecurring && (
                <div className="su" style={{ background: C.bg, padding:14, borderRadius:12, border:`1px solid ${C.border}`, marginTop:12, display:"flex", flexDirection:"column", gap:10 }}>
                  <div style={{ fontSize:11, color:C.textMuted, lineHeight:1.4 }}>
                    {t("Pretplata, kredit ili najam koji se ponavlja svakog mjeseca.")}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    <div>
                      <label style={lbl}><Ic n="cal" s={11} c={C.textMuted}/>{t("Dan dospijeća")}</label>
                      <input type="number" inputMode="numeric" min="1" max="31" value={recDueDay}
                        onChange={e=>setRecDueDay(e.target.value)}
                        style={{...fld, fontFamily:"'JetBrains Mono',monospace", fontWeight:600}}/>
                    </div>
                    <div>
                      <label style={lbl}><Ic n="tag" s={11} c={C.textMuted}/>{t("Broj mjeseci (opc.)")}</label>
                      <input type="number" inputMode="numeric" min="1" max="480" placeholder={t("neograničeno")}
                        value={recMonths} onChange={e=>setRecMonths(e.target.value)}
                        style={{...fld, fontFamily:"'JetBrains Mono',monospace", fontWeight:600}}/>
                    </div>
                  </div>
                  <div style={{ fontSize:11, color:C.accent, padding:"8px 10px", background:`${C.accent}10`, borderRadius:8, border:`1px solid ${C.accent}30` }}>
                    <Ic n="info" s={11} c={C.accent}/> {t("Unos za ovaj mjesec bit će kreiran odmah sa statusom \"Čeka plaćanje\".")}
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:(inst>1 || isPrimitak || isRecurring)?"1fr":"1fr 1fr", gap:10 }}>
            <div>
              <label style={lbl}>
                <Ic n="card" s={11} c={C.textMuted}/>{t("Plaćanje")}
                {autoFilledFields.has('payment') && <span style={{ marginLeft:'auto', fontSize:9, color:C.income, fontWeight:700 }}>{t("auto")}</span>}
              </label>
              <select value={form.payment} onChange={e=>{
                upd({payment:e.target.value});
                setAutoFilledFields(prev => { const s = new Set(prev); s.delete('payment'); return s; });
                clearErr();
              }} style={{...fld, color:!form.payment?C.textMuted:C.text, borderColor:bd("payment"), ...autoFilledStyle('payment')}}>
                <option value="" disabled>{t("- odabrati -")}</option>
                {payments.map(p=><option key={p} value={p}>{t(p)}</option>)}
              </select>
            </div>
            {inst <= 1 && !isPrimitak && !isRecurring && (
              <div>
                <label style={lbl}><Ic n="check" s={11} c={C.textMuted}/>{t("Status")}</label>
                <select value={form.status} onChange={e=>{ upd({status:e.target.value}); clearErr(); }} style={{...fld, color:!form.status?C.textMuted:C.text, borderColor:bd("status")}}>
                  <option value="" disabled>{t("- odabrati -")}</option>
                  {lists.statuses.map(s=><option key={s} value={s}>{t(s)}</option>)}
                </select>
              </div>
            )}
          </div>
          {inst > 1 && (
             <div style={{ fontSize:11, color:C.textMuted, marginTop:-5, paddingLeft:4, display:"flex", alignItems:"center", gap:5 }}>
                <Ic n="info" s={12} c={C.textMuted}/> {t("Status rata određuje se automatski.")}
             </div>
          )}

          <div>
            <label style={lbl}><Ic n="info" s={11} c={C.textMuted}/>{t("Napomene")}</label>
            <textarea placeholder={t("Opcionalno…")} value={form.notes||""} onChange={e=>upd({notes:e.target.value})}
              rows={2} style={{...fld, height:"auto", padding:"10px 12px", resize:"vertical"}}/>
          </div>
          </>)}
        </div>

        {err.msg && (
          <div className="fi" style={{ marginTop:14, padding:"10px 14px", background:`${C.expense}15`, border:`1px solid ${C.expense}50`, borderRadius:12, display:"flex", alignItems:"center", gap:8 }}>
            <Ic n="alert" s={16} c={C.expense}/>
            <span style={{ fontSize:13, color:C.expense, fontWeight:600 }}>{err.msg}</span>
          </div>
        )}

        {budgetWarning && (
          <div className="fi" style={{ marginTop:10, padding:"10px 14px", background:`${C.warning}15`, border:`1px solid ${C.warning}60`, borderRadius:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <Ic n="alert" s={15} c={C.warning}/>
              <span style={{ fontSize:13, color:C.warning, fontWeight:700 }}>
                {t("Trošak bi premašio limit za kategoriju")} {t(form.category)}
              </span>
            </div>
            <div style={{ display:"flex", gap:12, fontSize:11, color:C.textMuted, flexWrap:"wrap" }}>
              <span>{t("Dosad potrošeno")}: <b style={{color:C.text}}>{fmtEur(budgetWarning.spent)}</b></span>
              <span>{t("Limit")}: <b style={{color:C.text}}>{fmtEur(budgetWarning.limit)}</b></span>
              <span>{t("Prekoračenje")}: <b style={{color:C.expense}}>{fmtEur(budgetWarning.over)}</b></span>
            </div>
          </div>
        )}

        <button onClick={submit}
          style={{ width:"100%", padding:15, marginTop:err.msg?10:18, marginBottom:16, background:form.type==="Primitak"?`linear-gradient(135deg,${C.income},#059669)`:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:15, color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <Ic n="check" s={18} c="#fff"/>
          {tx ? t("Spremi promjene") : inst>1 ? `${t("Dodaj")} ${inst} ${t("obroka")}` : draft ? t("Spremi uneseno") : t("Dodaj transakciju")}
        </button>
      </div>
    </div>
  );
}


export default TxForm;
