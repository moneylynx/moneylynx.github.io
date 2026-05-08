import { useState, useEffect, useMemo, useRef } from 'react';
import { K, DEF_LISTS, T, MONTHS, MONTHS_EN, MSHORT, MSHORT_EN, MAX_ATT, BACKUP_SNOOZE_MS, CURRENCIES, TIMEZONES } from '../../lib/constants.js';
import { fmtEur, fDate, load, save, curYear, buildCSV, buildSummary, nativeSaveAndShare, isCapacitor } from '../../lib/helpers.js';
import { hashPinV2, hashPinLegacy } from '../../lib/crypto.js';
import { Ic, LynxLogo, LynxLogoWhite, StickyHeader } from '../ui.jsx';
import { SetupPin } from '../auth.jsx';

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

export { BudgetEditor };
export default BudgetEditor;
