import { useState } from 'react';
import { Ic, LynxLogoWhite, StickyHeader } from '../ui.jsx';

const VER = "1.2";
const YEAR = "2026";
const EMAIL = "info.mojalova@moneylynx.net";
const WEB = "moneylynx.net";

function AboutScreen({ C, onBack, t, lang }) {
  const [section, setSection] = useState(null);

  const en = lang === "en";

  const sections = [
    { id: "help",        icon: "info",  label: t("Pomoć") },
    { id: "whats_new",   icon: "zap",   label: en ? "What's New in v1.2" : "Što je novo u v1.2" },
    { id: "licences",    icon: "lock",  label: t("Licencni uvjeti") },
    { id: "disclaimer",  icon: "alert", label: t("Odricanje odgovornosti") },
    { id: "privacy",     icon: "lock",  label: t("Privatnost i kolačići") },
    { id: "contact",     icon: "mail",  label: t("Kontaktiraj nas") },
    { id: "feedback",    icon: "zap",   label: t("Pošalji povratnu informaciju") },
    { id: "diagnostics", icon: "bar",   label: t("Dijagnostika") },
  ];

  const content = {

    // ── Help ────────────────────────────────────────────────────────────────
    help: {
      title: t("Pomoć"),
      body: en ? `
GETTING STARTED
Open the app at ${WEB} or install it from Google Play. Sign in with Google or email/password for cloud sync, or use it without an account — all features work locally offline.

ADDING TRANSACTIONS
Tap the blue + button at the bottom. Required: Amount and Description.
• AI auto-fill: the app learns your habits — type a familiar description (e.g. "Konzum") and it predicts Category, Location, Payment automatically using a built-in AI model trained on your history.
• Quick-fill chips above the form show your most recent entries — tap to fill the form instantly.
• Tap "More options →" for Location, Notes, Installments, Recurring toggle.
• Default: Cash / Paid.

TRANSACTION TYPES
• Expense (Isplata): a payment or cost
• Income (Primitak): money received (salary, transfer…)
• Recurring obligation: monthly repeating expense — enable under More options
• Installments: purchase split over months — each installment shown in its due month in Statistics

HOME SCREEN
1. Balance card — yearly balance. Tap to expand end-of-month forecast.
2. Daily limit widget — your allowed daily spend: ((income − expenses) − planned savings) / days left. Tap 🎯 Savings to set your monthly savings goal.
3. "To pay" widget — unpaid obligations due today or earlier. Tap ✓ to pay instantly.
4. Advisor insights — anomaly alerts + positive confirmation.
5. Top categories — mini progress bars for the current month.

ACTIVE ADVISOR
Projects your end-of-month balance daily:
• Known spend = paid + pending + unpaid recurring obligations
• Estimate = historical daily discretionary rate × remaining days
• Anomaly: category ≥ 40% above same-month average from prior years
• Positive: spending ≥ 10% below same month last year

DAILY SPENDING LIMIT
Formula: A = ((monthly income − monthly expenses) − planned savings) / days remaining
• Green (≥ 20 €/day): on track
• Yellow (0–20 €): caution
• Red (< 0): over budget
Set your monthly savings goal by tapping 🎯 Savings in the widget.

PUSH NOTIFICATIONS (added in v1.1)
The app can send payment reminders for obligations due within 3 days.
Enable in Settings → Notifications → Allow reminders.
Requires notification permission (asked once on first enable).

TRANSACTIONS SCREEN
Filters: All, Paid, Overdue, Pending, Processing, Income.
Search: text + 💰 amount range + 🏷️ category filter.
Bulk mode: tap "Select" → checkboxes → Pay all or Delete all.
Long-press a category icon on a Paid transaction to revert to Pending.

STATISTICS
Periods: month / year / all time.
Tabs: Expected, Categories, Overview/Balance, Payments & Locations, 3yr Trend, Year-on-Year.
Year-on-Year: category comparison vs. last year with bar charts and % change.

SETTINGS
• Active Year — switch analysis year
• Manage Obligations — recurring expenses
• List Customization — categories, locations, payments, budget limits
• Currency — EUR, USD, HRK, GBP, CHF and more
• Google Drive Backup — save/restore to your private Drive folder
• Account — sign out, manual sync

CLOUD SYNC
Green dot = synced · Yellow = syncing. Works offline — syncs on reconnect.

BACKUP & RESTORE
Export: Settings → Backup → Export (JSON).
Import: Settings → Backup → Import (JSON).
The AI model rebuilds automatically after import.

PIN & SECURITY
4–6 digit PIN with AES-256-GCM encryption. After 5 wrong attempts: 30s lockout. After 10: data wipe.
`.trim() : `
POČETAK RADA
Otvori aplikaciju na ${WEB} ili instaliraj s Google Play. Prijavi se za cloud sinkronizaciju, ili koristi bez računa — sve funkcije rade lokalno offline.

UNOS TRANSAKCIJA
Pritisni plavi + gumb na dnu. Obavezno: Iznos i Opis.
• AI auto-fill: aplikacija uči tvoje navike — upisuješ poznati opis (npr. "Konzum") i AI predviđa Kategoriju, Lokaciju i Plaćanje iz tvoje povijesti.
• Čipovi brzog unosa iznad forme prikazuju nedavne unose — tap za trenutno popunjavanje.
• "Više opcija →" za Lokaciju, Napomene, Obroke, Redovnu obvezu.
• Zadano: Gotovina / Plaćeno.

VRSTE TRANSAKCIJA
• Isplata: plaćanje ili trošak
• Primitak: primljeni novac (plaća, uplata…)
• Redovna obveza: ponavljajući trošak — uključi pod Više opcija
• Obročna otplata: kupnja na rate — svaki obrok u svom dospijeću u Statistici

POČETNI EKRAN
1. Kartica Stanje — godišnje stanje. Tap za detalje projekcije kraja mjeseca.
2. Widget Dnevni limit — dopuštena dnevna potrošnja: ((primici − izdaci) − planirana štednja) / preostali dani. Tap 🎯 Štednja za postavljanje cilja.
3. Widget Za platiti — neplaćene obveze. Tap ✓ za trenutnu uplatu.
4. Savjeti — upozorenja anomalija + pozitivna potvrda.
5. Top kategorije — mini progress barovi za tekući mjesec.

AKTIVNI SAVJETNIK
Svaki dan izračunava projekciju kraja mjeseca:
• Poznata potrošnja = plaćeno + u čekanju + neplaćene obveze
• Procjena = prosječna dnevna slobodna potrošnja × preostali dani
• Anomalija: kategorija ≥ 40% iznad prosjeka istog mjeseca u prethodnim godinama
• Pozitivno: trojiš ≥ 10% manje nego prošle godine u istom mjesecu

DNEVNI LIMIT POTROŠNJE
Formula: A = ((primici − izdaci) − planirana štednja) / preostali dani u mjesecu
• Zeleno (≥ 20 €/dan): sve u redu
• Žuto (0–20 €): oprez
• Crveno (< 0): prekoračenje
Postavi cilj štednje tapom na 🎯 Štednja u widgetu.

PUSH OBAVIJESTI (dodano u v1.1)
Aplikacija šalje podsjetnike za plaćanja koja dospijevaju unutar 3 dana.
Uključi u Postavke → Obavijesti → Dopusti podsjetnike.
Zahtijeva dozvolu za obavijesti (traži se jednom pri prvom uključivanju).

EKRAN TRANSAKCIJA
Filteri: Sve, Plaćeno, Dospjelo, Čeka plaćanje, U obradi, Primici.
Pretraga: tekst + 💰 filter iznosa + 🏷️ filter kategorije.
Bulk mod: "Odaberi" → checkbox → Plati sve / Obriši sve.
Dugi pritisak na ikonu plaćene transakcije vraća status na Čeka plaćanje.

STATISTIKA
Periodi: mjesec / godina / sve.
Tabovi: Očekivano, Kategorije, Pregled/Saldo, Plaćanje/Lokacije, Trend 3g., God/God.
Tab God/God: usporedba potrošnje s prošlom godinom — bar chart + % oznake.

POSTAVKE
• Aktivna godina — prebaci godinu
• Upravljaj obvezama — redovni troškovi
• Prilagodba popisa — kategorije, lokacije, plaćanje, budžet limiti
• Valuta — EUR, USD, HRK, GBP, CHF i ostalo
• Google Drive Backup — spremi/vrati na privatni Drive folder
• Račun — odjava, ručna sinkronizacija

CLOUD SINKRONIZACIJA
Zelena točkica = sinkronizirano · Žuta = u tijeku. Radi offline — sinkronizira pri povratku veze.

BACKUP I VRAĆANJE
Izvoz: Postavke → Backup → Izvezi (JSON).
Uvoz: Postavke → Backup → Učitaj (JSON).
AI model se automatski rebuilda nakon uvoza.

PIN I SIGURNOST
4–6 znamenkasti PIN s AES-256-GCM enkripcijom. 5 krivih pokušaja: 30s blokada. 10 krivih: brisanje podataka.
`.trim()
    },

    // ── What's new ──────────────────────────────────────────────────────────
    whats_new: {
      title: en ? "What's New in v1.2" : "Što je novo u v1.2",
      body: en ? `
MONEY LYNX v1.2 — RELEASE NOTES
Released: May 2026

─── NEW FEATURES ────────────────────────────────────────────

IMPROVED HOME SCREEN LAYOUT
• "To Pay" panel: footer now shows "Show all (N) →" on the left and a "Training" button on the right — always accessible even when obligations are overdue
• "Daily Limit" panel: the Savings button is now aligned with the panel icon, same height and width as the Training button
• Both action buttons (Training, Savings) are identical in shape, size and style

TRAINING SCREEN IMPROVEMENTS
• New custom running-figure icon replaces the generic gauge — cleaner, more intuitive at small sizes
• Header reorganised: title on the left, "Update data" button centred, "Back" button on the right
• The "Back" button returns directly to the Home screen

BACKUP & RESTORE IMPROVEMENT
• After a successful restore, the app automatically navigates to the Home screen
• Android: fixed file import using the native HTML file picker — no longer relies on the third-party plugin that was unreliable on Samsung Android 14+

─── BUG FIXES ───────────────────────────────────────────────

• Backup import rejected on Android APK (MIME type / UTF-8 encoding issue) — fixed
• Training button missing from "To Pay" panel when overdue items were shown — fixed
• Savings button misaligned with Daily Limit panel header icon — fixed

─── v1.1 HIGHLIGHTS (for reference) ────────────────────────

• Daily Spending Limit widget with inline savings goal editor
• AI Categorisation Engine (Naive Bayes, fully offline, privacy-first)
• Push notification reminders for obligations due within 3 days
• Year-on-Year statistics comparison tab
`.trim() : `
MONEY LYNX v1.2 — BILJEŠKE O IZDANJU
Objavljeno: svibanj 2026.

─── NOVE FUNKCIONALNOSTI ────────────────────────────────────

POBOLJŠANI IZGLED POČETNOG EKRANA
• Panel "Za platiti": footer sada prikazuje "Prikaži sve (N) →" lijevo i gumb "Trening" desno — uvijek dostupan čak i kad ima dospjelih obveza
• Panel "Dnevni limit": gumb Štednja sada je poravnat s ikonom panela, iste visine i širine kao gumb Trening
• Oba akcijska gumba (Trening, Štednja) identičnog su oblika, veličine i stila

POBOLJŠANJA EKRANA TRENING
• Nova prilagođena ikona figure trčača zamjenjuje generičku gauge ikonu — čišća, intuitivnija na malim veličinama
• Header reorganiziran: naziv lijevo, gumb "Ažuriraj podatke" u sredini, gumb "Natrag" desno
• Gumb "Natrag" vraća izravno na Početni ekran

POBOLJŠANJE UVOZA BACKUPA
• Nakon uspješnog vraćanja backupa, aplikacija automatski otvara Početni ekran
• Android: ispravljeno učitavanje datoteke nativnim HTML file pickerom — više se ne oslanja na third-party plugin koji nije bio pouzdan na Samsung Android 14+

─── ISPRAVCI GREŠAKA ────────────────────────────────────────

• Uvoz backupa odbijen na Android APK (MIME tip / UTF-8 kodiranje) — ispravljeno
• Gumb Trening nedostupan u panelu "Za platiti" kad su prikazane dospjele stavke — ispravljeno
• Gumb Štednja neporavnat s headerom panela Dnevni limit — ispravljeno

─── ISTAKNUTO iz v1.1 ───────────────────────────────────────

• Widget dnevnog limita potrošnje s inline editorom cilja štednje
• AI motor kategorizacije (Naive Bayes, 100% offline, privatnost first)
• Push obavijesti za obveze koje dospijevaju unutar 3 dana
• Tab statistike god/god
`.trim()
    },
    // ── Licences ────────────────────────────────────────────────────────────
    licences: {
      title: t("Licencni uvjeti"),
      body: `${en ? "Money Lynx by Moneylynx" : "Moja Lova by MoneyLynx"} v${VER} — ${en ? "Licence Terms" : "Licencni uvjeti"}

© 2024–${YEAR} MoneyLynx. Sva prava pridržana.
All rights reserved.

UVJETI KORIŠTENJA (HR)
Ova aplikacija licencirana je isključivo za osobnu, nekomercijalnu upotrebu. Zabranjeno je redistribuirati, prodavati, mijenjati ili koristiti kod, dizajn ili sadržaj ove aplikacije u komercijalne svrhe bez pisanog dopuštenja autora.

Korištenjem ove aplikacije prihvaćate ove uvjete, Odricanje odgovornosti te Politiku privatnosti i kolačića.

TERMS OF USE (EN)
This application is licensed for personal, non-commercial use only. Redistribution, sale, modification, or commercial use of the code, design, or content without the author's written permission is prohibited.

By using this application you accept these terms, the Disclaimer, and the Privacy & Cookies Policy.

─────────────────────────────────────────
OPEN SOURCE COMPONENTS

React 18.3
Licence: MIT · github.com/facebook/react

Recharts 2.12
Licence: MIT · github.com/recharts/recharts

Vite 5
Licence: MIT · github.com/vitejs/vite

Supabase JS 2.x
Licence: MIT · github.com/supabase/supabase-js

─────────────────────────────────────────
HOSTING & THIRD-PARTY SERVICES

Web hosting: GitHub Pages (github.com)
Database & Auth: Supabase (supabase.com)
OAuth: Google Sign-In (accounts.google.com)
Google Drive API: Google LLC (googleapis.com)
  — Used only for user-initiated backup/restore
  — Access scope: drive.appdata (private app folder only)
  — The app cannot access any other files in your Drive
Fonts: Google Fonts (fonts.googleapis.com)

─────────────────────────────────────────
Full MIT licence text:
https://opensource.org/licenses/MIT`
    },

    // ── Disclaimer ──────────────────────────────────────────────────────────
    disclaimer: {
      title: t("Odricanje odgovornosti"),
      body: en ? `DISCLAIMER — Money Lynx by Moneylynx v${VER}

Money Lynx is provided "as is" without warranty of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.

FINANCIAL DECISIONS
This app is a personal budgeting and tracking tool only. It does not provide financial, investment, tax, or legal advice. All financial decisions made based on data entered into this app are the sole responsibility of the user. The Active Advisor feature (forecasts, anomaly alerts, year-on-year comparisons) produces estimates based solely on the data you have entered — these are not professional financial projections.

DATA & SECURITY
• Local data is encrypted with AES-256-GCM when PIN protection is enabled
• Cloud data is stored on Supabase servers secured with Row Level Security (RLS) — each user can only access their own data
• PIN hashes use PBKDF2 (100,000 iterations, SHA-256) and are never transmitted to any server
• Google Drive backups are stored in your private appdata folder; the app cannot access any other Drive files
• The author is not responsible for data loss resulting from: device failure, forgotten PIN without cloud backup, accidental deletion, browser cache clearing, or third-party service outages
• Users are strongly advised to enable cloud sync and/or Google Drive backup

ACTIVE ADVISOR ACCURACY
Forecast projections and anomaly detections are mathematical estimates based on historical data you have entered. They may be inaccurate, especially with limited history (< 2 months). Do not rely on them for financial decisions.

CLOUD SYNC & AVAILABILITY
• Real-time sync requires an active internet connection
• The author does not guarantee continuous availability of the service
• Data may be temporarily unavailable during maintenance or third-party outages (Supabase, GitHub Pages, Google APIs)
• Offline mode preserves local data; sync resumes automatically when connection returns

CURRENCY & CALCULATIONS
• Currency display is for presentation purposes only and does not perform real-time conversion
• All calculations are based on user-entered amounts in their selected currency
• The accuracy of all outputs depends entirely on the accuracy of the data entered` :
`ODRICANJE ODGOVORNOSTI — Moja Lova by MoneyLynx v${VER}

Aplikacija Moja Lova pruža se "kakva jest" bez ikakvih izričitih ili implicitnih jamstava.

FINANCIJSKE ODLUKE
Ova aplikacija je isključivo alat za osobno budžetiranje i praćenje. Ne pruža financijske, investicijske, porezne niti pravne savjete. Sve financijske odluke donesene na temelju podataka unesenih u aplikaciju isključiva su odgovornost korisnika. Funkcija Aktivnog savjetnika (projekcije, anomalije, usporedbe god/god) proizvodi procjene isključivo na temelju unesenih podataka — to nisu profesionalne financijske projekcije.

PODACI I SIGURNOST
• Lokalni podaci enkriptirani su AES-256-GCM kada je PIN zaštita uključena
• Cloud podaci pohranjeni su na Supabase poslužiteljima zaštićenim Row Level Security (RLS)
• PIN hash koristi PBKDF2 (100.000 iteracija, SHA-256) i nikad se ne prenosi na server
• Google Drive backupi pohranjuju se u tvoj privatni appdata folder; aplikacija ne može pristupiti nijednoj drugoj Drive datoteci
• Autor nije odgovoran za gubitak podataka uslijed: kvara uređaja, zaboravljenog PIN-a, slučajnog brisanja, brisanja cache-a preglednika ili zastoja usluga trećih strana
• Korisnicima se snažno preporuča omogućiti cloud sinkronizaciju i/ili Google Drive backup

TOČNOST AKTIVNOG SAVJETNIKA
Projekcije i anomalije su matematičke procjene temeljene na povijesti unesenih podataka. Mogu biti netočne, posebno s ograničenom historijom (< 2 mjeseca). Ne oslanjajte se na njih za financijske odluke.

CLOUD SINKRONIZACIJA I DOSTUPNOST
• Sinkronizacija zahtijeva aktivnu internetsku vezu
• Autor ne jamči neprekidnu dostupnost usluge
• Podaci mogu biti privremeno nedostupni (Supabase, GitHub Pages, Google API)
• Offline rad čuva lokalne podatke; sinkronizacija nastavlja pri povratku veze

VALUTE I IZRAČUNI
• Prikaz valute služi isključivo u prezentacijske svrhe i ne vrši konverziju u stvarnom vremenu
• Točnost svih rezultata ovisi u potpunosti o točnosti unesenih podataka`
    },

    // ── Privacy ─────────────────────────────────────────────────────────────
    privacy: {
      title: t("Privatnost i kolačići"),
      body: en ? `PRIVACY & COOKIES POLICY
Money Lynx by Moneylynx v${VER} · Last updated: May ${YEAR}

DATA STORAGE
Money Lynx stores data in two ways:

1. LOCAL STORAGE (without account)
All data stored exclusively on your device using browser localStorage. No data sent to any server. Clearing browser data or switching devices will lose data unless you exported a backup.

2. CLOUD STORAGE (with account)
When signed in with Google or email/password, data is also stored on Supabase servers (supabase.com), enabling real-time sync, automatic backup and account recovery.

3. GOOGLE DRIVE BACKUP (optional)
When you use the Google Drive backup feature:
• You explicitly authorise the app via a Google OAuth popup
• The app stores one backup JSON file in your private appdata folder on Google Drive
• The app requests only the "drive.appdata" scope — it cannot read, modify, or delete any other files in your Google Drive
• Your Google credentials are never stored by this app
• You can revoke access at any time via myaccount.google.com/permissions

DATA COLLECTED WHEN SIGNED IN
• Email address (from Google OAuth or manual registration)
• Display name (from Google profile or manually entered)
• Transaction data you enter (amounts, descriptions, categories, dates)
• App preferences (theme, language, currency, timezone)

Data is protected by Supabase Row Level Security (RLS) — only you can access your data.

AUTHENTICATION
• Google Sign-In: OAuth 2.0 with PKCE via Supabase Auth. Your Google password is never shared with this app.
• Email/password: hashed by Supabase using bcrypt. The app never sees your raw password.

ENCRYPTION
When PIN protection is enabled:
• Local data encrypted with AES-256-GCM
• Key derived from PIN using PBKDF2 (100,000 iterations, SHA-256)
• PIN hash and salt stored locally, never transmitted

COOKIES & LOCAL STORAGE
The web version does not use tracking, advertising, or analytics cookies.
The app uses:
• localStorage — app data and preferences
• sessionStorage — temporary session encryption keys
• Supabase auth tokens — in localStorage for session persistence

THIRD-PARTY SERVICES
• Supabase (supabase.com) — database, auth, real-time sync
• GitHub Pages (github.com) — web hosting
• Google (accounts.google.com) — OAuth sign-in
• Google Drive API (googleapis.com) — optional backup only
• Google Fonts (fonts.googleapis.com) — font loading

These services may collect standard access logs (IP, browser type). See their privacy policies.

YOUR RIGHTS (GDPR)
• Export all data at any time (Settings → Backup)
• Delete cloud data by signing out and requesting deletion
• Delete local data by clearing browser storage
• Use the app without an account (local-only mode)
• Revoke Google Drive access via myaccount.google.com/permissions

Contact for privacy requests: ${EMAIL}` :
`POLITIKA PRIVATNOSTI I KOLAČIĆA
Moja Lova by MoneyLynx v${VER} · Posljednje ažuriranje: svibanj ${YEAR}.

POHRANA PODATAKA
Moja Lova pohranjuje podatke na tri načina:

1. LOKALNA POHRANA (bez računa)
Svi podaci pohranjuju se isključivo na tvom uređaju putem browser localStorage-a. Nikakvi podaci ne šalju se na server.

2. CLOUD POHRANA (s računom)
Prijavom Google ili email/lozinka računom, podaci se pohranjuju i na Supabase poslužiteljima, što omogućuje sinkronizaciju i automatski backup.

3. GOOGLE DRIVE BACKUP (opcionalno)
Kada koristiš Google Drive backup:
• Eksplicitno autoriziraš aplikaciju putem Google OAuth popupa
• Aplikacija pohranjuje jednu backup JSON datoteku u tvoj privatni appdata folder na Google Driveu
• Aplikacija traži samo "drive.appdata" opseg — ne može čitati, mijenjati niti brisati nijednu drugu datoteku u tvom Google Driveu
• Tvoje Google vjerodajnice nikad se ne pohranjuju ovom aplikacijom
• Pristup možeš opozvati u bilo koje doba na myaccount.google.com/permissions

PODACI KOJI SE PRIKUPLJAJU PRI PRIJAVI
• Email adresa (iz Google OAuth-a ili ručne registracije)
• Ime (iz Google profila ili ručno uneseno)
• Podaci o transakcijama (iznosi, opisi, kategorije, datumi)
• Postavke aplikacije (tema, jezik, valuta, vremenska zona)

Podaci su zaštićeni Supabase Row Level Security (RLS) — samo ti možeš pristupiti svojim podacima.

AUTENTIFIKACIJA
• Google prijava: OAuth 2.0 s PKCE protokolom. Tvoja Google lozinka nikad se ne dijeli s aplikacijom.
• Email/lozinka: lozinke hashira Supabase bcryptom. Aplikacija nikad ne vidi izvornu lozinku.

ENKRIPCIJA
Kada je PIN zaštita uključena:
• Lokalni podaci enkriptirani AES-256-GCM
• Ključ deriviran PBKDF2 algoritmom (100.000 iteracija, SHA-256)
• PIN hash i salt pohranjuju se lokalno, nikad se ne prenose

KOLAČIĆI I LOKALNA POHRANA
Web verzija ne koristi kolačiće za praćenje, oglašavanje niti analitiku.
Aplikacija koristi:
• localStorage — podaci i postavke aplikacije
• sessionStorage — privremeni ključevi sesijske enkripcije
• Supabase auth tokeni — u localStorage za trajnost sesije

USLUGE TREĆIH STRANA
• Supabase (supabase.com) — baza podataka, autentifikacija, sinkronizacija
• GitHub Pages (github.com) — web hosting
• Google (accounts.google.com) — OAuth prijava
• Google Drive API (googleapis.com) — samo za opcionalni backup
• Google Fonts (fonts.googleapis.com) — učitavanje fontova

Ove usluge mogu prikupljati standardne pristupne zapise (IP, vrsta preglednika).

TVOJA PRAVA (GDPR)
• Izvezi sve podatke u bilo koje doba (Postavke → Backup)
• Obriši cloud podatke odjavom i zahtjevom za brisanje
• Obriši lokalne podatke brisanjem pohrane preglednika
• Koristi aplikaciju bez računa (samo lokalni način)
• Opozovi Google Drive pristup na myaccount.google.com/permissions

Za zahtjeve vezane za privatnost: ${EMAIL}`
    },

    // ── Contact ─────────────────────────────────────────────────────────────
    contact: {
      title: t("Kontaktiraj nas"),
      body: `${en ? "Money Lynx by Moneylynx" : "Moja Lova by MoneyLynx"} v${VER}

Web: ${WEB}
E-mail: ${EMAIL}

${en ? "For questions, suggestions or bug reports:" : "Za pitanja, prijedloge ili prijavu grešaka:"}

${en ? "When reporting a bug, please include:" : "Kod prijave greške, navedite:"}
${en ? "• App version (see Diagnostics)" : "• Verziju aplikacije (vidi Dijagnostika)"}
${en ? "• Device and OS version" : "• Uređaj i verziju OS-a"}
${en ? "• Steps to reproduce the issue" : "• Korake koji reproduciraju problem"}
${en ? "• Screenshot if possible" : "• Screenshot ako je moguće"}
${en ? "• Whether you use cloud sync or local-only mode" : "• Koristiš li cloud sinkronizaciju ili lokalni način"}

${en ? "Response time: 2–5 business days." : "Vrijeme odgovora: 2–5 radnih dana."}`
    },

    // ── Feedback ────────────────────────────────────────────────────────────
    feedback: {
      title: t("Pošalji povratnu informaciju"),
      body: en ? `SEND FEEDBACK

We appreciate your feedback — it helps improve the app for everyone.

Ways to provide feedback:
• Email — ${EMAIL}
• GitHub Issues — ${WEB}

Please describe:
1. What you were trying to do
2. What happened instead
3. What you expected to happen
4. Your device, OS and browser version
5. Whether you use cloud sync or local-only mode

For feature requests, please explain the use case — not just the feature itself.

Thank you for using Money Lynx by Moneylynx v${VER}!` :
`POŠALJI POVRATNU INFORMACIJU

Hvala na povratnoj informaciji! Pomaže nam poboljšati aplikaciju za sve.

Načini slanja:
• Email — ${EMAIL}
• GitHub Issues — ${WEB}

Molimo opiši:
1. Što si pokušavao napraviti
2. Što se umjesto toga dogodilo
3. Što si očekivao da se dogodi
4. Tvoj uređaj, OS i verziju preglednika
5. Koristiš li cloud sinkronizaciju ili lokalni način

Za zahtjeve za nove funkcionalnosti, objasni slučaj upotrebe — ne samo funkcionalnost.

Hvala što koristiš Moja Lova by MoneyLynx v${VER}!`
    },

    // ── Diagnostics ─────────────────────────────────────────────────────────
    diagnostics: {
      title: t("Dijagnostika"),
      body: [
        `${en ? "App version"  : "Verzija aplikacije"}: ${VER}`,
        `${en ? "Platform"     : "Platforma"}: ${typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.() ? "Android APK" : "Web / PWA"}`,
        `${en ? "Language"     : "Jezik"}: ${en ? "English" : "Hrvatski"}`,
        `${en ? "Currency"     : "Valuta"}: ${(() => { try { return JSON.parse(localStorage.getItem("ml_prefs") || "{}").currency || "EUR"; } catch { return "EUR"; } })()}`,
        `${en ? "Timezone"     : "Vremenska zona"}: ${(() => { try { return JSON.parse(localStorage.getItem("ml_prefs") || "{}").timezone || Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "N/A"; } })()}`,
        `${en ? "Screen"       : "Zaslon"}: ${typeof window !== "undefined" ? `${window.screen.width}×${window.screen.height}` : "N/A"}`,
        `${en ? "Online"       : "Online"}: ${typeof navigator !== "undefined" ? (navigator.onLine ? (en ? "Yes" : "Da") : (en ? "No" : "Ne")) : "N/A"}`,
        `${en ? "Cloud sync"   : "Cloud sinkronizacija"}: ${(() => { try { const keys = Object.keys(localStorage).filter(k => k.startsWith("sb-") && k.endsWith("-auth-token")); return keys.length ? (en ? "Active" : "Aktivna") : (en ? "Not signed in" : "Nije prijavljen"); } catch { return "N/A"; } })()}`,
        `${en ? "PIN"          : "PIN zaštita"}: ${(() => { try { return JSON.parse(localStorage.getItem("ml_sec") || "{}").pinHash ? (en ? "Enabled" : "Uključena") : (en ? "Disabled" : "Isključena"); } catch { return "N/A"; } })()}`,
        `${en ? "Biometrics"   : "Biometrija"}: ${(() => { try { return JSON.parse(localStorage.getItem("ml_sec") || "{}").bioEnabled ? (en ? "Enabled" : "Uključena") : (en ? "Disabled" : "Isključena"); } catch { return "N/A"; } })()}`,
        `${en ? "Service Worker" : "Service Worker"}: ${"serviceWorker" in navigator ? (en ? "Supported" : "Podržan") : (en ? "Not supported" : "Nije podržan")}`,
        `${en ? "Storage"      : "Pohrana"}: ${(() => { try { const t = "ml_test"; localStorage.setItem(t, "1"); localStorage.removeItem(t); return en ? "Available" : "Dostupna"; } catch { return en ? "Blocked" : "Blokirana"; } })()}`,
        `${en ? "Transactions" : "Transakcije"}: ${(() => { try { const d = JSON.parse(localStorage.getItem("ml_db") || "[]"); return d.length; } catch { return "N/A"; } })()}`,
        `${en ? "User Agent"   : "User Agent"}: ${typeof navigator !== "undefined" ? navigator.userAgent : "N/A"}`,
      ].join("\n")
    },
  };

  const item = section ? content[section] : null;
  const cy = new Date().getFullYear();

  return (
    <div className="fi" style={{ width: "100%" }}>
      <StickyHeader C={C} icon="info" title={item ? item.title : t("O aplikaciji")}
        right={
          <button onClick={item ? () => setSection(null) : onBack}
            style={{ background: C.cardAlt, border: `1px solid ${C.border}`, color: C.textMuted, padding: "8px 14px", borderRadius: 10, fontSize: 13, cursor: "pointer" }}>
            {t("Natrag")}
          </button>
        }
      />

      <div style={{ padding: "14px 16px 24px" }}>
        {!section ? (
          <>
            {/* App identity card */}
            <div style={{ background: `linear-gradient(135deg,${C.accent}18,${C.accent}08)`, border: `1px solid ${C.accent}30`, borderRadius: 14, padding: "14px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg,${C.accent},${C.accentDk})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <LynxLogoWhite s={22}/>
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{en ? "Money Lynx" : "Moja Lova"}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{t("Verzija")} {VER} · © {cy} MoneyLynx</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{WEB}</div>
              </div>
            </div>

            {/* Section list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sections.map(s => (
                <button key={s.id} onClick={() => setSection(s.id)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 15px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 13, cursor: "pointer", textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: s.id === "whats_new" ? `${C.income}20` : `${C.accent}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Ic n={s.icon} s={15} c={s.id === "whats_new" ? C.income : C.accent}/>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{s.label}</span>
                  </div>
                  <Ic n="chevron" s={14} c={C.textMuted} style={{ transform: "rotate(-90deg)" }}/>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
            <pre style={{ fontFamily: "'Inter',sans-serif", fontSize: 12.5, lineHeight: 1.7, color: C.text, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
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
