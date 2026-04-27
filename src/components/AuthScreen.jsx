import { useState } from 'react';
import { signIn, signUp, signInGoogle } from '../lib/supabase.js';
import { Ic } from './ui.jsx';

export default function AuthScreen({ C, t, lang, onLangChange, onSuccess }) {
  const [mode, setMode]       = useState('login'); // 'login' | 'register'
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]       = useState('');
  const [err, setErr]         = useState('');
  const [busy, setBusy]       = useState(false);
  const [done, setDone]       = useState(false); // registration confirmation

  const fld = {
    width: '100%', padding: '12px 14px',
    background: C.cardAlt, border: `1.5px solid ${C.border}`,
    borderRadius: 12, color: C.text, fontSize: 14,
    marginBottom: 10, boxSizing: 'border-box',
  };

  const handleSubmit = async () => {
    setErr('');
    if (!email.trim() || !password.trim()) {
      setErr(t('Unesite email i lozinku')); return;
    }
    if (password.length < 6) {
      setErr(t('Lozinka mora imati najmanje 6 znakova')); return;
    }
    setBusy(true);
    try {
      if (mode === 'register') {
        const { error } = await signUp(email.trim(), password);
        if (error) throw error;
        setDone(true);
      } else {
        const { data, error } = await signIn(email.trim(), password);
        if (error) throw error;
        onSuccess(data.session);
      }
    } catch (e) {
      setErr(e.message || t('Greška pri prijavi'));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const { error } = await signInGoogle();
      if (error) throw error;
      // Google OAuth redirects — onAuthStateChange handles the session
    } catch (e) {
      setErr(e.message || t('Greška pri Google prijavi'));
      setBusy(false);
    }
  };

  if (done) return (
    <div style={{ width:'100%', minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ textAlign:'center', maxWidth:320 }}>
        <div style={{ width:64, height:64, borderRadius:20, background:`${C.income}20`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <Ic n="mail" s={30} c={C.income}/>
        </div>
        <h2 style={{ fontSize:20, fontWeight:700, color:C.text, marginBottom:8 }}>
          {t('Provjeri email!')}
        </h2>
        <p style={{ fontSize:14, color:C.textMuted, lineHeight:1.6 }}>
          {t('Poslali smo link za potvrdu na')} <b style={{color:C.text}}>{email}</b>.
          {t(' Klikni na link pa se prijavi.')}
        </p>
        <button onClick={()=>{ setDone(false); setMode('login'); }}
          style={{ marginTop:20, padding:'12px 24px', background:C.accent, border:'none', borderRadius:12, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
          {t('Natrag na prijavu')}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ width:'100%', minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:360 }}>

        {/* Discrete language toggle — top right */}
        {onLangChange && (
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
            <button onClick={()=>onLangChange(lang==='hr'?'en':'hr')}
              style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:10, padding:'5px 10px', fontSize:11, fontWeight:600, color:C.textMuted, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
              {lang==='hr'?'🇬🇧 EN':'🇭🇷 HR'}
            </button>
          </div>
        )}

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:64, height:64, borderRadius:20, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', boxShadow:`0 4px 15px ${C.accentGlow}` }}>
            <Ic n="wallet" s={30} c="#fff"/>
          </div>
          <h1 style={{ fontSize:24, fontWeight:700, color:C.text }}>Moja lova</h1>
          <p style={{ fontSize:13, color:C.textMuted, marginTop:4 }}>
            {mode==='login' ? t('Prijava u račun') : t('Kreiranje računa')}
          </p>
        </div>

        {/* Google button */}
        <button onClick={handleGoogle} disabled={busy}
          style={{ width:'100%', padding:'13px 16px', background:C.card, border:`1.5px solid ${C.border}`, borderRadius:13, color:C.text, fontSize:14, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:16 }}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>
          {t('Nastavi s Google računom')}
        </button>

        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <div style={{ flex:1, height:1, background:C.border }}/>
          <span style={{ fontSize:12, color:C.textMuted }}>{t('ili')}</span>
          <div style={{ flex:1, height:1, background:C.border }}/>
        </div>

        {/* Email/password form */}
        {mode === 'register' && (
          <input type="text" placeholder={t('Ime i prezime')} value={name}
            onChange={e=>setName(e.target.value)} style={fld}/>
        )}
        <input type="email" placeholder={t('Email adresa')} value={email}
          onChange={e=>setEmail(e.target.value)} style={fld}
          onKeyDown={e=>e.key==='Enter'&&handleSubmit()}/>
        <input type="password" placeholder={t('Lozinka (min. 6 znakova)')} value={password}
          onChange={e=>setPassword(e.target.value)} style={fld}
          onKeyDown={e=>e.key==='Enter'&&handleSubmit()}/>

        {err && (
          <div style={{ background:`${C.expense}15`, border:`1px solid ${C.expense}40`, borderRadius:10, padding:'10px 14px', marginBottom:12, fontSize:13, color:C.expense }}>
            {err}
          </div>
        )}

        <button onClick={handleSubmit} disabled={busy}
          style={{ width:'100%', padding:14, background:busy?C.border:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:'none', borderRadius:13, color:'#fff', fontSize:15, fontWeight:700, cursor:busy?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:12 }}>
          {busy
            ? <><span style={{width:16,height:16,borderRadius:'50%',border:'2px solid #fff',borderTopColor:'transparent',display:'inline-block',animation:'spin .7s linear infinite'}}/>{t('Učitavanje…')}</>
            : mode==='login' ? t('Prijava') : t('Registracija')
          }
        </button>

        <button onClick={()=>{ setMode(m=>m==='login'?'register':'login'); setErr(''); }}
          style={{ width:'100%', padding:11, background:'transparent', border:`1px solid ${C.border}`, borderRadius:13, color:C.textMuted, fontSize:13, cursor:'pointer' }}>
          {mode==='login'
            ? t('Nemaš račun? Registriraj se')
            : t('Već imaš račun? Prijavi se')
          }
        </button>

        <p style={{ textAlign:'center', fontSize:11, color:C.textMuted, marginTop:20, lineHeight:1.5 }}>
          {t('Nastavkom prihvaćaš')} <span style={{color:C.accent}}>{t('uvjete korištenja')}</span> {t('i')} <span style={{color:C.accent}}>{t('politiku privatnosti')}</span>.
        </p>

      </div>
    </div>
  );
}
