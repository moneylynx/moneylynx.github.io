import { useState } from 'react';
import { Ic, LynxLogoWhite, StickyHeader } from '../ui.jsx';

const VER = "1.0";
const YEAR = "2026";
const EMAIL = "info.mojalova@moneylynx.net";
const WEB = "moneylynx.net";

function AboutScreen({ C, onBack, t, lang }) {
  const [section, setSection] = useState(null);

  const en = lang === "en";

  const sections = [
    { id: "help",        icon: "info",  label: t("Pomoć") },
    { id: "whats_new",   icon: "zap",   label: en ? "What's New in v1.0" : "Što je novo u v1.0" },
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
Open the app at ${WEB}. Sign in with Google or email/password. After login, data syncs automatically across all your devices in real time. You can also use the app without an account — all data is stored locally.

ADDING TRANSACTIONS
Tap the blue + button at the bottom. Required fields: Amount and Description. The form remembers your habits — if you type a familiar description (e.g. "Konzum"), it auto-fills Category, Location and Payment from your history.

Quick-fill chips appear above the form with your most recent entries. Tap one to fill the entire form instantly.

Tap "More options →" to reveal Location, Notes, Installments, and Recurring toggle.

Default payment: Cash. Default status: Paid.

TRANSACTION TYPES
• Expense: a payment or cost
• Income: money received (salary, transfer…)
• Recurring obligation: monthly repeating expense. Enable "Recurring obligation?" under More options.
• Installments: purchase spread over months. Each installment appears in its due month in Statistics.

HOME SCREEN (what you see)
1. Balance card — yearly balance. Tap to expand forecast detail (projected end-of-month balance).
2. "To pay" widget — all unpaid obligations due today or earlier, max 3 shown. Tap "Pay ✓" to mark instantly.
3. Advisor insights — automatic alerts when a category is above average, or positive confirmation when you're spending less than last year.
4. Top categories — mini progress bars for the current month's spending by category.

ACTIVE ADVISOR
The app projects your end-of-month balance every day:
• Known spend = already paid + pending + unpaid recurring obligations
• Estimated = historical daily discretionary rate × days remaining
• Anomaly alerts: if a category is ≥40% above its same-month average from prior years
• Positive reinforcement: "Great month!" when spending is ≥10% below last year's same month

TRANSACTIONS SCREEN
Opens on "Overdue" filter. Filters: All, Paid, Overdue, Pending, Processing, Income.

Search: text search + tap 💰 for amount range (min/max) + tap 🏷️ for category filter.

Bulk mode: tap "Select" → checkboxes appear → select multiple → Pay all or Delete all.

Long-press the category icon on a Paid transaction to revert it to "Pending payment".

STATISTICS
Periods: month / year / all time.
Tabs: Expected, Categories, Overview/Balance, Payments & Locations, 3yr Trend, Year-on-Year.

Year-on-Year tab: compares spending by category between this year and last year. Bar chart + % change badges.

SETTINGS
• Active Year — switch year for analysis
• Manage Obligations — edit/delete recurring obligations
• List Customization — add categories, locations, payment methods, budget limits
• Currency — EUR, USD, HRK, GBP, CHF, BAM, RSD, HUF, CZK, PLN
• Time zone — Europe, Americas, Asia, Australia
• Google Drive Backup — save/restore backup directly to your Drive (requires Google client ID setup)
• Account — sign out, manual sync button

CLOUD SYNC
Green dot = synced. Yellow dot = syncing. Real-time: changes on one device appear instantly on others. Works offline — syncs on reconnection.

BACKUP & RESTORE
Export: Settings → Backup → Export (JSON). Import: Settings → Backup → Import.
Google Drive: Settings → Google Drive → Save to Drive / Restore from Drive.

PIN & BIOMETRICS
Set a 4–6 digit PIN in Settings → Security. After 5 wrong attempts: locked 30s. After 10: all data wiped. Biometrics: first session requires PIN once, then fingerprint/Face ID works independently.

MINIMIZE BEHAVIOR
After minimizing and reopening, the app always returns to the Home screen.
`.trim() : `
POČETAK RADA
Otvori aplikaciju na ${WEB}. Prijavi se Google računom ili emailom/lozinkom. Nakon prijave, podaci se automatski sinkroniziraju između svih uređaja. Možeš koristiti aplikaciju i bez računa — podaci se čuvaju lokalno.

UNOS TRANSAKCIJA
Pritisni plavi + gumb na dnu. Obavezna polja: Iznos i Opis. Forma pamti tvoje navike — upisuješ li poznati opis (npr. "Konzum"), automatski popunjava Kategoriju, Lokaciju i Plaćanje iz povijesti.

Iznad forme prikazuju se čipovi brzog unosa s nedavnim unosima. Tap na čip → cijela forma popunjena za sekundu.

Pritisni "Više opcija →" za Lokaciju, Napomene, Obročnu otplatu i Redovnu obvezu.

Zadano plaćanje: Gotovina. Zadani status: Plaćeno.

VRSTE TRANSAKCIJA
• Isplata: plaćanje ili trošak
• Primitak: primljeni novac (plaća, uplata…)
• Redovna obveza: trošak koji se ponavlja svaki mjesec. Uključi "Redovna obveza?" pod Više opcija.
• Obročna otplata: kupnja raspoređena na više mjeseci. Svaki obrok prikazuje se u svom mjesecu dospijeća.

POČETNI EKRAN (što vidimo)
1. Kartica Stanje — godišnje stanje. Tap za detalje projekcije (predviđeno stanje kraj mjeseca).
2. Widget Za platiti — sve neplaćene obveze s datumom do danas, max 3 prikazane. Tap "Plati ✓" za trenutnu oznaku.
3. Savjeti aplikacije — upozorenja kad je kategorija iznad prosjeka, ili pozitivna potvrda kad trojiš manje nego prošle godine.
4. Top kategorije — mini progress barovi za potrošnju ovog mjeseca po kategorijama.

AKTIVNI SAVJETNIK
Aplikacija svaki dan izračunava projekciju kraja mjeseca:
• Poznata potrošnja = već plaćeno + u čekanju + neplaćene redovne obveze
• Procjena = prosječna dnevna slobodna potrošnja × preostali dani
• Anomalije: ako je kategorija ≥40% iznad prosjeka istog mjeseca u prethodnim godinama
• Pozitivna potvrda: "Odličan mjesec!" kad trojiš ≥10% manje nego prošle godine u istom mjesecu

EKRAN TRANSAKCIJA
Otvara se na filteru "Dospjelo". Filteri: Sve, Plaćeno, Dospjelo, Čeka plaćanje, U obradi, Primici.

Pretraga: tekst + tap 💰 za filter iznosa (min/max) + tap 🏷️ za filter kategorije.

Bulk mod: tap "Odaberi" → checkbox kvadratići → odaberi više → Plati sve ili Obriši sve.

Dugi pritisak na ikonu kategorije plaćene transakcije vraća status u "Čeka plaćanje".

STATISTIKA
Periodi: mjesec / godina / sve.
Tabovi: Očekivano, Kategorije, Pregled/Saldo, Plaćanje/Lokacije, Trend 3g., God/God.

Tab God/God: usporedba potrošnje po kategorijama između ove i prošle godine. Bar chart + % oznake promjene.

POSTAVKE
• Aktivna godina — prebaci godinu za analizu
• Upravljaj obvezama — uredi/obriši redovne obveze
• Prilagodba popisa — vlastite kategorije, lokacije, načini plaćanja, budžet limiti
• Valuta — EUR, USD, HRK, GBP, CHF, BAM, RSD, HUF, CZK, PLN
• Vremenska zona — Europa, Amerika, Azija, Australija
• Google Drive Backup — spremi/vrati backup direktno na Drive (zahtijeva postavljanje Google client ID-a)
• Račun — odjava, ručni gumb za sinkronizaciju

CLOUD SINKRONIZACIJA
Zelena točkica = sinkronizirano. Žuta točkica = sinkronizacija u tijeku. Radi offline — sinkronizira pri povratku veze.

BACKUP I VRAĆANJE
Izvoz: Postavke → Backup → Izvezi (JSON). Uvoz: Postavke → Backup → Učitaj.
Google Drive: Postavke → Google Drive → Spremi na Drive / Vrati s Drivea.

PIN I BIOMETRIJA
Postavi 4–6 znamenkasti PIN u Postavke → Sigurnost. Nakon 5 krivih: zaključano 30s. Nakon 10: svi podaci se brišu. Biometrija: prva sesija uvijek traži PIN jednom, zatim otisak prsta/lice radi samostalno.

PONAŠANJE PRI MINIMIZIRANJU
Nakon minimiziranja i ponovnog otvaranja, aplikacija uvijek vraća na Početni ekran.
`.trim()
    },

    // ── What's new ──────────────────────────────────────────────────────────
    whats_new: {
      title: en ? "What's New in v1.0" : "Što je novo u v1.0",
      body: en ? `
MONEY LYNX v1.0 — RELEASE NOTES
Released: May 2026

SMART ENTRY (Phase 1)
• Quick-fill chips above the form — tap to fill from recent transactions
• Auto-fill: type a description and the app predicts Category, Location, Payment from your history. Auto-filled fields shown with a green "auto" label.
• Category emoji icons throughout the app (🍞🚗🏠🏦✈️…)
• Numeric decimal keyboard for amount fields
• Long-press category icon in Transactions list to revert Paid → Pending
• Progressive disclosure: "More options →" hides Location, Notes, Installments, Recurring unless needed

ACTIVE ADVISOR (Phase 2)
• Forecast integrated into Balance card: projected end-of-month balance shown inline
• Expandable forecast detail (6 data points: paid, pending, obligations, estimate, income, daily rate)
• Seasonal anomaly detection: compares current month against the same month in prior years (not rolling 3-month average — so December won't be flagged every year)
• Positive reinforcement: celebrates months where you spend less than the same month last year
• Year-on-Year statistics tab: per-category comparison with bar charts and % change badges
• YoY improvement badge on monthly expense card

POWER USER FEATURES (Phase 3)
• Amount range filter: tap 💰 in Transactions to filter by min/max amount
• Category filter: tap 🏷️ in Transactions to filter by category (with emoji icons)
• Bulk operations: "Select" mode → checkboxes → bulk Pay or Delete with confirmation
• Google Drive backup: save/restore backup JSON directly to your Google Drive appdata folder

HOME SCREEN REDESIGN
• New visual hierarchy: Balance → Mini cards → Za platiti → Insights → Top categories
• Forecast projection line built into Balance card (no scrolling needed)
• "Za platiti" widget limited to 3 items — always visible above the fold even on small phones
• Top categories redesigned with mini progress bars (more readable than pie chart)
• "Healthy" and "All obligations settled!" positive states
• Onboarding guide for new users: 3 interactive steps (first transaction, recurring obligation, budget)

OTHER IMPROVEMENTS
• "Bilanca" renamed to "Stanje" (more natural Croatian)
• Month improvement badge: ↓12% / ↑8% vs same month last year
• Empty state onboarding: interactive 3-step checklist for new users
`.trim() : `
MONEY LYNX v1.0 — BILJEŠKE O IZDANJU
Objavljeno: svibanj 2026.

PAMETNI UNOS (Faza 1)
• Čipovi brzog unosa iznad forme — tap za punjenje iz nedavnih transakcija
• Auto-fill: upisuješ opis i aplikacija predviđa Kategoriju, Lokaciju, Plaćanje iz povijesti. Auto-popunjena polja označena zelenim "auto" labelom.
• Emoji ikone kategorija kroz cijelu aplikaciju (🍞🚗🏠🏦✈️…)
• Numerička decimalna tipkovnica za polja iznosa
• Dugi pritisak na ikonu kategorije u listi vraća Plaćeno → Čeka plaćanje
• Progresivno otkrivanje: "Više opcija →" skriva Lokaciju, Napomene, Obročnu otplatu, Redovnu obvezu

AKTIVNI SAVJETNIK (Faza 2)
• Projekcija integrirana u karticu Stanje: predviđeno stanje kraj mjeseca prikazano inline
• Razvijajući detalji projekcije (6 stavki: plaćeno, u čekanju, obveze, procjena, prihodi, dnevna stopa)
• Sezonalni anomaly detection: uspoređuje tekući mjesec s istim mjesecom prethodnih godina (ne s rolling 3-mj. prosjekom — prosinac se neće flagirati svake godine)
• Pozitivna potvrda: slavi mjesece u kojima trojiš manje nego isti mjesec prošle godine
• Tab God/God u statistici: usporedba po kategorijama s bar chartovima i % oznakama
• YoY badge na kartici mjesečnih troškova

POWER USER FUNKCIONALNOSTI (Faza 3)
• Filter iznosa: tap 💰 u Transakcijama za filter po min/max iznosu
• Filter kategorije: tap 🏷️ u Transakcijama za filter po kategoriji (s emoji ikonama)
• Bulk operacije: mod "Odaberi" → checkbox kvadratići → bulk Plati ili Obriši s potvrdom
• Google Drive backup: spremi/vrati backup JSON direktno u Google Drive appdata folder

REDIZAJN POČETNOG EKRANA
• Nova vizualna hijerarhija: Stanje → Mini kartice → Za platiti → Savjeti → Top kategorije
• Linija projekcije ugrađena u karticu Stanje (bez skrolanja)
• Widget "Za platiti" ograničen na 3 stavke — uvijek vidljiv iznad fold linije čak i na malim telefonima
• Top kategorije redizajnirane s mini progress barovima (čitljivije od pie charta)
• Pozitivna stanja "Sve obveze podmirene!" i "Sve izgleda dobro"
• Onboarding vodič za nove korisnike: 3 interaktivna koraka (prva transakcija, redovna obveza, budžet)

OSTALA POBOLJŠANJA
• "Bilanca" preimenovano u "Stanje" (prirodniji naziv)
• Badge poboljšanja mjeseca: ↓12% / ↑8% vs isti mjesec prošle godine
• Poboljšano prazno stanje: interaktivni 3-koračni checklist za nove korisnike
`.trim()
    },

    // ── Licences ────────────────────────────────────────────────────────────
    licences: {
      title: t("Licencni uvjeti"),
      body: `Moja Lova by MoneyLynx v${VER} — Licencni uvjeti / Licence Terms

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
      body: en ? `DISCLAIMER — Moja Lova by MoneyLynx v${VER}

Moja Lova is provided "as is" without warranty of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.

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
Moja Lova by MoneyLynx v${VER} · Last updated: May ${YEAR}

DATA STORAGE
Moja Lova stores data in two ways:

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
      body: `Moja Lova by MoneyLynx v${VER}

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

Thank you for using Moja Lova by MoneyLynx v${VER}!` :
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
                <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>Moja Lova</div>
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
