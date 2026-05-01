import { useState, useEffect, useMemo, useRef } from 'react';
import { K, DEF_LISTS, T, MONTHS, MONTHS_EN, MSHORT, MSHORT_EN, MAX_ATT, BACKUP_SNOOZE_MS, CURRENCIES, TIMEZONES } from '../../lib/constants.js';
import { fmtEur, fDate, load, save, curYear, buildCSV, buildSummary, nativeSaveAndShare, isCapacitor } from '../../lib/helpers.js';
import { hashPinV2, hashPinLegacy } from '../../lib/crypto.js';
import { Ic, LynxLogo, LynxLogoWhite, StickyHeader } from '../ui.jsx';
import { SetupPin } from '../auth.jsx';

function RecurringEditor({ C, items, lists, onBack, t, incomeMode = false }) {
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
                        {incomeMode ? lists.categories_income : lists.categories_expense.map(c=><option key={c} value={c}>{t(c)}</option>)}
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
                    {incomeMode ? lists.categories_income : lists.categories_expense.map(c=><option key={c} value={c}>{t(c)}</option>)}
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

export { RecurringEditor };
export default RecurringEditor;
