import { useState, useEffect, useMemo, useRef } from 'react';
import { K, DEF_LISTS, T, MONTHS, MONTHS_EN, MSHORT, MSHORT_EN, MAX_ATT, BACKUP_SNOOZE_MS, CURRENCIES, TIMEZONES } from '../../lib/constants.js';
import { fmtEur, fDate, load, save, curYear, buildCSV, buildSummary, nativeSaveAndShare, isCapacitor } from '../../lib/helpers.js';
import { hashPinV2, hashPinLegacy } from '../../lib/crypto.js';
import { Ic, LynxLogo, LynxLogoWhite, StickyHeader } from '../ui.jsx';
import { SetupPin } from '../auth.jsx';

function AboutScreen({ C, onBack, t, lang }) {
  const [section, setSection] = useState(null); // null = menu, string = content

  const sections = [
    { id:"help",        icon:"info",   label:t("Pomoć") },
    { id:"licences",    icon:"lock",   label:t("Licencni uvjeti") },
    { id:"disclaimer",  icon:"alert",  label:t("Odricanje odgovornosti") },
    { id:"privacy",     icon:"lock",   label:t("Privatnost i kolačići") },
    { id:"contact",     icon:"mail",   label:t("Kontaktiraj nas") },
    { id:"feedback",    icon:"zap",    label:t("Pošalji povratnu informaciju") },
    { id:"diagnostics", icon:"bar",    label:t("Dijagnostika") },
  ];

  const content = {
    help: {
      title: t("Pomoć"),
      body: lang === "en" ? `
GETTING STARTED
Open the app at moneylynx.net. Sign in with Google or email/password. After login, data syncs automatically across all your devices in real time.

ADDING TRANSACTIONS
Tap the blue + button at the bottom. Required fields: Amount and Description. Optional fields (auto-filled as "Other" if empty): Category and Location. Default payment: Cash. Default status: Paid.

TRANSACTION TYPES
• Expense: a payment or cost
• Income: money received (salary, transfer…)
• Recurring obligation: monthly repeating expense. Enable "Recurring obligation?" in the Expense form.
• Installments: purchase spread over months. Each installment appears in its own due month in Statistics.

HOME SCREEN
Shows yearly balance, monthly income/expenses, top spending categories and "To pay this month" — all unpaid obligations including overdue from past months. Tap Pay to mark as paid instantly.

TRANSACTIONS SCREEN
Opens on "Overdue" filter (all unpaid with past due date). Each filter has its own left border color. A red "Duplicate?" badge appears if two transactions share the same amount, date and description. Search works on description, category, location and notes.

STATISTICS
Opens on the current month. Periods: month / year / all time. Tabs: Expected, Categories, Overview/Balance, Payments & Locations, 3yr Trend. Installments shown in their due month — not all at once.

SETTINGS
• Active Year — switch year for analysis
• Manage Obligations — edit/delete recurring obligations
• List Customization — add your own categories, locations, payment methods, budget limits
• Currency — select display currency (EUR, USD, HRK, GBP, CHF, BAM, RSD, HUF, CZK, PLN)
• Time zone — select your time zone (Europe, Americas, Asia, Australia)
• Account — sign out, manual "Sync to cloud" button

CLOUD SYNC
Green dot = synced. Yellow dot = syncing. Real-time: changes on one device appear instantly on others. Works offline — syncs on reconnection.

BACKUP & RESTORE
Export: Settings → Account → Export (Backup). Import: Settings → Account → Import (Restore). Cloud users are protected automatically.

PIN & BIOMETRICS
Set a 4-6 digit PIN in Settings → Security. After 5 wrong attempts: locked 30s. After 10: all data wiped. Biometrics: first session requires PIN once, then fingerprint/Face ID works independently.

MINIMIZE BEHAVIOR
After minimizing and reopening, the app always returns to the Home screen.
`.trim() : `
POČETAK RADA
Otvori aplikaciju na moneylynx.net. Prijavi se Google računom ili emailom/lozinkom. Nakon prijave, podaci se automatski sinkroniziraju između svih uređaja u stvarnom vremenu.

UNOS TRANSAKCIJA
Pritisni plavi + gumb na dnu. Obavezna polja: Iznos i Opis. Opcionalna polja (automatski "Ostalo" ako su prazna): Kategorija i Lokacija. Zadano plaćanje: Gotovina. Zadani status: Plaćeno.

VRSTE TRANSAKCIJA
• Isplata: plaćanje ili trošak
• Primitak: primljeni novac (plaća, uplata…)
• Redovna obveza: trošak koji se ponavlja svaki mjesec. Uključi "Redovna obveza?" u formi za Isplatu.
• Obročna otplata: kupnja raspoređena na više mjeseci. Svaki obrok se prikazuje u svom mjesecu dospijeća u Statistici.

POČETNI EKRAN
Prikazuje godišnju bilancu, primike/troškove za tekući mjesec, top kategorije i "Za platiti ovog mjeseca" — sve neplaćene obveze uključujući dospjele iz prošlih mjeseci. Pritisni Plati za trenutnu oznaku.

EKRAN TRANSAKCIJE
Otvara se na filteru "Dospjelo" (sve neplaćeno s prošlim datumom). Svaki filter ima svoju boju lijevog ruba kartice. Crvena oznaka "Duplikat?" upozorava ako dvije transakcije imaju isti iznos, datum i opis. Pretraga radi po opisu, kategoriji, lokaciji i napomenama.

STATISTIKA
Otvara se na tekućem mjesecu. Periodi: mjesec / godina / sve. Tabovi: Očekivano, Kategorije, Pregled/Saldo, Plaćanje/Lokacije, Trend 3g. Rate se prikazuju u svom mjesecu dospijeća — ne sve odjednom.

POSTAVKE
• Aktivna godina — prebaci godinu za analizu
• Upravljaj obvezama — uredi/obriši redovne obveze
• Prilagodba popisa — vlastite kategorije, lokacije, načini plaćanja, budžet limiti
• Valuta — odaberi valutu prikaza (EUR, USD, HRK, GBP, CHF, BAM, RSD, HUF, CZK, PLN)
• Vremenska zona — odaberi svoju vremensku zonu (Europa, Amerika, Azija, Australija)
• Račun — odjava, gumb "Sinkroniziraj s oblakom"

CLOUD SINKRONIZACIJA
Zelena točkica = sinkronizirano. Žuta točkica = sinkronizacija u tijeku. Realtime: promjene na jednom uređaju odmah vidljive na drugom. Radi offline — sinkronizira pri povratku konekcije.

BACKUP I VRAĆANJE
Izvozi: Postavke → Račun → Izvezi (Backup). Uvezi: Postavke → Račun → Učitaj (Restore). Cloud korisnici su automatski zaštićeni.

PIN I BIOMETRIJA
Postavi 4-6 znamenkasti PIN u Postavke → Sigurnost. Nakon 5 krivih: zaključano 30s. Nakon 10 krivih: svi podaci se brišu. Biometrija: prva sesija uvijek traži PIN jednom, zatim otisak prsta/lice radi samostalno.

PONAŠANJE PRI MINIMIZIRANJU
Nakon minimiziranja i ponovnog otvaranja, aplikacija uvijek vraća na Početni ekran.
`.trim()
    },
    licences: {
      title: t("Licencni uvjeti"),
      body: `Money Lynx — Licencni uvjeti / Licence Terms

© 2024–2026 Money Lynx. Sva prava pridržana.
All rights reserved.

UVJETI KORIŠTENJA (HR)
Ova aplikacija licencirana je isključivo za osobnu, nekomercijalnu upotrebu. Zabranjeno je: redistribuirati, prodavati, mijenjati ili koristiti kod, dizajn ili sadržaj ove aplikacije u komercijalne svrhe bez pisanog dopuštenja autora.

Korištenjem ove aplikacije prihvaćate ove uvjete, Odricanje odgovornosti te Politiku privatnosti i kolačića.

TERMS OF USE (EN)
This application is licensed for personal, non-commercial use only. Redistribution, sale, modification, or commercial use of the code, design, or content of this application without the author's written permission is prohibited.

By using this application you accept these terms, the Disclaimer, and the Privacy & Cookies Policy.

KOMPONENTE OTVORENOG KODA / OPEN SOURCE COMPONENTS
Ova aplikacija koristi sljedeće open-source biblioteke:

• React 18.2 — MIT License — facebook/react
• Recharts 2.12 — MIT License — recharts/recharts
• Vite 5 — MIT License — vitejs/vite
• Capacitor 8 — MIT License — ionic-team/capacitor
• Supabase JS 2.x — MIT License — supabase/supabase-js

HOSTING I USLUGE / HOSTING & SERVICES
• Web hosting: Vercel (vercel.com)
• Baza podataka i autentifikacija: Supabase (supabase.com)
• OAuth: Google Sign-In

Pune tekstove licenci za ove biblioteke možete pronaći na:
Full license texts available at: https://opensource.org/licenses/MIT`
    },
    disclaimer: {
      title: t("Odricanje odgovornosti"),
      body: lang === "en" ? `DISCLAIMER

Money Lynx is provided "as is" without warranty of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.

FINANCIAL DECISIONS
This app is a personal budgeting tool only. It does not provide financial, investment, tax, or legal advice. All financial decisions made based on data entered into this app are the sole responsibility of the user. The author is not liable for any financial loss or damage arising from the use of this application.

DATA & SECURITY
• Local data is encrypted with AES-256 when PIN protection is enabled
• Cloud data is stored on Supabase servers secured with Row Level Security (RLS) — each user can only access their own data
• PIN hashes use PBKDF2 (SHA-256) and are never transmitted to any server
• The author is not responsible for data loss resulting from: device failure, forgotten PIN without cloud backup, accidental deletion, browser cache clearing, or third-party service outages
• Users are strongly advised to enable cloud sync (sign in with Google or email) for automatic backup

CLOUD SYNC & AVAILABILITY
• Real-time sync requires an active internet connection
• The author does not guarantee continuous availability of the service
• Data may be temporarily unavailable during maintenance or third-party outages (Supabase, Vercel)
• Offline mode preserves local data; sync resumes automatically when connection returns

CURRENCY & CALCULATIONS
• Currency display is for presentation purposes only and does not perform real-time conversion
• All calculations are based on user-entered amounts in their selected currency
• The accuracy of all outputs depends entirely on the accuracy of the data entered` :
`ODRICANJE ODGOVORNOSTI

Aplikacija Money Lynx pruža se "kakva jest" bez ikakvih izričitih ili implicitnih jamstava, uključujući, ali ne ograničavajući se na jamstva prodajnosti, prikladnosti za određenu svrhu ili nekršenja prava.

FINANCIJSKE ODLUKE
Ova aplikacija je isključivo alat za osobno budžetiranje. Ne pruža financijske, investicijske, porezne niti pravne savjete. Sve financijske odluke donesene na temelju podataka unesenih u aplikaciju isključiva su odgovornost korisnika. Autor nije odgovoran za financijske gubitke ili štete nastale korištenjem aplikacije.

PODACI I SIGURNOST
• Lokalni podaci su enkriptirani AES-256 algoritmom kada je PIN zaštita uključena
• Cloud podaci pohranjeni su na Supabase poslužiteljima zaštićenim Row Level Security (RLS) — svaki korisnik može pristupiti samo svojim podacima
• PIN hash koristi PBKDF2 (SHA-256) i nikad se ne prenosi na server
• Autor nije odgovoran za gubitak podataka uslijed: kvara uređaja, zaboravljenog PIN-a bez cloud backupa, slučajnog brisanja, brisanja predmemorije preglednika ili zastoja usluga trećih strana
• Korisnicima se snažno preporuča omogućiti cloud sinkronizaciju (prijava Google ili email računom) za automatski backup

CLOUD SINKRONIZACIJA I DOSTUPNOST
• Sinkronizacija u stvarnom vremenu zahtijeva aktivnu internetsku vezu
• Autor ne jamči neprekidnu dostupnost usluge
• Podaci mogu biti privremeno nedostupni tijekom održavanja ili zastoja trećih strana (Supabase, Vercel)
• Offline rad čuva lokalne podatke; sinkronizacija se automatski nastavlja pri povratku veze

VALUTE I IZRAČUNI
• Prikaz valute služi isključivo u prezentacijske svrhe i ne vrši konverziju u stvarnom vremenu
• Svi izračuni temelje se na korisnikovim unesenim iznosima u odabranoj valuti
• Točnost svih rezultata u potpunosti ovisi o točnosti unesenih podataka`
    },
    privacy: {
      title: t("Privatnost i kolačići"),
      body: lang === "en" ? `PRIVACY & COOKIES POLICY
Last updated: April 2026

DATA STORAGE
Money Lynx stores data in two ways depending on your usage:

1. LOCAL STORAGE (without account)
All data is stored exclusively on your device using browser localStorage. No data is sent to any server. If you clear browser data or switch devices, your data will be lost unless you manually exported a backup.

2. CLOUD STORAGE (with account)
When you sign in with Google or email/password, your data is stored on Supabase servers (supabase.com) in addition to your device. This enables:
• Real-time sync between your devices
• Automatic backup of all transactions, lists and preferences
• Account recovery if you lose your device or forget your PIN

DATA COLLECTED WHEN SIGNED IN
• Email address (from Google OAuth or manual registration)
• Display name (from Google profile or manually entered)
• Transaction data you enter (amounts, descriptions, categories, dates)
• App preferences (theme, language, currency, timezone)

Data is protected by Row Level Security (RLS) — only you can access your data. The developer cannot view individual user data.

AUTHENTICATION
• Google Sign-In: handled by Supabase Auth using OAuth 2.0 with PKCE flow. Your Google password is never shared with the app.
• Email/password: passwords are hashed by Supabase using bcrypt. The app never sees or stores your raw password.

ENCRYPTION
When PIN protection is enabled:
• Local data is encrypted with AES-256-GCM
• The encryption key is derived from your PIN using PBKDF2 (100,000 iterations, SHA-256)
• PIN hash and encryption salt are stored locally and never transmitted

COOKIES
The web version does not use tracking, advertising, or analytics cookies. The app uses:
• localStorage — for app data and preferences
• sessionStorage — for temporary session encryption keys
• Supabase auth tokens — stored in localStorage for session persistence

THIRD-PARTY SERVICES
• Supabase (supabase.com) — database, authentication, real-time sync
• Vercel (vercel.com) — web hosting
• Google (accounts.google.com) — OAuth sign-in
• Google Fonts (fonts.googleapis.com) — font loading

These services may collect standard access logs (IP address, browser type). Please refer to their respective privacy policies.

YOUR RIGHTS (GDPR)
You can:
• Export all your data at any time (Settings → Backup)
• Delete your cloud data by signing out and requesting deletion
• Delete your local data by clearing browser storage
• Use the app without an account (local-only mode)

For data deletion requests: see "Contact us" section.

CONTACT
For privacy-related questions: info@moneylynx.net` :
`POLITIKA PRIVATNOSTI I KOLAČIĆA
Posljednje ažuriranje: travanj 2026.

POHRANA PODATAKA
Money Lynx pohranjuje podatke na dva načina ovisno o vašem korištenju:

1. LOKALNA POHRANA (bez računa)
Svi podaci pohranjuju se isključivo na vašem uređaju putem browser localStorage-a. Nikakvi podaci ne šalju se na server. Ako obrišete podatke preglednika ili promijenite uređaj, podaci će biti izgubljeni osim ako ste ručno izvezli backup.

2. CLOUD POHRANA (s računom)
Kad se prijavite Google ili email/lozinka računom, vaši podaci pohranjuju se i na Supabase poslužiteljima (supabase.com). To omogućuje:
• Sinkronizaciju u stvarnom vremenu između uređaja
• Automatski backup svih transakcija, popisa i postavki
• Oporavak računa ako izgubite uređaj ili zaboravite PIN

PODACI KOJI SE PRIKUPLJAJU PRI PRIJAVI
• Email adresa (iz Google OAuth-a ili ručne registracije)
• Ime (iz Google profila ili ručno uneseno)
• Podaci o transakcijama koje unosite (iznosi, opisi, kategorije, datumi)
• Postavke aplikacije (tema, jezik, valuta, vremenska zona)

Podaci su zaštićeni Row Level Security (RLS) — samo vi možete pristupiti svojim podacima. Programer ne može pregledavati pojedinačne korisničke podatke.

AUTENTIFIKACIJA
• Google prijava: obrađuje Supabase Auth koristeći OAuth 2.0 s PKCE protokolom. Vaša Google lozinka nikad se ne dijeli s aplikacijom.
• Email/lozinka: lozinke hashira Supabase koristeći bcrypt. Aplikacija nikad ne vidi niti pohranjuje vašu lozinku u izvornom obliku.

ENKRIPCIJA
Kada je PIN zaštita uključena:
• Lokalni podaci enkriptirani su AES-256-GCM algoritmom
• Ključ za enkripciju derivira se iz PIN-a koristeći PBKDF2 (100.000 iteracija, SHA-256)
• PIN hash i salt za enkripciju pohranjuju se lokalno i nikad se ne prenose

KOLAČIĆI
Web verzija ne koristi kolačiće za praćenje, oglašavanje niti analitiku. Aplikacija koristi:
• localStorage — za podatke i postavke aplikacije
• sessionStorage — za privremene ključeve sesijske enkripcije
• Supabase auth tokene — pohranjene u localStorage za trajnost sesije

USLUGE TREĆIH STRANA
• Supabase (supabase.com) — baza podataka, autentifikacija, sinkronizacija
• Vercel (vercel.com) — web hosting
• Google (accounts.google.com) — OAuth prijava
• Google Fonts (fonts.googleapis.com) — učitavanje fontova

Ove usluge mogu prikupljati standardne pristupne zapise (IP adresa, vrsta preglednika). Molimo pogledajte njihove politike privatnosti.

VAŠA PRAVA (GDPR)
Možete:
• Izvesti sve podatke u bilo kojem trenutku (Postavke → Backup)
• Obrisati cloud podatke odjavom i zahtjevom za brisanje
• Obrisati lokalne podatke brisanjem pohrane preglednika
• Koristiti aplikaciju bez računa (samo lokalni način)

Za zahtjeve za brisanje podataka: pogledajte sekciju "Kontaktiraj nas".

KONTAKT
Za pitanja o privatnosti: info@moneylynx.net`
    },
    contact: {
      title: t("Kontaktiraj nas"),
      body: `Money Lynx — v.4

${lang === "en" ? "Web" : "Web"}: moneylynx.net
E-mail: info@moneylynx.net

${lang === "en" ? "For questions, suggestions or bug reports:" : "Za pitanja, prijedloge ili prijavu grešaka:"}

${lang === "en" ? "When reporting a bug, please include:" : "Kod prijave greške, navedite:"}
${lang === "en" ? "• App version (see Diagnostics)" : "• Verziju aplikacije (vidi Dijagnostika)"}
${lang === "en" ? "• Device and OS version" : "• Uređaj i verziju OS-a"}
${lang === "en" ? "• Steps to reproduce the issue" : "• Korake koji reproduciraju problem"}
${lang === "en" ? "• Screenshot if possible" : "• Screenshot ako je moguće"}`
    },
    feedback: {
      title: t("Pošalji povratnu informaciju"),
      body: lang === "en" ? `SEND FEEDBACK

We appreciate your feedback! It helps improve the app for everyone.

Ways to provide feedback:

• GitHub Issues — for bug reports and feature requests:
  moneylynx.net

• Email — info@moneylynx.net

Please describe:
1. What you were trying to do
2. What happened instead
3. What you expected to happen
4. Your device, OS and browser version
5. Whether you use cloud sync or local-only mode

Thank you for using Money Lynx!` :
`POŠALJI POVRATNU INFORMACIJU

Hvala na povratnoj informaciji! Pomaže nam poboljšati aplikaciju za sve.

Načini slanja povratnih informacija:

• GitHub Issues — za prijave grešaka i zahtjeve za nove značajke:
  moneylynx.net

• Email — info@moneylynx.net

Molimo opiši:
1. Što si pokušavao napraviti
2. Što se umjesto toga dogodilo
3. Što si očekivao da se dogodi
4. Tvoj uređaj, OS i verziju preglednika
5. Koristiš li cloud sinkronizaciju ili samo lokalni način

Hvala što koristiš Money Lynx!`
    },
    diagnostics: {
      title: t("Dijagnostika"),
      body: [
        `${lang==="en"?"App version":"Verzija aplikacije"}: .4`,
        `${lang==="en"?"Platform":"Platforma"}: ${typeof window !== "undefined" && window.Capacitor && window.Capacitor.isNativePlatform() ? "Android APK" : "Web / PWA"}`,
        `${lang==="en"?"User Agent":"User Agent"}: ${typeof navigator !== "undefined" ? navigator.userAgent : "N/A"}`,
        `${lang==="en"?"Language":"Jezik"}: ${lang === "hr" ? "Hrvatski" : "English"}`,
        `${lang==="en"?"Currency":"Valuta"}: ${(() => { try { const p = JSON.parse(localStorage.getItem("ml_prefs")||"{}"); return p.currency || "EUR"; } catch { return "EUR"; } })()}`,
        `${lang==="en"?"Timezone":"Vremenska zona"}: ${(() => { try { const p = JSON.parse(localStorage.getItem("ml_prefs")||"{}"); return p.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "N/A"; } })()}`,
        `${lang==="en"?"Screen":"Zaslon"}: ${typeof window !== "undefined" ? `${window.screen.width}×${window.screen.height}` : "N/A"}`,
        `${lang==="en"?"Online":"Online"}: ${typeof navigator !== "undefined" ? (navigator.onLine ? (lang==="en"?"Yes":"Da") : (lang==="en"?"No":"Ne")) : "N/A"}`,
        `${lang==="en"?"Cloud sync":"Cloud sinkronizacija"}: ${(() => { try { const s = localStorage.getItem("sb-sbmxktenegwjfhgondzi-auth-token"); return s ? (lang==="en"?"Active":"Aktivna") : (lang==="en"?"Not signed in":"Nije prijavljen"); } catch { return "N/A"; } })()}`,
        `${lang==="en"?"PIN protection":"PIN zaštita"}: ${(() => { try { const s = JSON.parse(localStorage.getItem("ml_sec")||"{}"); return s.pinHash ? (lang==="en"?"Enabled":"Uključena") : (lang==="en"?"Disabled":"Isključena"); } catch { return "N/A"; } })()}`,
        `${lang==="en"?"Biometrics":"Biometrija"}: ${(() => { try { const s = JSON.parse(localStorage.getItem("ml_sec")||"{}"); return s.bioEnabled ? (lang==="en"?"Enabled":"Uključena") : (lang==="en"?"Disabled":"Isključena"); } catch { return "N/A"; } })()}`,
        `${lang==="en"?"Service Worker":"Service Worker"}: ${"serviceWorker" in navigator ? (lang==="en"?"Supported":"Podržan") : (lang==="en"?"Not supported":"Nije podržan")}`,
        `${lang==="en"?"Storage available":"Pohrana dostupna"}: ${(() => { try { const t = "ml_test"; localStorage.setItem(t,"1"); localStorage.removeItem(t); return lang==="en"?"Yes":"Da"; } catch { return lang==="en"?"No":"Ne"; }})()}`,
        `${lang==="en"?"Transactions":"Transakcije"}: ${(() => { try { const d = JSON.parse(localStorage.getItem("ml_db")||"[]"); return d.length; } catch { return "N/A"; } })()}`,
      ].join("\n")
    },
  };

  const item = section ? content[section] : null;

  return (
    <div className="fi" style={{ width:"100%" }}>
      <StickyHeader C={C} icon="info" title={item ? item.title : t("O aplikaciji")}
        right={<button onClick={item ? ()=>setSection(null) : onBack}
          style={{ background:C.cardAlt, border:`1px solid ${C.border}`, color:C.textMuted, padding:"8px 14px", borderRadius:10, fontSize:13, cursor:"pointer" }}>
          {t("Natrag")}
        </button>}
      />
      <div style={{ padding:"14px 16px 24px" }}>
        {!section ? (
          <>
            <div style={{ background:`linear-gradient(135deg,${C.accent}18,${C.accent}08)`, border:`1px solid ${C.accent}30`, borderRadius:14, padding:"14px 16px", marginBottom:18, display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:44, height:44, borderRadius:14, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <LynxLogoWhite s={22}/>
              </div>
              <div>
                <div style={{ fontSize:17, fontWeight:700, color:C.text }}>Money Lynx</div>
                <div style={{ fontSize:12, color:C.textMuted }}>{t("Verzija")} .4 · © 2026 Money Lynx</div>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {sections.map(s=>(
                <button key={s.id} onClick={()=>setSection(s.id)}
                  style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 15px", background:C.card, border:`1px solid ${C.border}`, borderRadius:13, cursor:"pointer", textAlign:"left" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:9, background:`${C.accent}18`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Ic n={s.icon} s={15} c={C.accent}/>
                    </div>
                    <span style={{ fontSize:14, fontWeight:500, color:C.text }}>{s.label}</span>
                  </div>
                  <Ic n="chevron" s={14} c={C.textMuted} style={{ transform:"rotate(-90deg)" }}/>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:16 }}>
            <pre style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, lineHeight:1.7, color:C.text, whiteSpace:"pre-wrap", wordBreak:"break-word", margin:0 }}>
              {item.body}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export { AboutScreen };
export default AboutScreen;
