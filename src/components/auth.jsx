import { useState, useEffect, useCallback } from 'react';
import { K, MAX_ATT, LOCK_SEC, WIPE_AT } from '../lib/constants.js';
import { save } from '../lib/helpers.js';
import { hashPinV2, hashPinLegacy, loadKeyFromSession } from '../lib/crypto.js';
import { Ic } from './ui.jsx';

function LockScreen({ C, sec, onUnlock, onWipe, t }) {
  const [pin, setPin]       = useState("");
  const [err, setErr]       = useState("");
  const [tLeft, setTLeft]   = useState(0);
  const [busy, setBusy]     = useState(false); // crypto in progress

  const tryBio = useCallback(async () => {
    try {
      if (!sec.bioCredId) throw new Error("No cred");
      const idBuf = Uint8Array.from(atob(sec.bioCredId), c => c.charCodeAt(0));
      await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [{ id: idBuf, type: "public-key" }],
          userVerification: "required",
          timeout: 60000
        }
      });
      // Biometry passed — try session cache first.
      const cachedKey = await loadKeyFromSession();
      if (cachedKey) {
        // Have cached key → full unlock without PIN.
        await onUnlock(null, false, true);
      } else {
        // No cached key → just clear the error and let user type PIN normally.
        // Don't show confusing message, don't block anything.
        setErr("");
        setPin("");
      }
    } catch {
      setErr(t("Biometrija otkazana ili neuspješna."));
    }
  }, [onUnlock, sec, t]);

  // On mount: try session cache silently. If found, unlock immediately.
  // But only if biometry is NOT available — if biometry is active,
  // let it trigger naturally (500ms delay) to show the biometry prompt.
  useEffect(() => {
    const hasBio = sec.bioEnabled && sec.bioCredId && window.PublicKeyCredential;
    if (hasBio) return; // biometry will handle unlock via tryBio
    (async () => {
      try {
        const cachedKey = await loadKeyFromSession();
        if (cachedKey) await onUnlock(null, false, true);
      } catch { /* stay on lock screen */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sec.bioEnabled && sec.bioCredId && window.PublicKeyCredential) {
      const id = setTimeout(tryBio, 500);
      return () => clearTimeout(id);
    }
  }, [sec.bioEnabled, sec.bioCredId, tryBio]);

  useEffect(() => {
    if (!sec.lockedUntil) return;
    const tick = () => {
      const r = Math.ceil((sec.lockedUntil - Date.now()) / 1000);
      setTLeft(r > 0 ? r : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sec.lockedUntil]);

  const isLocked = sec.lockedUntil && Date.now() < sec.lockedUntil;

  const tryPin = async () => {
    if (isLocked || pin.length < 4 || busy) return;
    setBusy(true);
    setErr("");
    try {
      let isCorrect = false;
      let isLegacy  = false;
      if (sec.pinHashVersion === "v2") {
        const h = await hashPinV2(pin, sec.pinSalt);
        isCorrect = h === sec.pinHash;
      } else {
        const h = await hashPinLegacy(pin);
        isCorrect = h === sec.pinHash;
        if (isCorrect) isLegacy = true;
      }

      if (isCorrect) {
        save(K.sec, { ...sec, attempts:0, lockedUntil:null });
        await onUnlock(pin, isLegacy, false); // pass PIN for key derivation
      } else {
        const na = (sec.attempts||0)+1, tf = (sec.totalFailed||0)+1;
        const upd = { ...sec, attempts:na, totalFailed:tf };
        if (tf >= WIPE_AT) { onWipe(); return; }
        if (na >= MAX_ATT) {
          upd.lockedUntil = Date.now() + LOCK_SEC*1000;
          upd.attempts = 0;
          setErr(`${t("Previše pokušaja!")} ${t("Zaključano još")} ${LOCK_SEC}s. (${WIPE_AT-tf} ${t("do brisanja")})`);
        } else {
          setErr(`${t("Pogrešan PIN")}. ${na}/${MAX_ATT}. (${WIPE_AT-tf} ${t("do brisanja")})`);
        }
        save(K.sec, upd);
        setPin("");
      }
    } finally { setBusy(false); }
  };

  const PAD = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  const tapPad = k => {
    if (!k) return;
    setErr("");
    if (k==="⌫") setPin(p=>p.slice(0,-1));
    else if (pin.length < 6) setPin(p=>p+k);
  };

  return (
    <div style={{ width:"100%", minHeight:"100vh", background:"inherit", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 16px" }}>
      <div style={{ width:"100%", maxWidth:340 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:64, height:64, borderRadius:20, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
            <Ic n="lock" s={30} c="#fff"/>
          </div>
          <h1 style={{ fontSize:22, fontWeight:700, color:C.text }}>{t("Moja lova")}</h1>
          <p style={{ fontSize:13, color:C.textMuted, marginTop:4 }}>{t("Unesite PIN za pristup")}</p>
        </div>

        <div style={{ display:"flex", gap:14, justifyContent:"center", marginBottom:24 }}>
          {Array.from({length:6}).map((_,i)=>(
            <div key={i} style={{ width:13, height:13, borderRadius:"50%", background: i<pin.length ? C.accent : C.border, transition:"background .2s" }}/>
          ))}
        </div>

        {(err || isLocked) && (
          <div style={{ background:`${C.expense}18`, border:`1px solid ${C.expense}50`, borderRadius:10, padding:"8px 14px", marginBottom:16, fontSize:12, color:C.expense, textAlign:"center" }}>
            {isLocked ? `🔒 ${t("Zaključano još")} ${tLeft}s` : err}
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:18 }}>
          {PAD.map((k,i) => (
            <button key={i} onClick={()=>tapPad(k)}
              style={{ height:58, borderRadius:14, background:k?C.card:"transparent", border:k?`1px solid ${C.border}`:"none", color:C.text, fontSize:k==="⌫"?20:22, fontWeight:600, cursor:k?"pointer":"default", fontFamily:"'JetBrains Mono',monospace" }}>
              {k}
            </button>
          ))}
        </div>

        <button onClick={tryPin} disabled={isLocked||pin.length<4||busy}
          style={{ width:"100%", padding:13, marginBottom:10, background:isLocked||pin.length<4||busy?C.border:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:13, color:"#fff", fontSize:15, fontWeight:700, cursor:isLocked||pin.length<4||busy?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          {busy
            ? <><span style={{ width:16,height:16,borderRadius:"50%",border:`2px solid #fff`,borderTopColor:"transparent",display:"inline-block",animation:"spin .7s linear infinite" }}/>{t("Dešifriranje…")}</>
            : <><Ic n="unlock" s={17} c="#fff"/>{t("Otključaj")}</>}
        </button>

        {sec.bioEnabled && sec.bioCredId && (
          <button onClick={tryBio}
            style={{ width:"100%", padding:11, background:`${C.income}18`, border:`1px solid ${C.income}40`, borderRadius:13, color:C.income, fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            <Ic n="finger" s={17} c={C.income}/> {t("Biometrija")}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── SetupPin ────────────────────────────────────────────────────────────────
function SetupPin({ C, onSave, onSkip, isChange=false, t }) {
  const [step, setStep]         = useState("enter");
  const [enterPin, setEnterPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [err, setErr]           = useState("");

  const currentPin    = step === "enter" ? enterPin    : confirmPin;
  const setCurrentPin = step === "enter" ? setEnterPin : setConfirmPin;

  const PAD = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  const tap = k => {
    if (!k) return;
    setErr("");
    if (k === "⌫") setCurrentPin(p => p.slice(0,-1));
    else if (currentPin.length < 6) setCurrentPin(p => p + k);
  };

  const canProceed = currentPin.length >= 4;

  const next = () => {
    if (!canProceed) return;
    if (step === "enter") {
      setConfirmPin("");
      setStep("confirm");
    } else {
      if (confirmPin !== enterPin) {
        setErr(t("PIN-ovi se ne poklapaju"));
        setEnterPin(""); setConfirmPin(""); setStep("enter");
      } else {
        onSave(enterPin);
      }
    }
  };

  return (
    <div style={{ width:"100%", minHeight:"100vh", background:"inherit", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 16px" }}>
      <div style={{ width:"100%", maxWidth:340 }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ width:64, height:64, borderRadius:20, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", boxShadow:`0 4px 15px ${C.accentGlow}` }}>
            <Ic n="shield" s={30} c="#fff"/>
          </div>
          <h2 style={{ fontSize:20, fontWeight:700, color:C.text }}>{step==="enter"?t("Postavi PIN"):t("Potvrdi PIN")}</h2>
          <p style={{ fontSize:13, color:C.textMuted, marginTop:4 }}>{step==="enter"?t("Odaberi PIN (4–6 znamenki)"):t("Unesite isti PIN još jednom")}</p>
        </div>

        <div style={{ display:"flex", gap:14, justifyContent:"center", marginBottom:24 }}>
          {Array.from({length:6}).map((_,i)=>(
            <div key={i} style={{ width:13, height:13, borderRadius:"50%", background:i<currentPin.length?C.accent:C.border, transition:"background .2s" }}/>
          ))}
        </div>

        {err && <div style={{ background:`${C.expense}18`, border:`1px solid ${C.expense}50`, borderRadius:10, padding:"8px 14px", marginBottom:14, fontSize:12, color:C.expense, textAlign:"center" }}>{err}</div>}

        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:18 }}>
          {PAD.map((k,i)=>(
            <button key={i} onClick={()=>tap(k)}
              style={{ height:58, borderRadius:14, background:k?C.card:"transparent", border:k?`1px solid ${C.border}`:"none", color:C.text, fontSize:k==="⌫"?20:22, fontWeight:600, cursor:k?"pointer":"default", fontFamily:"'JetBrains Mono',monospace" }}>
              {k}
            </button>
          ))}
        </div>

        <button onClick={next} disabled={!canProceed}
          style={{ width:"100%", padding:13, marginBottom:10, background:!canProceed?C.border:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:13, color:"#fff", fontSize:15, fontWeight:700, cursor:!canProceed?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <Ic n="check" s={17} c="#fff"/>{step==="enter"?t("Dalje"):t("Spremi PIN")}
        </button>

        {!isChange && (
          <button onClick={onSkip}
            style={{ width:"100%", padding:11, background:"transparent", border:`1px solid ${C.border}`, borderRadius:13, color:C.textMuted, fontSize:14, cursor:"pointer" }}>
            {t("Preskoči zaštitu")}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── OnboardingScreen ────────────────────────────────────────────────────────
function OnboardingScreen({ C, prefs, updPrefs, user, updUser, lists, updLists, updSec, finish, onSetPin, t }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(user.firstName || "");
  const [theme, setTheme] = useState(prefs.theme || "auto");
  
  const [recName, setRecName] = useState("Kredit / Stanarina");
  const [recAmt, setRecAmt]   = useState("");

  const fld = { width:"100%", height:46, padding:"0 12px", background:C.cardAlt, border:`1.5px solid ${C.border}`, borderRadius:12, color:C.text, fontSize:14, marginBottom:16 };
  const lbl = { fontSize:11, fontWeight:600, color:C.textMuted, marginBottom:6, display:"block", textTransform:"uppercase", letterSpacing:.5 };

  const next1 = () => {
    updUser({ firstName: name });
    updPrefs({ theme: theme });
    setStep(2);
  };

  const next2 = () => {
    if (parseFloat(recAmt) > 0) {
       updLists({...lists, recurring: [...(lists.recurring||[]), {
         id: Date.now().toString(), description: recName || t("Obveze"), amount: parseFloat(recAmt),
         category: "Režije", dueDate: "1", totalPayments: 0, endDate: "", location: "", payment: ""
       }]});
    }
    setStep(3);
  };

  if (step === 3) {
    return (
      <div className="fi" style={{ position:"relative" }}>
        <div style={{ position:"absolute", top:30, left:0, width:"100%", display:"flex", justifyContent:"center", gap:6 }}>
            {[1,2,3].map(i => <div key={i} style={{ width: i===step ? 24 : 8, height: 6, borderRadius:4, background: i===step ? C.accent : C.border, transition:"all .3s" }}/>)}
        </div>
        <SetupPin C={C} isChange={false} t={t}
          onSave={pin => { onSetPin ? onSetPin(pin) : finish(); }}
          onSkip={finish} 
        />
      </div>
    );
  }

  return (
    <div className="su" style={{ width:"100%", minHeight:"100vh", background:"inherit", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 16px" }}>
      <div style={{ width:"100%", maxWidth:340 }}>
        
        <div style={{ display:"flex", gap:6, justifyContent:"center", marginBottom:32 }}>
          {[1,2,3].map(i => <div key={i} style={{ width: i===step ? 24 : 8, height: 6, borderRadius:4, background: i===step ? C.accent : C.border, transition:"all .3s" }}/>)}
        </div>

        {step === 1 && (
          <div className="fi">
            <div style={{ textAlign:"center", marginBottom:28 }}>
              <div style={{ width:64, height:64, borderRadius:20, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", boxShadow:`0 4px 15px ${C.accentGlow}` }}>
                <Ic n="wallet" s={30} c="#fff"/>
              </div>
              <h2 style={{ fontSize:24, fontWeight:700, color:C.text }}>{t("Dobrodošli!")}</h2>
              <p style={{ fontSize:14, color:C.textMuted, marginTop:6 }}>{t("Ajmo brzo podesiti vašu aplikaciju.")}</p>
            </div>

            <div style={{ background:C.card, padding:20, borderRadius:16, border:`1px solid ${C.border}` }}>
              <label style={lbl}>{t("Jezik")} / Language</label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
                {[["hr","Hrvatski"],["en","English"]].map(([id,lb])=>{
                  const a = (prefs.lang || "hr") === id;
                  return <button key={id} onClick={()=>updPrefs({lang:id})} style={{ padding:"12px 6px", borderRadius:12, border:`1.5px solid ${a?C.accent:C.border}`, background:a?`${C.accent}15`:"transparent", color:a?C.accent:C.textMuted, fontSize:13, fontWeight:a?700:500, cursor:"pointer" }}>{lb}</button>;
                })}
              </div>

              <label style={lbl}>{t("Kako se zovete?")}</label>
              <input type="text" placeholder={t("Vaše ime")} value={name} onChange={e=>setName(e.target.value)} style={fld}/>

              <label style={lbl}>{t("Tema aplikacije")}</label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                {[["dark","moon",t("Tamni")],["light","sun",t("Svijetli")],["auto","auto",t("Auto")]].map(([id,ic,lb])=>(
                  <button key={id} onClick={()=>setTheme(id)} style={{ padding:"12px 6px", borderRadius:12, border:`1.5px solid ${theme===id?C.accent:C.border}`, background:theme===id?`${C.accent}15`:"transparent", color:theme===id?C.accent:C.textMuted, fontSize:12, fontWeight:theme===id?700:500, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                    <Ic n={ic} s={18} c={theme===id?C.accent:C.textMuted}/>{lb}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={next1} style={{ width:"100%", padding:14, marginTop:24, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:14, color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {t("Dalje")} <Ic n="arrow_l" s={16} c="#fff" style={{ transform:"rotate(180deg)" }}/>
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="su">
            <div style={{ textAlign:"center", marginBottom:28 }}>
              <div style={{ width:64, height:64, borderRadius:20, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", boxShadow:`0 4px 15px ${C.accentGlow}` }}>
                <Ic n="home" s={30} c="#fff"/>
              </div>
              <h2 style={{ fontSize:22, fontWeight:700, color:C.text }}>{t("Glavna obveza")}</h2>
              <p style={{ fontSize:13, color:C.textMuted, marginTop:6, lineHeight:1.5 }}>{t("Unesite svoj najveći mjesečni trošak kako bi vas aplikacija automatski podsjećala na njega.")}</p>
            </div>

            <div style={{ background:C.card, padding:20, borderRadius:16, border:`1px solid ${C.border}` }}>
              <label style={lbl}>{t("Naziv troška")}</label>
              <input type="text" placeholder={t("Npr. Stanarina")} value={recName} onChange={e=>setRecName(e.target.value)} style={fld}/>

              <label style={lbl}>{t("Iznos (€)")}</label>
              <input type="number" step="0.01" placeholder="0,00" value={recAmt} onChange={e=>setRecAmt(e.target.value)} style={{...fld, fontFamily:"'JetBrains Mono',monospace", fontWeight:600, marginBottom:0}}/>
            </div>

            <button onClick={next2} style={{ width:"100%", padding:14, marginTop:24, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:14, color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {t("Dalje")} <Ic n="arrow_l" s={16} c="#fff" style={{ transform:"rotate(180deg)" }}/>
            </button>
            <button onClick={()=>{ setRecAmt(""); next2(); }} style={{ width:"100%", padding:12, marginTop:8, background:"transparent", border:"none", color:C.textMuted, fontSize:14, fontWeight:600, cursor:"pointer" }}>
              {t("Preskoči ovaj korak")}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}


export { LockScreen, SetupPin, OnboardingScreen };
