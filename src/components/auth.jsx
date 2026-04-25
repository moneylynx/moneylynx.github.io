import { useState, useEffect, useCallback, useRef } from 'react';
import { K, MAX_ATT, LOCK_SEC, WIPE_AT, COUNTRIES, CURRENCIES, TIMEZONES } from '../lib/constants.js';
import { save, currencySymbol } from '../lib/helpers.js';
import { hashPinV2, hashPinLegacy, loadKeyFromSession } from '../lib/crypto.js';
import { Ic } from './ui.jsx';

function LockScreen({ C, sec, onUnlock, onWipe, onResetPin, supaUser, t }) {
  const [pin, setPin]       = useState("");
  const [err, setErr]       = useState("");
  const [tLeft, setTLeft]   = useState(0);
  const [busy, setBusy]     = useState(false);
  const [showRecovery, setShowRecovery] = useState(false); // crypto in progress

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
        // No cached key — biometry verified identity but we need PIN
        // once per session to derive the AES decryption key.
        setErr(t("Biometrija uspješna. Unesi PIN jednom za ovu sesiju."));
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

        {/* Forgot PIN — appears after 2+ attempts */}
        {sec.attempts >= 2 && !showRecovery && (
          <button onClick={()=>setShowRecovery(true)}
            style={{ width:"100%", padding:10, marginTop:8, background:"transparent", border:"none", color:C.accent, fontSize:13, fontWeight:600, cursor:"pointer", textDecoration:"underline" }}>
            {t("Zaboravili ste PIN?")}
          </button>
        )}

        {/* Recovery dialog */}
        {showRecovery && (
          <div style={{ marginTop:12, background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:16 }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:8 }}>{t("Oporavak računa")}</h3>
            {supaUser ? (
              <>
                <p style={{ fontSize:12, color:C.textMuted, lineHeight:1.6, marginBottom:12 }}>
                  {t("Vaši podaci su sigurni u oblaku. Možete resetirati PIN — lokalni enkriptirani podaci će se obrisati i ponovo preuzeti iz oblaka.")}
                </p>
                <button onClick={()=>{ if(onResetPin) onResetPin(); }}
                  style={{ width:"100%", padding:12, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:12, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                  {t("Resetiraj PIN i preuzmi podatke")}
                </button>
              </>
            ) : (
              <p style={{ fontSize:12, color:C.textMuted, lineHeight:1.6 }}>
                {t("PIN se ne može resetirati bez gubitka lokalnih podataka jer štiti enkripciju. Prijavite se s računom za cloud sigurnosnu kopiju.")}
              </p>
            )}
            <button onClick={()=>setShowRecovery(false)}
              style={{ width:"100%", padding:10, marginTop:8, background:"transparent", border:`1px solid ${C.border}`, borderRadius:12, color:C.textMuted, fontSize:12, cursor:"pointer" }}>
              {t("Natrag")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SetupPin ────────────────────────────────────────────────────────────────
function SetupPin({ C, onSave, onSkip, isChange=false, t }) {
  const [step, setStep]             = useState("enter");
  const [enterPin, setEnterPin]     = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [err, setErr]               = useState("");
  const stepRef = useRef("enter");

  // Read current pin values via refs so tap() always has fresh values
  const enterRef  = useRef("");
  const confirmRef = useRef("");
  const setEnterSafe  = v => { enterRef.current  = typeof v === "function" ? v(enterRef.current)  : v; setEnterPin(enterRef.current); };
  const setConfirmSafe = v => { confirmRef.current = typeof v === "function" ? v(confirmRef.current) : v; setConfirmPin(confirmRef.current); };

  const PAD = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  const tap = k => {
    if (!k) return;
    setErr("");
    if (stepRef.current === "enter") {
      if (k === "⌫") setEnterSafe(p => p.slice(0,-1));
      else if (enterRef.current.length < 6) setEnterSafe(p => p + k);
    } else {
      if (k === "⌫") setConfirmSafe(p => p.slice(0,-1));
      else if (confirmRef.current.length < 6) setConfirmSafe(p => p + k);
    }
  };

  const currentPin = step === "enter" ? enterPin : confirmPin;
  const canProceed = currentPin.length >= 4;

  const handleKeyInput = (e) => {
    const last = e.target.value.slice(-1);
    if (/\d/.test(last)) tap(last);
    e.target.value = "";
  };

  const next = () => {
    if (step === "enter") {
      if (enterPin.length < 4) { setErr(t("Minimalno 4 znamenke")); return; }
      setConfirmSafe("");
      stepRef.current = "confirm";
      setStep("confirm");
    } else {
      if (confirmRef.current !== enterRef.current) {
        setErr(t("PIN-ovi se ne poklapaju"));
        setEnterSafe(""); setConfirmSafe("");
        stepRef.current = "enter"; setStep("enter");
      } else {
        onSave(enterRef.current);
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

        {/* Hidden input captures Android soft keyboard */}
        <input type="number" inputMode="numeric" onChange={handleKeyInput}
          style={{ position:"absolute", opacity:0, width:1, height:1, pointerEvents:"none" }}
          tabIndex={-1} aria-hidden="true"/>

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

// ─── LanguageScreen (before auth) ─────────────────────────────────────────────
function LanguageScreen({ C, onSelect }) {
  return (
    <div style={{ width:"100%", minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ width:"100%", maxWidth:340, textAlign:"center" }}>
        <div style={{ width:72, height:72, borderRadius:22, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", boxShadow:`0 4px 15px ${C.accentGlow}` }}>
          <Ic n="wallet" s={34} c="#fff"/>
        </div>
        <h1 style={{ fontSize:28, fontWeight:700, color:C.text, marginBottom:6 }}>Moja lova</h1>
        <p style={{ fontSize:14, color:C.textMuted, marginBottom:32 }}>Odaberite jezik / Choose language</p>

        <button onClick={()=>onSelect("hr")} style={{ width:"100%", padding:16, marginBottom:10, background:C.card, border:`1.5px solid ${C.accent}`, borderRadius:14, color:C.text, fontSize:16, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
          🇭🇷 Hrvatski
        </button>
        <button onClick={()=>onSelect("en")} style={{ width:"100%", padding:16, background:C.card, border:`1.5px solid ${C.border}`, borderRadius:14, color:C.text, fontSize:16, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
          🇬🇧 English
        </button>
      </div>
    </div>
  );
}

// ─── OnboardingScreen ────────────────────────────────────────────────────────
function OnboardingScreen({ C, prefs, updPrefs, user, updUser, lists, updLists, updSec, finish, onSetPin, onAddFirstTx, t }) {
  const TOTAL_STEPS = 4;
  const [step, setStep] = useState(1);
  const [name, setName] = useState(user.firstName || "");
  const [theme, setTheme] = useState(prefs.theme || "auto");

  // Step 2 — country/currency/timezone
  const [country, setCountry] = useState("HR");
  const [currency, setCurrency] = useState(prefs.currency || "EUR");
  const [timezone, setTimezone] = useState(prefs.timezone || "Europe/Zagreb");
  const [recoveryEmail, setRecoveryEmail] = useState(user.email || "");

  // Step 4 — first expense
  const [firstDesc, setFirstDesc] = useState("");
  const [firstAmt, setFirstAmt]   = useState("");

  // Auto-detect timezone from browser on mount
  useEffect(() => {
    try {
      const browserTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (browserTZ) {
        setTimezone(browserTZ);
        const match = COUNTRIES.find(c => c.timezone === browserTZ);
        if (match) {
          setCountry(match.code);
          setCurrency(match.currency);
        }
      }
    } catch { /* fallback to defaults */ }
  }, []);

  const handleCountryChange = (code) => {
    const c = COUNTRIES.find(x => x.code === code);
    if (c) {
      setCountry(code);
      setCurrency(c.currency);
      setTimezone(c.timezone);
    }
  };

  const fld = { width:"100%", height:46, padding:"0 12px", background:C.cardAlt, border:`1.5px solid ${C.border}`, borderRadius:12, color:C.text, fontSize:14, marginBottom:16 };
  const lbl = { fontSize:11, fontWeight:600, color:C.textMuted, marginBottom:6, display:"block", textTransform:"uppercase", letterSpacing:.5 };
  const sel = { ...fld, marginBottom:12 };

  const dots = (
    <div style={{ display:"flex", gap:6, justifyContent:"center", marginBottom:28 }}>
      {Array.from({length:TOTAL_STEPS}).map((_,i) => (
        <div key={i} style={{ width: i+1===step ? 24 : 8, height: 6, borderRadius:4, background: i+1<=step ? C.accent : C.border, transition:"all .3s" }}/>
      ))}
    </div>
  );

  const nextBtn = (onClick, label) => (
    <button onClick={onClick} style={{ width:"100%", padding:14, marginTop:20, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:14, color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
      {label || t("Dalje")} <Ic n="arrow_l" s={16} c="#fff" style={{ transform:"rotate(180deg)" }}/>
    </button>
  );

  const skipBtn = (onClick) => (
    <button onClick={onClick} style={{ width:"100%", padding:12, marginTop:8, background:"transparent", border:"none", color:C.textMuted, fontSize:13, fontWeight:600, cursor:"pointer" }}>
      {t("Preskoči ovaj korak")}
    </button>
  );

  // ─── Step 1: Name + Theme ───────────────────────────────────────────────
  if (step === 1) return (
    <div className="su" style={{ width:"100%", minHeight:"100vh", background:"inherit", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 16px" }}>
      <div style={{ width:"100%", maxWidth:340 }}>
        {dots}
        <div className="fi" style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ width:64, height:64, borderRadius:20, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", boxShadow:`0 4px 15px ${C.accentGlow}` }}>
            <Ic n="wallet" s={30} c="#fff"/>
          </div>
          <h2 style={{ fontSize:24, fontWeight:700, color:C.text }}>{t("Dobrodošli!")}</h2>
          <p style={{ fontSize:14, color:C.textMuted, marginTop:6 }}>{t("Ajmo brzo podesiti vašu aplikaciju.")}</p>
        </div>

        <div style={{ background:C.card, padding:20, borderRadius:16, border:`1px solid ${C.border}` }}>
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

        {nextBtn(() => {
          updUser({ firstName: name });
          updPrefs({ theme });
          setStep(2);
        })}
      </div>
    </div>
  );

  // ─── Step 2: Country / Currency / Timezone ──────────────────────────────
  if (step === 2) {
    const lang = prefs.lang || "hr";
    return (
      <div className="su" style={{ width:"100%", minHeight:"100vh", background:"inherit", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 16px" }}>
        <div style={{ width:"100%", maxWidth:340 }}>
          {dots}
          <div style={{ textAlign:"center", marginBottom:24 }}>
            <div style={{ width:64, height:64, borderRadius:20, background:`linear-gradient(135deg,${C.income},#059669)`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
              <Ic n="pin" s={30} c="#fff"/>
            </div>
            <h2 style={{ fontSize:22, fontWeight:700, color:C.text }}>{t("Vaša lokacija")}</h2>
            <p style={{ fontSize:13, color:C.textMuted, marginTop:6 }}>{t("Automatski smo detektirali vašu lokaciju. Možete promijeniti po potrebi.")}</p>
          </div>

          <div style={{ background:C.card, padding:20, borderRadius:16, border:`1px solid ${C.border}` }}>
            <label style={lbl}>{t("Država")}</label>
            <select value={country} onChange={e=>handleCountryChange(e.target.value)} style={sel}>
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{lang==="en" ? c.nameEN : c.name}</option>
              ))}
            </select>

            <label style={lbl}>{t("Valuta")}</label>
            <select value={currency} onChange={e=>setCurrency(e.target.value)} style={sel}>
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>

            <label style={lbl}>{t("Vremenska zona")}</label>
            <select value={timezone} onChange={e=>setTimezone(e.target.value)} style={{...sel, marginBottom:0}}>
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>

          {nextBtn(() => {
            updPrefs({ currency, timezone, country });
            setStep(3);
          })}
          {skipBtn(() => setStep(3))}
        </div>
      </div>
    );
  }

  // ─── Step 3: PIN + Recovery email ───────────────────────────────────────
  if (step === 3) return (
    <div className="fi" style={{ position:"relative" }}>
      <div style={{ position:"absolute", top:30, left:0, width:"100%", display:"flex", justifyContent:"center", gap:6, zIndex:10 }}>
        {Array.from({length:TOTAL_STEPS}).map((_,i) => (
          <div key={i} style={{ width: i+1===3 ? 24 : 8, height: 6, borderRadius:4, background: i+1<=3 ? C.accent : C.border, transition:"all .3s" }}/>
        ))}
      </div>

      {/* Recovery email input above PIN */}
      <div style={{ position:"absolute", top:60, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:300, zIndex:10, padding:"0 16px" }}>
        <label style={{...lbl, textAlign:"center"}}>{t("E-mail za oporavak (opcionalno)")}</label>
        <input type="email" placeholder={t("Vaš e-mail")} value={recoveryEmail}
          onChange={e=>setRecoveryEmail(e.target.value)}
          style={{ width:"100%", height:40, padding:"0 12px", background:C.cardAlt, border:`1.5px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:13, textAlign:"center" }}/>
      </div>

      <SetupPin C={C} isChange={false} t={t}
        onSave={async pin => {
          if (recoveryEmail.trim()) updUser({ email: recoveryEmail.trim() });
          if (onSetPin) await onSetPin(pin);
          setStep(4);
        }}
        onSkip={() => setStep(4)}
      />
    </div>
  );

  // ─── Step 4: Interactive first expense ──────────────────────────────────
  if (step === 4) {
    const sym = currencySymbol(prefs.currency || currency);
    return (
      <div className="su" style={{ width:"100%", minHeight:"100vh", background:"inherit", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 16px" }}>
        <div style={{ width:"100%", maxWidth:340 }}>
          {dots}
          <div style={{ textAlign:"center", marginBottom:24 }}>
            <div style={{ width:64, height:64, borderRadius:20, background:`linear-gradient(135deg,${C.warning},#F59E0B)`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
              <Ic n="zap" s={30} c="#fff"/>
            </div>
            <h2 style={{ fontSize:22, fontWeight:700, color:C.text }}>{t("Probni unos")}</h2>
            <p style={{ fontSize:13, color:C.textMuted, marginTop:6, lineHeight:1.5 }}>{t("Unesite svoj prvi trošak da vidite kako aplikacija radi. Možete ga obrisati poslije.")}</p>
          </div>

          <div style={{ background:C.card, padding:20, borderRadius:16, border:`1px solid ${C.border}` }}>
            <label style={lbl}>{t("Opis")}</label>
            <input type="text" placeholder={t("Npr. Stanarina")} value={firstDesc} onChange={e=>setFirstDesc(e.target.value)} style={fld}/>

            <label style={lbl}>{t("Iznos")} ({sym})</label>
            <input type="number" step="0.01" placeholder="0,00" value={firstAmt} onChange={e=>setFirstAmt(e.target.value)}
              style={{...fld, fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:18, color:C.warning, marginBottom:0}}/>
          </div>

          {nextBtn(() => {
            if (firstDesc.trim() && parseFloat(firstAmt) > 0 && onAddFirstTx) {
              onAddFirstTx({
                description: firstDesc.trim(),
                amount: parseFloat(firstAmt),
                type: "Isplata", category: "Ostalo", location: "Ostalo",
                payment: "Gotovina", status: "Plaćeno",
                date: new Date().toISOString().split("T")[0],
              });
            }
            finish();
          }, t("Završi postavljanje"))}
          {skipBtn(finish)}
        </div>
      </div>
    );
  }

  return null;
}


export { LockScreen, SetupPin, OnboardingScreen, LanguageScreen };
