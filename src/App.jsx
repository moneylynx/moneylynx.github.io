import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from "recharts";

// ─── Constants & Languages ───────────────────────────────────────────────────
const MONTHS = ["Siječanj","Veljača","Ožujak","Travanj","Svibanj","Lipanj","Srpanj","Kolovoz","Rujan","Listopad","Studeni","Prosinac"];
const MSHORT = ["Sij.","Velj.","Ožu.","Trav.","Svi.","Lip.","Srp.","Kol.","Ruj.","Lis.","Stu.","Pro."];

const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MSHORT_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const EN_DICT = {
  "Moja lova": "My Money", "Početna": "Home", "Transakcije": "Transactions", "Statistika": "Stats", "Postavke": "Settings",
  "Brzi unos": "Quick Add", "Bilanca": "Balance", "primici": "income", "plaćeno": "paid", "čekaju": "pending",
  "Prosjek/mj.": "Avg/mo.", "Vrijeme je za prvi unos!": "Time for your first entry!",
  "Pritisnite plavi plus gumb na dnu ekrana i zabilježite svoj prvi trošak ili primitak. Statistike će se pojaviti automatski.": "Press the blue plus button to add your first expense or income. Stats will appear automatically.",
  "Primici vs Troškovi": "Income vs Expenses", "Top kategorije": "Top Categories", "Bok,": "Hi,",
  "Što želite dodati?": "What to add?", "Novi puni unos": "New Full Entry", "Nedovršene skice": "Unfinished Drafts",
  "Spremi skicu": "Save Draft", "Zatvori": "Close", "Obriši": "Delete", "Iznos (€)": "Amount (€)", "Opis / Kratko": "Description / Short",
  "Novi unos": "New Entry", "Uredi unos": "Edit Entry", "Dovrši skicu": "Complete Draft", "Odustani": "Cancel",
  "Unos iz skice. Dovršite detalje i spremite.": "Draft entry. Complete details and save.",
  "Isplata": "Expense", "Obveze": "Recurring", "Primitak": "Income", "Datum": "Date", "Opis": "Description",
  "Kategorija": "Category", "- odabrati -": "- select -", "Lokacija": "Location", "Obročna otplata?": "Installments?",
  "Da": "Yes", "Ne": "No", "Aktivirano:": "Active:", "obroka": "installments", "Dinamika:": "Frequency:",
  "Mjesečno": "Monthly", "Godišnje": "Yearly", "Broj obroka:": "Num of inst.:", "Iznos obroka": "Inst. Amount",
  "Da, spremi": "Yes, Save", "Ne, odustani": "No, Cancel", "Plaćanje": "Payment", "Status": "Status",
  "Status rata određuje se automatski.": "Installment status is set automatically.", "Napomene": "Notes", "Opcionalno…": "Optional…",
  "Spremi promjene": "Save Changes", "Dodaj transakciju": "Add Transaction", "Dodaj": "Add", "Spremi uneseno": "Save Entry",
  "Plaćanje gotovinom ne omogućuje obročnu otplatu.": "Cash payments do not support installments.",
  "Sve": "All", "Pretraži…": "Search…", "Nema transakcija": "No transactions", "Pokušajte s drugim pojmom za pretragu.": "Try a different search term.",
  "Pritisnite + za dodavanje.": "Press + to add.", "Nema stavki za odabrani filter.": "No items for selected filter.",
  "Obriši!": "Delete!", "Što obrisati?": "What to delete?", "Ovaj obrok": "This installment", "Sve obroke": "All installments",
  "Plaćeno": "Paid", "Čeka plaćanje": "Pending", "U obradi": "Processing",
  "Period prikaza": "Time Period", "Sve ukupno": "All Time", "Stavki": "Items", "Očekivano": "Expected", "Kategorije": "Categories",
  "Pregled/Saldo": "Overview/Balance", "Plaćanje/Lokacije": "Payment/Location", "Ukupno očekivano": "Total Expected",
  "Obroci": "Pay Plan", "Rate": "Loan Inst.", "Nema očekivanih obveza": "No expected obligations", "Nema podataka": "No data",
  // Dedicated short labels used only in Stats → Ukupno očekivano filter pills.
  "Obveze (short)": "Recurr.", "Obroci (short)": "Pay. Plan", "Rate (short)": "Loan Inst.", "Ostalo (short)": "Other",
  "Kumulativni saldo": "Cumulative Balance", "Po načinu plaćanja": "By Payment Method", "Po lokacijama": "By Location", "do": "until",
  "Natrag": "Back", "Plaćeno ovaj mjesec": "Paid this month", "Nema obveza za ovaj mjesec": "No obligations this month",
  "Ovdje će se pojaviti redovne obveze i obroci čiji datum pada u tekući mjesec.": "Recurring obligations and installments for the current month will appear here.",
  "dospijeva": "due", "u mj.": "of mo.", "Obrok": "Installment", "obroka ukupno": "total installments", "Vrati": "Undo", "Plati": "Pay",
  "Redovne obveze": "Recurring Tasks", "Uredi redovnu obvezu": "Edit Recurring", "Npr. Kredit": "E.g. Loan", "Iznos €": "Amount €",
  "- opcija -": "- option -", "DAN DOSPJECA": "DUE DATE", "Dan (npr. 15)": "Day (e.g. 15)", "Broj obroka": "Num of Inst.",
  "0 = neograničeno": "0 = unlimited", "Do datuma": "Until Date", "Spremi": "Save", "Nova redovna obveza": "New Recurring",
  "Dodaj redovnu obvezu": "Add Recurring Obligation", "Spremi i vrati se": "Save & Return", "(blokiran)": "(locked)",
  "Opće postavke": "General Settings", "Profil korisnika": "User Profile", "Nije upisana e-mail adresa": "No email address provided",
  "Ime": "First Name", "Prezime": "Last Name", "Telefon": "Phone", "E-mail": "E-mail", "Spremi profil": "Save Profile",
  "Izmijeni profil": "Edit Profile", "Izgled": "Appearance", "Tema prikaza": "Theme", "Tamni": "Dark", "Svijetli": "Light", "Auto": "Auto",
  "Sigurnost": "Security", "Postavi PIN zaštitu": "Set PIN Protection", "Aplikacija nije zaštićena": "App is not protected",
  "Promijeni PIN": "Change PIN", "Zaštita aktivna": "Protection active", "pokušaja": "attempts", "Biometrija": "Biometrics",
  "Aktivno": "Active", "Omogući fingerprint/Face ID": "Enable fingerprint/Face ID", "Ukloni PIN zaštitu": "Remove PIN Protection",
  "Unesite trenutni PIN:": "Enter current PIN:", "Ukloni": "Remove", "Pogrešan PIN": "Wrong PIN", "Dijeli i izvezi": "Share & Export",
  "Dijeli podatke": "Share Data", "Podijeli podatke": "Share Data", "Izvezi JSON": "Export JSON", "Izvezi CSV (Excel)": "Export CSV", "Uvezi JSON": "Import JSON",
  "Opasna zona": "Danger Zone", "Obriši sve podatke": "Delete All Data", "Ovo se ne može poništiti!": "This cannot be undone!",
  "Da, obriši": "Yes, Delete", "Autor:": "Author:", "Jezik aplikacije": "App Language", "E-mail, WhatsApp, Telegram…": "E-mail, WhatsApp, Telegram…",
  "Verzija": "Version", "Osobna upotreba · Nije za komercijalnu distribuciju.": "Personal use · Not for commercial distribution.",
  "Sva prava pridržana.": "All rights reserved.", "Aktivna godina": "Active Year", "Prikazana godina": "Displayed Year", 
  "(trenutna)": "(current)", "Upravljaj obvezama": "Manage Obligations", "definiranih obveza": "defined obligations",
  "Prilagodba popisa": "List Customization", "Kategorije troškova": "Expense Categories", "Kategorije primici": "Income Categories",
  "Lokacije": "Locations", "Načini plaćanja": "Payment Methods", "Statusi": "Statuses", "stavki": "items", "Nova stavka…": "New item…", 
  "Uredi": "Edit", "Hrana":"Food","Prijevoz":"Transport","Režije":"Utilities","Kredit":"Loan","Osiguranje":"Insurance","Porez":"Taxes",
  "Zabava":"Entertainment","Pretplata":"Subscription","Putovanja":"Travel","Oprema":"Equipment","Radovi":"Renovations",
  "Usluge":"Services","Investicije":"Investments","Ostali izdaci":"Other Expenses","Plaća":"Salary","Uplata":"Deposit",
  "Ostali primici":"Other Income","Zagreb":"Zagreb","Knežija":"Knežija","Kajini":"Kajini","Šimunčevec":"Šimunčevec",
  "Online":"Online","Ostalo":"Other","Gotovina":"Cash","Kartica (debitna)":"Card (Debit)","Kreditna kartica":"Credit Card",
  "Bankovni prijenos":"Bank Transfer","Online plaćanje":"Online Payment","Unesite PIN za pristup": "Enter PIN to access", 
  "Otključaj": "Unlock", "Zaključano još": "Locked for", "Previše pokušaja!": "Too many attempts!", "do brisanja": "until wipe", 
  "Postavi PIN": "Set PIN", "Potvrdi PIN": "Confirm PIN", "Odaberi PIN (4–6 znamenki)": "Choose PIN (4-6 digits)", 
  "Unesite isti PIN još jednom": "Enter the same PIN again", "Minimalno 4 znamenke": "Min 4 digits", "PIN-ovi se ne poklapaju": "PINs do not match", 
  "Spremi PIN": "Save PIN", "Dalje": "Next", "Preskoči zaštitu": "Skip protection", "Dobrodošli!": "Welcome!", 
  "Ajmo brzo podesiti vašu aplikaciju.": "Let's quickly set up your app.", "Kako se zovete?": "What's your name?",
  "Vaše ime": "Your name", "Tema aplikacije": "App Theme", "Glavna obveza": "Main Obligation", 
  "Unesite svoj najveći mjesečni trošak kako bi vas aplikacija automatski podsjećala na njega.": "Enter your biggest monthly expense so the app can automatically remind you of it.",
  "Naziv troška": "Expense name", "Npr. Stanarina": "E.g. Rent", "Preskoči ovaj korak": "Skip this step",
  "Dijeli / Izvezi": "Share / Export", "Sažetak": "Summary", "CSV tablica": "CSV Table", "Odaberi kanal": "Select Channel", 
  "Kopiraj": "Copy", "Kopirano!": "Copied!", "Preuzmi": "Download",
  // v1.2 — backup/restore, biometry, onboarding, misc
  "Mjesec": "Month", "Tip": "Type", "Korisnik": "User", "Redovna obveza": "Recurring obligation",
  "Posljednjih 10 transakcija:": "Last 10 transactions:", "Generirano:": "Generated:",
  "Sigurnosna kopija": "Backup",
  "Izvezi (Backup)": "Export (Backup)", "Učitaj (Import / Restore)": "Import (Restore)",
  "Napravi kopiju svih podataka u .json datoteci": "Save a backup of all data in a .json file",
  "Vrati podatke iz prethodne kopije": "Restore data from a previous backup",
  "Backup uspješno spremljen.": "Backup saved successfully.",
  "Kopiraj tekst ispod i spremi ga u datoteku ili zalijepi u e-mail / Drive / Keep.": "Copy the text below and save it to a file, or paste it into e-mail / Drive / Keep.",
  "Spremi backup koristeći jednu od opcija ispod. Ako jedna ne radi, druga hoće.": "Save the backup using one of the options below. If one doesn't work, another will.",
  "Podijeli": "Share",
  "Dijeljenje nije podržano na ovom uređaju. Koristi Kopiraj ili Preuzmi.": "Sharing is not supported on this device. Use Copy or Download.",
  "Dijeljenje nije uspjelo. Koristi Kopiraj ili Preuzmi.": "Sharing failed. Use Copy or Download.",
  "Preuzimanje nije uspjelo. Koristi Kopiraj ili Podijeli.": "Download failed. Use Copy or Share.",
  "Podaci su uspješno vraćeni. Aplikacija će se ponovno učitati.": "Data restored successfully. The app will reload.",
  "Datoteka nije valjan Moja lova backup.": "The file is not a valid Moja lova backup.",
  "Greška pri čitanju datoteke.": "Error reading the file.",
  "Vraćanjem podataka trenutni podaci bit će ZAMIJENJENI. Nastaviti?": "Restoring will REPLACE all current data. Continue?",
  "Biometrija otkazana ili neuspješna.": "Biometrics cancelled or failed.",
  "Tvoj uređaj/preglednik ne podržava WebAuthn (Biometriju) ili aplikacija nije na HTTPS protokolu.": "Your device/browser does not support WebAuthn (Biometrics) or the app is not on HTTPS.",
  "Biometrija uspješno aktivirana!": "Biometrics successfully activated!",
  "Postavljanje biometrije nije uspjelo.\nProvjeri je li aplikacija na sigurnoj vezi (HTTPS) i koristiš li podržan uređaj.": "Biometrics setup failed.\nMake sure the app is on a secure connection (HTTPS) and your device is supported.",
  "Jezik": "Language", "Hrvatski": "Croatian", "Engleski": "English",
  "Obveza": "Obligation", "Čeka": "Pending", "Obrada": "Processing", "Rata": "Rate",
  "u tekućoj god.": "in current year", "mj.": "mo.", "obroka preostalo": "installments remaining", "mj. preostalo": "months remaining",
  "Unesite ispravan iznos": "Enter a valid amount", "Unesite opis": "Enter a description",
  "Odaberite kategoriju": "Select a category", "Odaberite lokaciju": "Select a location",
  "Odaberite način plaćanja": "Select a payment method", "Odaberite status": "Select a status"
};

const DEF_LISTS = {
  categories_expense: ["Hrana","Prijevoz","Režije","Kredit","Osiguranje","Porez","Visa premium","Zabava","Pretplata","Putovanja","Oprema","Radovi","Usluge","Investicije","Ostali izdaci"],
  categories_income:  ["Plaća","Uplata","Ostali primici"],
  locations:  ["Zagreb","Knežija","Kajini","Šimunčevec","Online","Ostalo"],
  payments:   ["Gotovina","Kartica (debitna)","Kreditna kartica","Bankovni prijenos","Online plaćanje"],
  statuses:   ["Plaćeno","Čeka plaćanje","U obradi"],
  recurring:  [],
};

const T = {
  dark: {
    bg:"#0D1B2A", card:"#112233", cardAlt:"#162840",
    accent:"#38BDF8", accentDk:"#0EA5E9", accentGlow:"#38BDF830",
    income:"#34D399", expense:"#F87171", warning:"#FBBF24",
    text:"#F1F5F9", textMuted:"#64748B", textSub:"#94A3B8",
    border:"#1E3A5F", navBg:"#0A1628",
  },
  light: {
    bg:"#F8FAFC", card:"#FFFFFF", cardAlt:"#F1F5F9",
    accent:"#0EA5E9", accentDk:"#0284C7", accentGlow:"#0EA5E930",
    income:"#059669", expense:"#DC2626", warning:"#D97706",
    text:"#0F172A", textMuted:"#64748B", textSub:"#475569",
    border:"#CBD5E1", navBg:"#FFFFFF",
  },
};

const CHART_COLORS = ["#38BDF8","#34D399","#F87171","#FBBF24","#A78BFA","#F472B6","#22D3EE","#86EFAC","#FCA5A5","#FCD34D","#C4B5FD","#FB923C"];
const MAX_ATT=5, LOCK_SEC=30, WIPE_AT=10;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtEur = n => {
  if (n == null || isNaN(n)) return "0,00 €";
  const a = Math.abs(n);
  const s = a.toFixed(2).replace(".",",").replace(/\B(?=(\d{3})+(?!\d))/g,".");
  return n < 0 ? `-${s} €` : `${s} €`;
};
const fDate = d => {
  if (!d) return "";
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,"0")}.${String(dt.getMonth()+1).padStart(2,"0")}.${dt.getFullYear()}.`;
};
const monthOf = d => d ? MONTHS[new Date(d).getMonth()] ?? MONTHS[0] : MONTHS[0];
const curMonthIdx = () => new Date().getMonth();
const curYear = () => new Date().getFullYear();
const hashPin = async p => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(p+"ml_salt"));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
};

const K = { db:"ml_data", prf:"ml_prefs", lst:"ml_lists", usr:"ml_user", sec:"ml_sec", drf:"ml_drafts" };
const load = (k,fb) => { try { const v=localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const save = (k,v)  => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// ─── Capacitor native bridge (only when running inside the APK) ──────────────
// The web build stays plain: if @capacitor/* packages aren't installed, these
// imports silently fail and we fall back to Web Share/download paths.
const isCapacitor = () =>
  typeof window !== "undefined"
  && window.Capacitor
  && typeof window.Capacitor.isNativePlatform === "function"
  && window.Capacitor.isNativePlatform();

// Native save — writes the backup JSON to the device's Documents folder using
// @capacitor/filesystem, then offers a share sheet so the user can move it
// (Drive, email…) via @capacitor/share. Returns true on success.
const nativeSaveAndShare = async (filename, content) => {
  if (!isCapacitor()) return false;
  try {
    // Dynamic imports — these packages only exist in the APK build.
    // On Vercel/web the import() call throws and we return false gracefully.
    const [fs, sh] = await Promise.all([
      import("@capacitor/filesystem").catch(() => null),
      import("@capacitor/share").catch(() => null),
    ]);
    if (!fs || !sh) return false;

    const { Filesystem, Directory, Encoding } = fs;
    const { Share } = sh;

    const writeRes = await Filesystem.writeFile({
      path: filename,
      data: content,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    });

    try {
      await Share.share({
        title: "Moja lova — Backup",
        text: filename,
        url: writeRes && writeRes.uri,
        dialogTitle: filename,
      });
    } catch { /* user cancelled share; file is still saved */ }

    return true;
  } catch (e) {
    console.warn("nativeSaveAndShare failed:", e);
    return false;
  }
};

// ─── Icon system ─────────────────────────────────────────────────────────────
const Ic = ({ n, s=20, c="#fff", style={} }) => {
  const p = { fill:"none", stroke:c, strokeWidth:1.7, strokeLinecap:"round", strokeLinejoin:"round" };
  const map = {
    home:        <><path d="M3 12l9-9 9 9"{...p}/><path d="M5 10v10h4v-6h6v6h4V10"{...p}/></>,
    list:        <><line x1="8" y1="6" x2="21" y2="6"{...p}/><line x1="8" y1="12" x2="21" y2="12"{...p}/><line x1="8" y1="18" x2="21" y2="18"{...p}/><circle cx="3" cy="6"  r="1" fill={c} stroke="none"/><circle cx="3" cy="12" r="1" fill={c} stroke="none"/><circle cx="3" cy="18" r="1" fill={c} stroke="none"/></>,
    bar:         <><path d="M18 20V10M12 20V4M6 20v-6"{...p}/></>,
    gear:        <><circle cx="12" cy="12" r="3"{...p}/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"{...p}/></>,
    plus:        <><line x1="12" y1="5" x2="12" y2="19"{...p}/><line x1="5" y1="12" x2="19" y2="12"{...p}/></>,
    check:       <><polyline points="20 6 9 17 4 12"{...p}/></>,
    x:           <><line x1="18" y1="6" x2="6" y2="18"{...p}/><line x1="6" y1="6" x2="18" y2="18"{...p}/></>,
    edit:        <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"{...p}/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"{...p}/></>,
    trash:       <><polyline points="3 6 5 6 21 6"{...p}/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"{...p}/></>,
    search:      <><circle cx="11" cy="11" r="8"{...p}/><line x1="21" y1="21" x2="16.65" y2="16.65"{...p}/></>,
    arrow_l:     <><line x1="19" y1="12" x2="5" y2="12"{...p}/><polyline points="12 19 5 12 12 5"{...p}/></>,
    chevron:     <><polyline points="6 9 12 15 18 9"{...p}/></>,
    chevron_up:  <><polyline points="18 15 12 9 6 15"{...p}/></>,
    chevron_down:<><polyline points="6 9 12 15 18 9"{...p}/></>,
    wallet:      <><rect x="2" y="5" width="20" height="14" rx="2"{...p}/><path d="M2 10h20"{...p}/><circle cx="16" cy="15" r="1" fill={c} stroke="none"/></>,
    up:          <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"{...p}/><polyline points="17 6 23 6 23 12"{...p}/></>,
    down:        <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"{...p}/><polyline points="17 18 23 18 23 12"{...p}/></>,
    coins:       <><circle cx="8" cy="8" r="6"{...p}/><path d="M18.09 10.37A6 6 0 1110.34 18"{...p}/><path d="M7 6h1v4"{...p}/><line x1="16.71" y1="13.88" x2="17.71" y2="13.88"{...p}/></>,
    tag:         <><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"{...p}/><line x1="7" y1="7" x2="7.01" y2="7"{...p}/></>,
    cal:         <><rect x="3" y="4" width="18" height="18" rx="2"{...p}/><line x1="16" y1="2" x2="16" y2="6"{...p}/><line x1="8" y1="2" x2="8" y2="6"{...p}/><line x1="3" y1="10" x2="21" y2="10"/></>,
    user:        <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"{...p}/><circle cx="12" cy="7" r="4"{...p}/></>,
    phone:       <><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 01.22 4.18 2 2 0 012.18 2H5.18a2 2 0 012 1.72c.13.96.36 1.9.63 2.94a2 2 0 01-.45 2.11L6.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c1.04.27 1.98.5 2.94.63A2 2 0 0122 16.92z"{...p}/></>,
    mail:        <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"{...p}/><polyline points="22,6 12,13 2,6"{...p}/></>,
    dl:          <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"{...p}/><polyline points="7 10 12 15 17 10"{...p}/><line x1="12" y1="15" x2="12" y2="3"{...p}/></>,
    ul:          <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"{...p}/><polyline points="17 8 12 3 7 8"{...p}/><line x1="12" y1="3" x2="12" y2="15"{...p}/></>,
    share:       <><circle cx="18" cy="5" r="3"{...p}/><circle cx="6" cy="12" r="3"{...p}/><circle cx="18" cy="19" r="3"{...p}/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"{...p}/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"{...p}/></>,
    copy:        <><rect x="9" y="9" width="13" height="13" rx="2"{...p}/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"{...p}/></>,
    sun:         <><circle cx="12" cy="12" r="5"{...p}/><line x1="12" y1="1" x2="12" y2="3"{...p}/><line x1="12" y1="21" x2="12" y2="23"{...p}/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"{...p}/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"{...p}/><line x1="1" y1="12" x2="3" y2="12"{...p}/><line x1="21" y1="12" x2="23" y2="12"{...p}/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"{...p}/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"{...p}/></>,
    moon:        <><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"{...p}/></>,
    auto:        <><circle cx="12" cy="12" r="9"{...p}/><path d="M12 3v9l4 2"{...p}/></>,
    alert:       <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"{...p}/><line x1="12" y1="9" x2="12" y2="13"{...p}/><line x1="12" y1="17" x2="12.01" y2="17"{...p}/></>,
    pin:         <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"{...p}/><circle cx="12" cy="10" r="3"{...p}/></>,
    card:        <><rect x="1" y="4" width="22" height="16" rx="2"{...p}/><line x1="1" y1="10" x2="23" y2="10"{...p}/></>,
    info:        <><circle cx="12" cy="12" r="10"{...p}/><line x1="12" y1="8" x2="12" y2="12"{...p}/><line x1="12" y1="16" x2="12.01" y2="16"{...p}/></>,
    lock:        <><rect x="3" y="11" width="18" height="11" rx="2"{...p}/><path d="M7 11V7a5 5 0 0110 0v4"{...p}/></>,
    unlock:      <><rect x="3" y="11" width="18" height="11" rx="2"{...p}/><path d="M7 11V7a5 5 0 019.9-1"{...p}/></>,
    finger:      <><path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10"{...p}/><path d="M5 12c0-3.87 3.13-7 7-7s7 3.13 7 7"{...p}/><path d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4"{...p}/><path d="M11 12c0-.55.45-1 1-1s1 .45 1 1v4"{...p}/></>,
    shield:      <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"{...p}/></>,
    repeat:      <><polyline points="17 1 21 5 17 9"{...p}/><path d="M3 11V9a4 4 0 014-4h14"{...p}/><polyline points="7 23 3 19 7 15"{...p}/><path d="M21 13v2a4 4 0 01-4 4H3"{...p}/></>,
    clipboard:   <><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 01-2-2V6a2 2 0 012-2h2"{...p}/><rect x="8" y="2" width="8" height="4" rx="1"{...p}/></>,
    dots:        <><circle cx="12" cy="5" r="2" fill={c} stroke="none"/><circle cx="12" cy="12" r="2" fill={c} stroke="none"/><circle cx="12" cy="19" r="2" fill={c} stroke="none"/></>,
    zap:         <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"{...p}/></>
  };
  return <svg viewBox="0 0 24 24" style={{ width:s, height:s, flexShrink:0, ...style }}>{map[n] ?? null}</svg>;
};

// ─── Small reusable ───────────────────────────────────────────────────────────
const Pill = ({ label, active, color, inactiveColor, onClick }) => (
  <button onClick={onClick} style={{
    padding:"6px 14px", borderRadius:20, cursor:"pointer",
    border:`1.5px solid ${active ? color : "transparent"}`,
    background: active ? `${color}20` : "transparent",
    color: active ? color : (inactiveColor || "#64748B"),
    fontSize:12, fontWeight: active ? 600 : 400,
    whiteSpace:"nowrap", flexShrink:0, transition:"all .2s",
  }}>{label}</button>
);

const StickyHeader = ({ C, icon, title, right }) => (
  <div className="hdr" style={{
    position:"sticky", top:0, zIndex:50,
    background:C.bg, paddingBottom:10,
    paddingLeft:16, paddingRight:16,
    borderBottom:`1px solid ${C.border}`,
  }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <h2 style={{ fontSize:18, fontWeight:700, display:"flex", alignItems:"center", gap:8, color:C.text }}>
        <Ic n={icon} s={18} c={C.accent}/>{title}
      </h2>
      {right ?? null}
    </div>
  </div>
);

// ─── Modali za brzi unos ──────────────────────────────────────────────────────
function QuickAddModal({ C, t, onClose, onSave }) {
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const fld = { width:"100%", height:46, padding:"0 12px", background:C.cardAlt, border:`1.5px solid ${C.border}`, borderRadius:12, color:C.text, fontSize:14 };

  return (
    <div className="fi" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="su" style={{background:C.card,borderRadius:18,width:"100%",maxWidth:340,padding:20,border:`1px solid ${C.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h3 style={{fontSize:16,fontWeight:700,color:C.text,display:"flex",alignItems:"center",gap:6}}><Ic n="zap" s={18} c={C.warning}/> {t("Brzi unos")}</h3>
          <button onClick={onClose} style={{background:C.cardAlt,border:`1px solid ${C.border}`,borderRadius:8,padding:6,cursor:"pointer"}}><Ic n="x" s={14} c={C.textMuted}/></button>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,fontWeight:600,color:C.textMuted,marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:.5}}>{t("Iznos (€)")}</label>
          <input type="number" step="0.01" autoFocus placeholder="0,00" value={amount} onChange={e=>setAmount(e.target.value)} style={{...fld,fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:18,color:C.warning}}/>
        </div>
        <div style={{marginBottom:20}}>
          <label style={{fontSize:11,fontWeight:600,color:C.textMuted,marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:.5}}>{t("Opis / Kratko")}</label>
          <input type="text" placeholder={t("Npr. Stanarina")} value={desc} onChange={e=>setDesc(e.target.value)} style={fld}/>
        </div>
        <button onClick={()=>{ if(amount&&desc){onSave({amount,desc});} }} style={{width:"100%",padding:14,background:`linear-gradient(135deg,${C.warning},#F59E0B)`,border:"none",borderRadius:14,color:"#000",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <Ic n="check" s={16} c="#000"/>{t("Spremi skicu")}
        </button>
      </div>
    </div>
  );
}

function ActionHubModal({ C, t, drafts, onClose, onNew, onSelect, onDel }) {
  return (
    <div className="fi" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="su" style={{background:C.bg,borderRadius:20,width:"100%",maxWidth:360,padding:"20px 16px",border:`1px solid ${C.border}`,boxShadow:`0 10px 40px rgba(0,0,0,0.3)`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{fontSize:16,fontWeight:700,color:C.text}}>{t("Što želite dodati?")}</h3>
          <button onClick={onClose} style={{background:C.cardAlt,border:`1px solid ${C.border}`,borderRadius:8,padding:6,cursor:"pointer"}}><Ic n="x" s={14} c={C.textMuted}/></button>
        </div>
        
        <button onClick={onNew} style={{width:"100%",padding:16,background:`linear-gradient(135deg,${C.accent},${C.accentDk})`,border:"none",borderRadius:14,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:20}}>
          <Ic n="plus" s={18} c="#fff"/> {t("Novi puni unos")}
        </button>

        {drafts.length > 0 && (
          <div>
            <div style={{fontSize:11,fontWeight:600,color:C.textMuted,marginBottom:10,textTransform:"uppercase",letterSpacing:.5,display:"flex",alignItems:"center",gap:6}}>
              <Ic n="zap" s={13} c={C.warning}/> {t("Nedovršene skice")} ({drafts.length})
            </div>
            <div style={{maxHeight:250,overflowY:"auto"}}>
              {drafts.map(d => (
                <div key={d.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:12,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,marginBottom:8}}>
                   <div style={{display:"flex",flexDirection:"column",flex:1,cursor:"pointer",textAlign:"left"}} onClick={()=>onSelect(d)}>
                     <span style={{fontSize:14,fontWeight:600,color:C.text}}>{d.description}</span>
                     <span style={{fontSize:11,color:C.textMuted}}>{fDate(d.date)} · {t("Brzi unos")}</span>
                   </div>
                   <div style={{display:"flex",alignItems:"center",gap:10}}>
                     <span style={{fontSize:15,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:C.warning}}>{fmtEur(d.amount)}</span>
                     <button onClick={()=>onDel(d.id)} style={{background:C.cardAlt,border:`1px solid ${C.border}`,borderRadius:8,padding:6,cursor:"pointer"}}><Ic n="trash" s={14} c={C.expense}/></button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CSV / Summary builders ───────────────────────────────────────────────────
const buildCSV = (txs, t, lang) => {
  const hdr = `${t("Datum")},${t("Mjesec")},${t("Tip")},${t("Opis")},${t("Lokacija")},${t("Kategorija")},${t("Plaćanje")},${t("Iznos (€)")},${t("Status")},${t("Napomene")}\n`;
  const M_Arr = lang === "en" ? MONTHS_EN : MONTHS;
  const rows = txs.map(tx => {
    const mName = M_Arr[new Date(tx.date).getMonth()];
    return `${fDate(tx.date)},${mName},${t(tx.type)},"${tx.description}",${t(tx.location)??""},${t(tx.category)??""},${t(tx.payment)??""},${+tx.amount||0},${t(tx.status)??""},"${tx.notes??""}"`;
  }).join("\n");
  return "\uFEFF" + hdr + rows;
};

const buildSummary = (txs, year, user, t) => {
  const yd  = txs.filter(x => new Date(x.date).getFullYear() === year);
  const inc = yd.filter(x=>x.type==="Primitak").reduce((s,x)=>s+(+x.amount||0),0);
  const exp = yd.filter(x=>x.type==="Isplata").reduce((s,x)=>s+(+x.amount||0),0);
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "—";
  return [
    `${t("Moja lova")} — ${t("Sažetak")} ${year}.`, "",
    `${t("Korisnik")} : ${name}`,
    user.phone  ? `${t("Telefon")}  : ${user.phone}`  : null,
    user.email  ? `${t("E-mail")}   : ${user.email}`  : null,
    "", "═══════════════════════════════",
    `${t("Primici")} : ${fmtEur(inc)}`,
    `${t("Troškovi")}: ${fmtEur(exp)}`,
    `${t("Bilanca")}        : ${fmtEur(inc-exp)}`,
    `${t("Stavki")}    : ${yd.length}`,
    "═══════════════════════════════", "",
    t("Posljednjih 10 transakcija:"),
    ...yd.sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,10)
       .map(x=>`• ${fDate(x.date)}  ${x.type==="Primitak"?"+":"-"}${fmtEur(+x.amount||0).padStart(12)}  ${x.description}`),
    "", `${t("Generirano:")} ${fDate(new Date().toISOString().split("T")[0])}`,
  ].filter(l=>l!==null).join("\n");
};

// ─── LockScreen ──────────────────────────────────────────────────────────────
function LockScreen({ C, sec, onUnlock, onWipe, t }) {
  const [pin, setPin]       = useState("");
  const [err, setErr]       = useState("");
  const [tLeft, setTLeft]   = useState(0);

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
      onUnlock();
    } catch { setErr(t("Biometrija otkazana ili neuspješna.")); }
  }, [onUnlock, sec.bioCredId, t]);

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
    if (isLocked || pin.length < 4) return;
    const h = await hashPin(pin);
    if (h === sec.pinHash) {
      save(K.sec, { ...sec, attempts:0, lockedUntil:null });
      onUnlock();
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

        <button onClick={tryPin} disabled={isLocked||pin.length<4}
          style={{ width:"100%", padding:13, marginBottom:10, background:isLocked||pin.length<4?C.border:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:13, color:"#fff", fontSize:15, fontWeight:700, cursor:isLocked||pin.length<4?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <Ic n="unlock" s={17} c="#fff"/> {t("Otključaj")}
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
  const [step, setStep]   = useState("enter");
  const [pin, setPin]     = useState("");
  const [first, setFirst] = useState("");
  const [err, setErr]     = useState("");

  const PAD = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  const tap = k => { if(!k)return; setErr(""); if(k==="⌫") setPin(p=>p.slice(0,-1)); else if(pin.length<6) setPin(p=>p+k); };

  const next = async () => {
    if (pin.length < 4) { setErr(t("Minimalno 4 znamenke")); return; }
    if (step==="enter") { setFirst(pin); setPin(""); setStep("confirm"); }
    else if (pin !== first) { setErr(t("PIN-ovi se ne poklapaju")); setPin(""); setStep("enter"); setFirst(""); }
    else { onSave(await hashPin(pin)); }
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
            <div key={i} style={{ width:13, height:13, borderRadius:"50%", background:i<pin.length?C.accent:C.border, transition:"background .2s" }}/>
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

        <button onClick={next} disabled={pin.length<4}
          style={{ width:"100%", padding:13, marginBottom:10, background:pin.length<4?C.border:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:13, color:"#fff", fontSize:15, fontWeight:700, cursor:pin.length<4?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
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
function OnboardingScreen({ C, prefs, updPrefs, user, updUser, lists, updLists, updSec, finish, t }) {
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
          onSave={hash => { updSec({pinHash:hash, attempts:0, lockedUntil:null}); finish(); }}
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

// ─── App (root) ───────────────────────────────────────────────────────────────
export default function App() {
  
  const [txs, setTxs] = useState(() => load(K.db, []));
  const [drafts, setDrafts] = useState(() => load(K.drf, []));
  const [prefs,setPrefs]= useState(()=>load(K.prf,{theme:"auto",year:curYear(), onboarded:false, lang:"hr"}));
  const [user, setUser] = useState(()=>load(K.usr,{firstName:"",lastName:"",phone:"",email:""}));
  const [sec,  setSec]  = useState(()=>load(K.sec,{pinHash:null,bioEnabled:false,bioCredId:null,attempts:0,totalFailed:0,lockedUntil:null}));
  const [lists,setLists] = useState(() => load(K.lst, DEF_LISTS));

  const [page, setPage] = useState("dashboard");
  const [editId,setEditId]   = useState(null);
  const [draftEdit,setDraftEdit] = useState(null);
  const [subPg, setSubPg]    = useState(null);
  const [unlocked,setUnlocked] = useState(false);
  const [setupMode, setSetupMode] = useState(false); // shows SetupPin screen from Settings when user has no PIN yet

  // Modal controls
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showActionHub, setShowActionHub] = useState(false);

  // Filters
  const [txFilter, setTxFilter]           = useState("all");
  const [statTab, setStatTab]             = useState("expected");
  const [statMonth, setStatMonth]         = useState("YEAR");
  const [statExpFilter, setStatExpFilter] = useState({recurring:true, rate:true, kredit:true, processing:true});

  const lang = prefs.lang || "hr";
  
  // HR fallback map — when a translation key doesn't read well as-is in Croatian
  // (e.g. "Obveze (short)"), this maps to a clean Croatian display text.
  // Keys present here apply only to Croatian; English uses EN_DICT as before.
  const HR_OVERRIDE = {
    "Obveze (short)": "Obveze",
    "Obroci (short)": "Obroci",
    "Rate (short)": "Rate",
    "Ostalo (short)": "Ostalo",
  };

  const t = useCallback((key) => {
    if (lang === "en" && EN_DICT[key]) return EN_DICT[key];
    if (lang === "hr" && HR_OVERRIDE[key]) return HR_OVERRIDE[key];
    return key;
  }, [lang]);

  const theme = useMemo(()=>{
    if (prefs.theme==="auto") return window.matchMedia?.("(prefers-color-scheme:dark)").matches?"dark":"light";
    return prefs.theme;
  },[prefs.theme]);
  const C = T[theme] ?? T.dark;

  useEffect(()=>save(K.db,txs),[txs]);
  useEffect(()=>save(K.drf,drafts),[drafts]);
  useEffect(()=>save(K.prf,prefs),[prefs]);
  useEffect(()=>save(K.lst,lists),[lists]);
  useEffect(()=>save(K.usr,user),[user]);
  useEffect(()=>save(K.sec,sec),[sec]);
  useEffect(()=>{
    if (!sec.pinHash) return;
    const fn = () => { if (document.hidden) setUnlocked(false); };
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
  },[sec.pinHash]);

  const updP = p => setPrefs(v=>({...v,...p}));
  const updU = p => setUser(v=>({...v,...p}));
  const updS = p => setSec(v=>({...v,...p}));

  const addTx = tx => {
    const inst = parseInt(tx.installments) || 0;
    if (inst > 1) {
      const tot = parseFloat(tx.amount) || 0;
      const mo  = Math.round(tot/inst*100)/100;
      const rem = Math.round((tot - mo*inst)*100)/100;
      const gid = Date.now().toString();
      const sd  = new Date(tx.date);
      const isYearly = tx.installmentPeriod === "Y";
      
      const arr = [];
      for (let i=0; i<inst; i++) {
        const d = new Date(sd.getFullYear() + (isYearly ? i : 0), sd.getMonth() + (isYearly ? 0 : i), Math.min(sd.getDate(),28));
        let itemStatus = "Čeka plaćanje";
        if (tx.payment === "Kartica (debitna)" && i === 0) itemStatus = "Plaćeno";
        arr.push({
          ...tx,
          id:`${gid}_${i}`, installmentGroup:gid,
          installmentNum:i+1, installmentTotal:inst,
          amount: i===0 ? mo+rem : mo,
          date: d.toISOString().split("T")[0],
          status: itemStatus,
          description:`${tx.description} (${i+1}/${inst})`,
          notes: tx.notes ? `${tx.notes} | ${t("Obrok")} ${i+1}/${inst}` : `${t("Obrok")} ${i+1}/${inst} · ${fmtEur(tot)}`,
        });
      }
      setTxs(p=>[...p,...arr]);
    } else {
      setTxs(p=>[...p, { ...tx, id:Date.now().toString(), installments:0 }]);
    }
    setPage("dashboard");
  };

  const updTx  = tx => { setTxs(p=>p.map(x=>x.id===tx.id?tx:x)); setEditId(null); setPage("transactions"); };
  const delTx  = id => setTxs(p=>p.filter(x=>x.id!==id));
  const delGrp = g  => setTxs(p=>p.filter(x=>x.installmentGroup!==g));

  const wipe = () => {
    setTxs([]); setDrafts([]); save(K.db,[]); save(K.drf,[]);
    setSec({pinHash:null,bioEnabled:false,bioCredId:null,attempts:0,totalFailed:0,lockedUntil:null});
    setUnlocked(true);
    updP({onboarded: false});
  };

  const gs = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
    html,body,#root{width:100%;min-height:100vh;background:${C.bg};}
    input,select,textarea{font-family:inherit;}
    input:focus,select:focus,textarea:focus{outline:none;border-color:${C.accent}!important;}
    ::-webkit-scrollbar{width:3px;} ::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px;}
    @keyframes su{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fi{from{opacity:0}to{opacity:1}}
    .su{animation:su .25s ease-out both} .fi{animation:fi .2s ease-out both}
    input[type=date]::-webkit-calendar-picker-indicator{filter:${theme==="dark"?"invert(1)":"none"};opacity:.5;}
    select{appearance:none;-webkit-appearance:none;}
    select.empty{color:${C.textMuted};}
    select:not(.empty){color:${C.text};}
    button{font-family:inherit;}
    .hdr{padding-top:max(14px, env(safe-area-inset-top));}
  `;

  const wrap = { background:C.bg, minHeight:"100vh", width:"100%", color:C.text, fontFamily:"'Inter',sans-serif", maxWidth:480, margin:"0 auto", transition:"background .3s,color .3s" };

  if (!prefs.onboarded) {
    return (
      <div style={wrap}><style>{gs}</style>
        <OnboardingScreen C={C} prefs={prefs} updPrefs={updP} user={user} updUser={updU} lists={lists} updLists={setLists} updSec={updS} t={t} finish={() => { updP({onboarded:true}); setUnlocked(true); }} />
      </div>
    );
  }

  if (sec.pinHash && !unlocked) return (
    <div style={wrap}><style>{gs}</style>
    <LockScreen C={C} sec={sec} t={t}
      onUnlock={()=>{ updS({attempts:0,lockedUntil:null}); setUnlocked(true); }}
      onWipe={wipe}
    />
    </div>
  );

  // Setup-PIN screen invoked from Settings when user has no PIN yet.
  if (setupMode) {
    return (
      <div style={wrap}><style>{gs}</style>
        <SetupPin C={C} isChange={false} t={t}
          onSave={hash => { setSec(v=>({...v, pinHash:hash, attempts:0, totalFailed:0, lockedUntil:null})); setSetupMode(false); }}
          onSkip={() => setSetupMode(false)}
        />
      </div>
    );
  }

  const shared = { C, year:prefs.year, lists, user, t, lang };

  return (
    <div style={{ ...wrap, paddingBottom:88 }}>
      <style>{gs}</style>

      {page==="dashboard"    && <Dashboard    {...shared} data={txs} setPage={setPage} onQuickAdd={()=>setShowQuickAdd(true)}/>}
      {page==="add"          && <TxForm {...shared} draft={draftEdit} onSubmit={tx=>{ addTx(tx); if(draftEdit){ setDrafts(p=>p.filter(d=>d.id!==draftEdit.id)); setDraftEdit(null); } }} onCancel={()=>{ setPage("dashboard"); setDraftEdit(null); }} onGoRecurring={()=>setPage("recurring")}/>}
      {page==="edit"         && <TxForm {...shared} tx={txs.find(x=>x.id===editId)} onSubmit={updTx} onCancel={()=>{ setEditId(null); setPage("transactions"); }}/>}
      {page==="transactions" && <TxList {...shared} data={txs} filter={txFilter} setFilter={setTxFilter} onEdit={id=>{ setEditId(id); setPage("edit"); }} onDelete={delTx} onDeleteGroup={delGrp} onPay={id=>setTxs(p=>p.map(x=>x.id===id?{...x,status:"Plaćeno",date:new Date().toISOString().split("T")[0]}:x))}/>}
      {page==="charts"       && <Charts {...shared} data={txs} tab={statTab} setTab={setStatTab} selMonth={statMonth} setSelMonth={setStatMonth} expFilter={statExpFilter} setExpFilter={setStatExpFilter}/>}
      {page==="recurring"    && <RecurringScreen {...shared} data={txs} setTxs={setTxs} onBack={()=>setPage("dashboard")}/>}
      {page==="settings"     && <Settings {...shared} txs={txs} setTxs={setTxs} prefs={prefs} updPrefs={updP} updUser={updU} sec={sec} updSec={updS} lists={lists} setLists={setLists} subPg={subPg} setSubPg={setSubPg} setUnlocked={setUnlocked} setSetupMode={setSetupMode}/>}

      {showQuickAdd && <QuickAddModal C={C} t={t} onClose={()=>setShowQuickAdd(false)} onSave={d => { setDrafts(p=>[{id:Date.now().toString(), amount:d.amount, description:d.desc, date:new Date().toISOString()}, ...p]); setShowQuickAdd(false); }}/>}
      {showActionHub && <ActionHubModal C={C} t={t} drafts={drafts} onClose={()=>setShowActionHub(false)} onNew={()=>{ setPage("add"); setDraftEdit(null); setShowActionHub(false); }} onSelect={d=>{ setDraftEdit(d); setPage("add"); setShowActionHub(false); }} onDel={id=>setDrafts(p=>p.filter(d=>d.id!==id))}/>}

      <nav style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, background:C.navBg, borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-around", padding:"6px 0 16px", zIndex:100, backdropFilter:"blur(12px)" }}>
        {[["dashboard","home","Početna"],["transactions","list","Transakcije"],["add","plus",""],["charts","bar","Statistika"],["settings","gear","Postavke"]].map(([id,ic,lb])=>(
          <button key={id} onClick={()=>{
            if (id === "add") {
              if (drafts.length > 0) {
                setShowActionHub(true);
              } else {
                setDraftEdit(null);
                setPage("add");
                setSubPg(null);
              }
            } else {
              setPage(id); setSubPg(null);
            }
          }} style={{ background:"none", border:"none", display:"flex", flexDirection:"column", alignItems:"center", gap:3, cursor:"pointer", padding:"4px 10px", borderRadius:10 }}>
            {id==="add"
              ? <div style={{ width:46, height:46, borderRadius:16, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:"flex", alignItems:"center", justifyContent:"center", marginTop:-24, boxShadow:`0 4px 18px ${C.accentGlow}` }}><Ic n="plus" s={22} c="#fff"/></div>
              : <><Ic n={ic} s={20} c={page===id?C.accent:C.textMuted}/><span style={{ fontSize:10, color:page===id?C.accent:C.textMuted, fontWeight:page===id?600:400 }}>{t(lb)}</span></>
            }
          </button>
        ))}
      </nav>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ C, data, year, user, lists, setPage, onQuickAdd, t, lang }) {
  const cmIdx = curMonthIdx();
  const cm  = MONTHS[cmIdx]; 
  const cmName = lang==="en" ? MONTHS_EN[cmIdx] : cm;

  const yd  = data.filter(x=>new Date(x.date).getFullYear()===year);
  const md  = yd.filter(x=>monthOf(x.date)===cm);
  
  const inc = yd.filter(x=>x.type==="Primitak").reduce((s,x)=>s+(+x.amount||0),0);
  const exp = yd.filter(x=>x.type==="Isplata").reduce((s,x)=>s+(+x.amount||0),0);
  const bal = inc - exp;
  
  const mI  = md.filter(x=>x.type==="Primitak").reduce((s,x)=>s+(+x.amount||0),0);
  const mE  = md.filter(x=>x.type==="Isplata" && x.status==="Plaćeno").reduce((s,x)=>s+(+x.amount||0),0);
  
  const pendingMonth = useMemo(() => {
    const pendingTxs = md.filter(x => x.status === "Čeka plaćanje" || x.status === "U obradi").reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
    const rec = lists.recurring || [];
    const recTxsIds = new Set(md.filter(x => x.recurringId).map(x => x.recurringId));
    const unpaidRecSum = rec.filter(r => !recTxsIds.has(r.id)).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    return pendingTxs + unpaidRecSum;
  }, [md, lists.recurring]);

  const catsMonth = useMemo(() => {
    const m={};
    md.filter(x=>x.type==="Isplata").forEach(x=>{ m[x.category]=(m[x.category]||0)+(+x.amount||0); });
    return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  },[md]);

  const mBar = useMemo(()=>MONTHS.map((m,i)=>{
    const mt = yd.filter(x=>monthOf(x.date)===m);
    const mLabel = (lang==="en" ? MSHORT_EN : MSHORT)[i];
    return { name:mLabel, P:mt.filter(x=>x.type==="Primitak").reduce((s,x)=>s+(+x.amount||0),0), T:mt.filter(x=>x.type==="Isplata").reduce((s,x)=>s+(+x.amount||0),0) };
  }),[yd, lang]);

  const now = new Date();
  const wd  = now.toLocaleDateString(lang==="en"?"en-US":"hr-HR",{weekday:"short"}).replace(".","").toUpperCase();
  const dd  = String(now.getDate()).padStart(2,"0");
  const mm  = String(now.getMonth()+1).padStart(2,"0");
  const yy  = now.getFullYear();
  const W   = Math.min(window.innerWidth??480,480)-64;
  const tt  = { contentStyle:{background:C.cardAlt,border:`1px solid ${C.border}`,borderRadius:10,color:C.text,fontSize:11}, formatter:v=>fmtEur(v) };
  const dn  = [user.firstName, user.lastName].filter(Boolean).join(" ");

  const cards = [
    { icon:<Ic n="up"    s={13} c={C.income}/>,  label:`${cmName} ${t("primici")}`,        val:fmtEur(mI),            color:C.income  },
    { icon:<Ic n="down"  s={13} c={C.expense}/>, label:`${cmName} ${t("plaćeno")}`,        val:fmtEur(mE),            color:C.expense },
    { icon:<Ic n="coins" s={13} c={C.warning}/>, label:`${cmName} ${t("čekaju")}`,         val:fmtEur(pendingMonth), color:C.warning },
    { icon:<Ic n="coins" s={13} c={C.accentDk}/>, label:t("Prosjek/mj."),         val:fmtEur(exp/12),       color:C.accentDk },
  ];

  return (
    <div className="fi" style={{ width:"100%" }}>
      <div className="hdr" style={{ position:"sticky", top:0, zIndex:50, background:C.bg, paddingBottom:10, paddingLeft:16, paddingRight:16, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, display:"flex", alignItems:"center", gap:8, color:C.accent }}>
              <Ic n="wallet" s={22} c={C.accent}/> {t("Moja lova")} <span style={{fontSize:14,color:C.textMuted,fontWeight:500}}>· {year}.</span>
            </h1>
            {dn && <span style={{ fontSize:12, color:C.textMuted, display:"flex", alignItems:"center", gap:4, marginTop:3 }}><span style={{ width:6, height:6, borderRadius:"50%", background:C.income, display:"inline-block" }}/>{t("Bok,")} {user.firstName || dn}!</span>}
          </div>
          <button onClick={onQuickAdd} style={{ background:`${C.warning}18`, border:`1px solid ${C.warning}50`, borderRadius:12, padding:"6px 10px", fontSize:12, fontWeight:700, color:C.warning, display:"flex", alignItems:"center", gap:5, cursor:"pointer", boxShadow:`0 2px 10px ${C.warning}20` }}>
            <Ic n="zap" s={14} c={C.warning}/> {t("Brzi unos")}
          </button>
        </div>
      </div>

      <div style={{ padding:"12px 16px 0" }}>
        <div className="su" style={{ background:`linear-gradient(135deg,${C.accent}22,${bal>=0?C.income:C.expense}18)`, border:`1px solid ${bal>=0?C.income:C.expense}40`, borderRadius:18, padding:"16px 18px 16px 16px", marginBottom:10, position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:12, right:6, textAlign:"right" }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.textSub, letterSpacing:.3 }}>{wd}</div>
            <div style={{ fontSize:13, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:C.textSub }}>{dd}.{mm}.</div>
            <div style={{ fontSize:10, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:C.textMuted, marginTop:1 }}>{yy}.</div>
          </div>
          <div style={{ fontSize:11, color:C.textSub, marginBottom:4, textAlign:"left" }}>{t("Bilanca")} {year}.</div>
          <div style={{ fontSize:28, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:bal>=0?C.income:C.expense, textAlign:"left", paddingRight:65 }}>{fmtEur(bal)}</div>
          <div style={{ position:"absolute", right:-20, top:-20, width:90, height:90, borderRadius:"50%", background:`${bal>=0?C.income:C.expense}10` }}/>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
          {cards.map(({icon,label,val,color},i)=>(
            <div key={label} className="su" style={{ background:C.card, border:`1px solid ${C.border}`, borderLeft:`3px solid ${color}`, borderRadius:14, padding:"10px 12px", animationDelay:`${i*.05}s` }}>
              <div style={{ fontSize:10, color:C.textMuted, marginBottom:3, display:"flex", alignItems:"center", gap:4 }}>{icon}{label}</div>
              <div style={{ fontSize:14, fontWeight:700, color, fontFamily:"'JetBrains Mono',monospace" }}>{val}</div>
            </div>
          ))}
        </div>

        {yd.length === 0 ? (
          <div className="su" style={{ background:C.cardAlt, border:`1px dashed ${C.border}`, borderRadius:16, padding:"24px 20px", textAlign:"center", marginTop:16 }}>
            <div style={{ width:56, height:56, borderRadius:20, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", boxShadow:`0 4px 15px ${C.accentGlow}` }}>
              <Ic n="plus" s={28} c="#fff"/>
            </div>
            <h3 style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:8 }}>{t("Vrijeme je za prvi unos!")}</h3>
            <p style={{ fontSize:13, color:C.textMuted, lineHeight:1.5 }}>{t("Pritisnite plavi plus gumb na dnu ekrana i zabilježite svoj prvi trošak ili primitak. Statistike će se pojaviti automatski.")}</p>
          </div>
        ) : (
          <>
            <div className="su" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"10px 10px 6px", marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:600, color:C.textMuted, marginBottom:6, display:"flex", alignItems:"center", gap:5 }}>
                <Ic n="bar" s={12} c={C.textMuted}/>{t("Primici vs Troškovi")} — {year}.
              </div>
              <BarChart width={W} height={130} data={mBar} barGap={1} barCategoryGap="35%">
                <XAxis dataKey="name" tick={{fill:C.textMuted,fontSize:8}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:C.textMuted,fontSize:8}} axisLine={false} tickLine={false} width={32} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
                <Tooltip {...tt}/>
                <Bar dataKey="P" name={t("Primici")}  fill={C.income}  radius={[3,3,0,0]}/>
                <Bar dataKey="T" name={t("Troškovi")} fill={C.expense} radius={[3,3,0,0]}/>
              </BarChart>
            </div>

            {catsMonth.length>0 && (
              <div className="su" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"10px 12px", marginBottom:12 }}>
                <div style={{ fontSize:11, fontWeight:600, color:C.textMuted, marginBottom:10, display:"flex", alignItems:"center", gap:5 }}>
                  <Ic n="tag" s={12} c={C.textMuted}/>{t("Top kategorije")} · {cmName} {year}.
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ flexShrink:0 }}>
                    <PieChart width={Math.round(W*.38)} height={100}>
                      <Pie data={catsMonth.slice(0,4)} cx="50%" cy="50%" innerRadius={20} outerRadius={45} dataKey="value" stroke="none">
                        {catsMonth.slice(0,4).map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                      </Pie>
                    </PieChart>
                  </div>
                  <div style={{ flex:1, maxHeight:100, overflowY:"auto", paddingRight:4 }}>
                    {catsMonth.map((c,i)=>(
                      <div key={c.name} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom: i<catsMonth.length-1?`1px solid ${C.border}40`:"none", fontSize:11 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ width:7, height:7, borderRadius:2, background:CHART_COLORS[i%CHART_COLORS.length], flexShrink:0 }}/>
                          <span style={{ color:C.textSub, maxWidth:80, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t(c.name)}</span>
                        </div>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:600, fontSize:11 }}>{fmtEur(c.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── TxForm ───────────────────────────────────────────────────────────────────
function TxForm({ C, tx, draft, lists, onSubmit, onCancel, onGoRecurring, t }) {
  const init = tx ?? (draft ? {
    date: draft.date.split("T")[0],
    type: "Isplata",
    description: draft.description,
    amount: draft.amount,
    category: "", location: "", payment: "", status: "", notes: "", installments: 0, installmentPeriod: "M"
  } : {
    date: new Date().toISOString().split("T")[0],
    type: "Isplata",
    description: "",
    category: "", location: "", payment: "", status: "", amount: "", notes: "", installments: 0, installmentPeriod: "M"
  });

  const [form, setForm] = useState(init);
  const upd = patch => setForm(f=>({...f,...patch}));

  // Error state for inline validation feedback (replaces silent returns).
  const [err, setErr] = useState({ msg: "", field: "" });
  const clearErr = () => setErr({ msg: "", field: "" });

  const [showInstSetup, setShowInstSetup] = useState(false);
  const [tempInst, setTempInst] = useState(form.installments || 3);
  const [tempPeriod, setTempPeriod] = useState(form.installmentPeriod || "M");

  const inst      = parseInt(form.installments) || 0;
  const isGotov   = form.payment === "Gotovina";
  const isPrimitak= form.type === "Primitak";
  const cats      = isPrimitak ? lists.categories_income : lists.categories_expense;
  // Cards don't apply to incoming money; filter them out for Primitak.
  const CARD_PAYMENTS = ["Kartica (debitna)", "Kreditna kartica"];
  const payments  = isPrimitak
    ? lists.payments.filter(p => !CARD_PAYMENTS.includes(p))
    : (inst>1 ? lists.payments.filter(p=>p!=="Gotovina") : lists.payments);

  // On type change (only for new/draft entries): reset category; auto-fill status
  // for Primitak since income is always received when entered (no "waiting" state).
  // Also clear payment if it's a card and user switched to Primitak.
  useEffect(()=>{
    if (!tx && !draft) {
      upd({
        category: "",
        status: isPrimitak ? "Plaćeno" : "",
        payment: isPrimitak && CARD_PAYMENTS.includes(form.payment) ? "" : form.payment,
      });
    } else if (tx && isPrimitak) {
      if (!form.status) upd({ status: "Plaćeno" });
      if (CARD_PAYMENTS.includes(form.payment)) upd({ payment: "" });
    }
  },[form.type]);
  useEffect(()=>{ if (isGotov && inst>1) upd({ installments:0 }); },[form.payment]);
  useEffect(()=>{ if (inst>1 && isGotov) upd({ payment: lists.payments.find(p=>p!=="Gotovina") ?? lists.payments[0] }); },[form.installments]);

  const fld = { width:"100%", height:46, padding:"0 12px", background:C.cardAlt, border:`1.5px solid ${C.border}`, borderRadius:12, color:C.text, fontSize:14 };
  const lbl = { fontSize:11, fontWeight:600, color:C.textMuted, marginBottom:5, display:"flex", alignItems:"center", gap:5, letterSpacing:.3, textTransform:"uppercase" };

  const submit = () => {
    clearErr();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0)   { setErr({ msg: t("Unesite ispravan iznos"),    field:"amount"      }); return; }
    if (!form.description.trim()) { setErr({ msg: t("Unesite opis"),              field:"description" }); return; }
    if (!form.category)           { setErr({ msg: t("Odaberite kategoriju"),      field:"category"    }); return; }
    if (!form.location)           { setErr({ msg: t("Odaberite lokaciju"),        field:"location"    }); return; }
    if (!form.payment)            { setErr({ msg: t("Odaberite način plaćanja"),  field:"payment"     }); return; }
    if (inst <= 1 && !form.status){ setErr({ msg: t("Odaberite status"),          field:"status"      }); return; }
    onSubmit({ ...form, amount, installments: inst });
  };

  // Error-aware field border colour helper.
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

        <div style={{ display:"grid", gridTemplateColumns:tx?"1fr 1fr":"1fr 1fr 1fr", gap:8, marginBottom:16 }}>
          {["Isplata",!tx&&"Obveze","Primitak"].filter(Boolean).map(x=>{
            if (x==="Obveze") return (
              <button key="Obveze" onClick={onGoRecurring}
                style={{ padding:12, border:`2px solid ${C.warning}40`, borderRadius:14, background:`${C.warning}10`, color:C.warning, fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
                <Ic n="repeat" s={15} c={C.warning}/>{t("Obveze")}
              </button>
            );
            return (
              <button key={x} onClick={()=>upd({type:x})}
                style={{ padding:12, border:`2px solid ${form.type===x?(x==="Primitak"?C.income:C.expense):C.border}`, borderRadius:14, background:form.type===x?(x==="Primitak"?`${C.income}15`:`${C.expense}15`):"transparent", color:form.type===x?(x==="Primitak"?C.income:C.expense):C.textMuted, fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
                <Ic n={x==="Primitak"?"up":"down"} s={15} c={form.type===x?(x==="Primitak"?C.income:C.expense):C.textMuted}/>{t(x)}
              </button>
            );
          })}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <label style={lbl}><Ic n="cal" s={11} c={C.textMuted}/>{t("Datum")}</label>
              <input type="date" value={form.date} onChange={e=>upd({date:e.target.value})} style={fld}/>
            </div>
            <div>
              <label style={lbl}><Ic n="coins" s={11} c={C.textMuted}/>{t("Iznos (€)")}</label>
              <input type="number" step="0.01" min="0" placeholder="0,00" value={form.amount}
                onChange={e=>{ upd({amount:e.target.value}); clearErr(); }}
                style={{...fld, fontFamily:"'JetBrains Mono',monospace", fontWeight:600, borderColor:bd("amount")}}/>
            </div>
          </div>

          <div>
            <label style={lbl}><Ic n="edit" s={11} c={C.textMuted}/>{t("Opis")}</label>
            <input type="text" placeholder="" value={form.description}
              onChange={e=>{ upd({description:e.target.value}); clearErr(); }} style={{...fld, borderColor:bd("description")}}/>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <label style={lbl}><Ic n="tag" s={11} c={C.textMuted}/>{t("Kategorija")}</label>
              <select value={form.category} onChange={e=>{ upd({category:e.target.value}); clearErr(); }} style={{...fld, color:!form.category?C.textMuted:C.text, borderColor:bd("category")}}>
                <option value="" disabled>{t("- odabrati -")}</option>
                {cats.map(c=><option key={c} value={c}>{t(c)}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}><Ic n="pin" s={11} c={C.textMuted}/>{t("Lokacija")}</label>
              <select value={form.location} onChange={e=>{ upd({location:e.target.value}); clearErr(); }} style={{...fld, color:!form.location?C.textMuted:C.text, borderColor:bd("location")}}>
                <option value="" disabled>{t("- odabrati -")}</option>
                {lists.locations.map(l=><option key={l} value={l}>{t(l)}</option>)}
              </select>
            </div>
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

          <div style={{ display:"grid", gridTemplateColumns:(inst>1 || isPrimitak)?"1fr":"1fr 1fr", gap:10 }}>
            <div>
              <label style={lbl}><Ic n="card" s={11} c={C.textMuted}/>{t("Plaćanje")}</label>
              <select value={form.payment} onChange={e=>{ upd({payment:e.target.value}); clearErr(); }} style={{...fld, color:!form.payment?C.textMuted:C.text, borderColor:bd("payment")}}>
                <option value="" disabled>{t("- odabrati -")}</option>
                {payments.map(p=><option key={p} value={p}>{t(p)}</option>)}
              </select>
            </div>
            {inst <= 1 && !isPrimitak && (
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
        </div>

        {err.msg && (
          <div className="fi" style={{ marginTop:14, padding:"10px 14px", background:`${C.expense}15`, border:`1px solid ${C.expense}50`, borderRadius:12, display:"flex", alignItems:"center", gap:8 }}>
            <Ic n="alert" s={16} c={C.expense}/>
            <span style={{ fontSize:13, color:C.expense, fontWeight:600 }}>{err.msg}</span>
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

// ─── TxList ───────────────────────────────────────────────────────────────────
function TxList({ C, data, year, filter, setFilter, onEdit, onDelete, onDeleteGroup, onPay, t }) {
  const [q, setQ]          = useState("");
  const [delCfm,setDelCfm] = useState(null);
  const [grpCfm,setGrpCfm] = useState(null);

  const rows = useMemo(()=>{
    let f = data.filter(x=>new Date(x.date).getFullYear()===year);
    if (filter==="expense")  f = f.filter(x=>x.type==="Isplata" && x.status==="Plaćeno");
    if (filter==="income")   f = f.filter(x=>x.type==="Primitak");
    if (filter==="pending")  f = f.filter(x=>x.status==="Čeka plaćanje");
    if (filter==="processing") f = f.filter(x=>x.status==="U obradi");
    
    if (q) f = f.filter(x=>x.description?.toLowerCase().includes(q.toLowerCase())||x.category?.toLowerCase().includes(q.toLowerCase()));
    
    if (filter === "pending" || filter === "processing") {
        return f.sort((a,b)=>new Date(a.date)-new Date(b.date));
    }
    return f.sort((a,b)=>new Date(b.date)-new Date(a.date));
  },[data,filter,q,year]);

  return (
    <div className="fi" style={{ width:"100%" }}>
      <StickyHeader C={C} icon="list" title={`${t("Transakcije")} · ${year}.`}/>
      <div style={{ padding:"12px 16px 0" }}>
        <div style={{ position:"relative", marginBottom:10 }}>
          <input type="text" placeholder={t("Pretraži…")} value={q} onChange={e=>setQ(e.target.value)}
            style={{ width:"100%", padding:"11px 14px 11px 40px", background:C.cardAlt, border:`1.5px solid ${C.border}`, borderRadius:12, color:C.text, fontSize:13 }}/>
          <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }}><Ic n="search" s={16} c={C.textMuted}/></span>
        </div>

        <div style={{ display:"flex", gap:6, marginBottom:12, overflowX:"auto", paddingBottom:4 }}>
          {[
            ["all",t("Sve")],
            ["expense",t("Plaćeno")],
            ["pending",t("Čeka plaćanje")],
            ["processing",t("U obradi")],
            ["income",t("Primici")]
          ].map(([id,lb])=>(
            <Pill key={id} label={lb} active={filter===id} 
              color={id==="pending" ? "#F87171" : id==="processing" ? "#FB923C" : id==="expense" ? C.income : id==="income" ? C.income : C.accent} 
              inactiveColor={id==="pending" ? "#FB923C" : undefined}
              onClick={()=>setFilter(id)}/>
          ))}
        </div>

        {rows.length===0
          ? <div style={{ textAlign:"center", padding:50, color:C.textMuted }}>
              <Ic n="list" s={44} c={C.border} style={{ marginBottom:12, opacity:.3 }}/>
              <p style={{ fontSize:14, fontWeight:600, color:C.text }}>{t("Nema transakcija")}</p>
              <p style={{ fontSize:12, marginTop:4 }}>{q ? t("Pokušajte s drugim pojmom za pretragu.") : filter !== "all" ? t("Nema stavki za odabrani filter.") : t("Pritisnite + za dodavanje.")}</p>
            </div>
          : rows.map((tx,i)=>(
            <div key={tx.id} className="su" style={{ background:C.card, border:`1px solid ${C.border}`, borderLeft:`3px solid ${tx.installmentGroup?C.warning:tx.type==="Primitak"?C.income:C.expense}`, borderRadius:14, padding:13, marginBottom:8, animationDelay:`${i*.02}s` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"stretch" }}>
                <div style={{ flex:1, minWidth:0, textAlign:"left" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                    <span style={{ fontWeight:600, fontSize:14, color:C.text }}>{tx.description}</span>
                    {tx.installmentGroup && <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:10, background:`${C.warning}20`, color:C.warning }}>{tx.installmentNum}/{tx.installmentTotal}</span>}
                  </div>
                  <div style={{ fontSize:11, color:C.textMuted, marginTop:3 }}>{fDate(tx.date)} · {t(tx.category)} · {t(tx.location)}</div>
                  <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{t(tx.payment)} · <span style={{ color:tx.status==="Plaćeno"?C.income:tx.status==="U obradi"?"#FB923C":C.warning }}>{t(tx.status)}</span></div>
                </div>
                
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", flexShrink:0, marginLeft:10 }}>
                  <div style={{ fontSize:15, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:tx.type==="Primitak"?C.income:C.expense }}>{tx.type==="Primitak"?"+":"-"}{fmtEur(+tx.amount)}</div>
                  <div style={{ display:"flex", gap:5, marginTop:"auto", justifyContent:"flex-end" }}>
                    {(tx.status==="Čeka plaćanje" || tx.status==="U obradi") && <button title={t("Plati")} onClick={()=>onPay(tx.id)} style={{ background:`${C.income}18`, border:`1px solid ${C.income}40`, borderRadius:8, padding:"5px 8px", cursor:"pointer" }}><Ic n="check" s={13} c={C.income}/></button>}
                    <button title={t("Uredi")} onClick={()=>onEdit(tx.id)} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"5px 8px", cursor:"pointer" }}><Ic n="edit" s={13} c={C.accent}/></button>
                    {tx.installmentGroup && grpCfm!==tx.id
                      ? <button title={t("Obriši")} onClick={()=>setGrpCfm(tx.id)} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"5px 8px", cursor:"pointer" }}><Ic n="trash" s={13} c={C.expense}/></button>
                      : !tx.installmentGroup && (
                          delCfm===tx.id
                          ? <button onClick={()=>{ onDelete(tx.id); setDelCfm(null); }} style={{ background:C.expense, border:"none", borderRadius:8, padding:"5px 10px", cursor:"pointer", color:"#fff", fontSize:11, fontWeight:700 }}>{t("Obriši!")}</button>
                          : <button title={t("Obriši")} onClick={()=>setDelCfm(tx.id)} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"5px 8px", cursor:"pointer" }}><Ic n="trash" s={13} c={C.expense}/></button>
                        )
                    }
                  </div>
                </div>
              </div>

              {tx.installmentGroup && grpCfm===tx.id && (
                <div style={{ marginTop:10, padding:"10px 12px", background:`${C.expense}10`, borderRadius:10, border:`1px solid ${C.expense}30`, textAlign:"left" }}>
                  <p style={{ fontSize:11, color:C.textMuted, marginBottom:8 }}>{t("Što obrisati?")}</p>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={()=>{ onDelete(tx.id); setGrpCfm(null); }} style={{ flex:1, padding:"8px 4px", background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:11, cursor:"pointer" }}>{t("Ovaj obrok")}</button>
                    <button onClick={()=>{ onDeleteGroup(tx.installmentGroup); setGrpCfm(null); }} style={{ flex:1, padding:"8px 4px", background:C.expense, border:"none", borderRadius:8, color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>{t("Sve obroke")} ({tx.installmentTotal})</button>
                    <button onClick={()=>setGrpCfm(null)} title={t("Zatvori")} style={{ padding:"8px 10px", background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, color:C.textMuted, cursor:"pointer" }}><Ic n="x" s={12} c={C.textMuted}/></button>
                  </div>
                </div>
              )}
              {tx.notes && <div style={{ fontSize:11, color:C.textMuted, marginTop:7, fontStyle:"italic", borderTop:`1px solid ${C.border}`, paddingTop:7, textAlign:"left" }}>💬 {tx.notes}</div>}
            </div>
          ))
        }
        <div style={{ textAlign:"center", padding:"10px 0", color:C.textMuted, fontSize:12 }}>{rows.length} transakcija · {year}.</div>
      </div>
    </div>
  );
}

// ─── Statistika (Charts) ──────────────────────────────────────────────────────
function Charts({ C, data, year, lists, tab, setTab, selMonth, setSelMonth, expFilter, setExpFilter, t, lang }) {
  const isYear = selMonth === "YEAR";
  const isAll = selMonth === "ALL";
  const isMonth = !isYear && !isAll;

  const yd = data.filter(x=>new Date(x.date).getFullYear()===year);
  const fd = isMonth ? yd.filter(x=>monthOf(x.date)===selMonth) : yd;
  const W  = Math.min(window.innerWidth??480,480)-64;
  const tt = { contentStyle:{background:C.cardAlt,border:`1px solid ${C.border}`,borderRadius:10,color:C.text,fontSize:11}, formatter:v=>fmtEur(v) };
  const curMIdx = new Date().getMonth();
  const rec = lists.recurring || [];

  const mBar  = useMemo(()=>MONTHS.map((m,i)=>{
    const mt=yd.filter(x=>monthOf(x.date)===m);
    const recAmt = rec.reduce((s,r)=>s+(+r.amount||0),0);
    const mLabel = (lang==="en" ? MSHORT_EN : MSHORT)[i];
    return{
      name:mLabel,
      [t("Primici")]:mt.filter(x=>x.type==="Primitak").reduce((s,x)=>s+(+x.amount||0),0),
      [t("Troškovi")]:mt.filter(x=>x.type==="Isplata"&&x.status==="Plaćeno").reduce((s,x)=>s+(+x.amount||0),0),
      [t("Čeka plaćanje")]:mt.filter(x=>x.status==="Čeka plaćanje").reduce((s,x)=>s+(+x.amount||0),0),
      [t("U obradi")]:mt.filter(x=>x.status==="U obradi").reduce((s,x)=>s+(+x.amount||0),0),
      [t("Obveze")]:recAmt,
    };
  }),[yd,rec,lang,t]);

  const saldo = useMemo(()=>{
    let c=0;
    const isCurrentYear = year === curYear();
    return MONTHS.map((m,i)=>{
      const mt=yd.filter(x=>monthOf(x.date)===m);
      c+=mt.filter(x=>x.type==="Primitak").reduce((s,x)=>s+(+x.amount||0),0)-mt.filter(x=>x.type==="Isplata").reduce((s,x)=>s+(+x.amount||0),0);
      const mLabel = (lang==="en" ? MSHORT_EN : MSHORT)[i];
      return{ name:mLabel, Saldo:(isCurrentYear && i>curMIdx)?null:c };
    });
  },[yd,year,lang]);

  const catD  = useMemo(()=>{ const m={}; fd.filter(x=>x.type==="Isplata").forEach(x=>{ m[x.category]=(m[x.category]||0)+(+x.amount||0); }); return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value); },[fd]);
  const payD  = useMemo(()=>{ const m={}; fd.forEach(x=>{ m[x.payment]=(m[x.payment]||0)+(+x.amount||0); }); return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value); },[fd]);
  const locD  = useMemo(()=>{ const m={}; fd.forEach(x=>{ m[x.location]=(m[x.location]||0)+(+x.amount||0); }); return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value); },[fd]);

  const mDetail = useMemo(()=>{
    if (!isMonth) return null;
    const mt = yd.filter(x=>monthOf(x.date)===selMonth);
    const inc = mt.filter(x=>x.type==="Primitak").reduce((s,x)=>s+(+x.amount||0),0);
    const exp = mt.filter(x=>x.type==="Isplata").reduce((s,x)=>s+(+x.amount||0),0);
    return { inc, exp, bal:inc-exp, count:mt.length };
  },[selMonth, yd, isMonth]);

  const expData = useMemo(()=>{
    const now  = new Date();
    const nowY = now.getFullYear();
    const nowM = now.getMonth();

    const calcRecurringAmount = (r) => {
      const monthly = parseFloat(r.amount) || 0;
      const tp = parseInt(r.totalPayments) || 0;
      const ed = r.endDate ? new Date(r.endDate) : null;
      if (isMonth) return monthly;
      if (isYear) {
         let startM = (year === nowY) ? nowM : 0;
         if (year < nowY) return 0; 
         let endM = 11;
         if (ed) {
             if (ed.getFullYear() < year) return 0;
             if (ed.getFullYear() === year) endM = Math.min(endM, ed.getMonth());
         }
         let rem = Math.max(0, endM - startM + 1);
         if (tp > 0) rem = Math.min(rem, tp);
         return monthly * rem;
      }
      if (tp > 0) return monthly * tp;
      if (ed) {
        const rem = Math.max(0, (ed.getFullYear() - nowY) * 12 + (ed.getMonth() - nowM) + 1);
        return monthly * rem;
      }
      return monthly;
    };

    const calcRemainLabel = (r) => {
      if (isMonth) return "";
      const tp = parseInt(r.totalPayments) || 0;
      if (isYear) {
          const amt = calcRecurringAmount(r) / (parseFloat(r.amount)||1);
          return amt > 0 ? `(${Math.round(amt)} mj.)` : "0";
      }
      if (tp > 0) return `${tp}`;
      if (r.endDate) {
        const ed = new Date(r.endDate);
        const rem = Math.max(0, (ed.getFullYear() - nowY) * 12 + (ed.getMonth() - nowM) + 1);
        return `${rem} mj.`;
      }
      return "";
    };

    const items = [];
    if (expFilter.rate) {
      fd.filter(x=>x.installmentGroup&&(x.status==="Čeka plaćanje" || x.status==="U obradi"))
        .forEach(x=>items.push({type:"rata",desc:x.description,amount:+x.amount||0,date:x.date,cat:x.category}));
    }
    if (expFilter.recurring || expFilter.kredit) {
      rec.forEach(r=>{
        const isKred = r.category === "Kredit" || (r.description && r.description.toLowerCase().includes("kredit"));
        if (isKred && !expFilter.kredit) return;
        if (!isKred && !expFilter.recurring) return;

        const paid = fd.some(x=>x.recurringId===r.id&&x.status==="Plaćeno");
        if (!paid || isYear || isAll) {
          const amt = calcRecurringAmount(r);
          if (amt > 0) {
            items.push({
              type: isKred ? "kredit" : "obveza",
              desc: r.description,
              amount: amt,
              cat: r.category,
              endDate: r.endDate,
              totalPay: parseInt(r.totalPayments)||0,
              remainLabel: calcRemainLabel(r)
            });
          }
        }
      });
    }
    
    if (expFilter.processing) {
      fd.filter(x=>(x.status==="Čeka plaćanje" || x.status==="U obradi") && !x.installmentGroup && !x.recurringId)
        .forEach(x=>items.push({
            type: x.status === "U obradi" ? "processing" : "pending", 
            desc: x.description, 
            amount: +x.amount||0, 
            date: x.date, 
            cat: x.category
        }));
    }
    return items;
  },[fd, rec, expFilter, isMonth, isYear, isAll, year]);

  const expTotal = expData.reduce((s,e)=>s+e.amount,0);
  const typeLabel = {rata:t("Obrok"), obveza:t("Obveze"), pending:t("Čeka plaćanje"), processing:t("U obradi"), kredit:t("Rate")};
  const typeColor = {rata:C.warning, obveza:C.accent, pending:C.warning, processing:"#FB923C", kredit:"#A78BFA"};

  const tabs=[["expected",t("Očekivano")],["categories",t("Kategorije")],["overview",t("Pregled/Saldo")],["paylocal",t("Plaćanje/Lokacije")]];
  const chartCard = { background:C.card, border:`1px solid ${C.border}`, borderRadius:15, padding:13, overflowX:"auto", marginBottom:10 };
  const chartLbl = (ic,text) => <div style={{ fontSize:11, fontWeight:600, color:C.textMuted, marginBottom:8, display:"flex", alignItems:"center", gap:5 }}><Ic n={ic} s={12} c={C.textMuted}/>{text}</div>;

  const activeMonthName = useMemo(()=> isMonth ? (lang==="en" ? MONTHS_EN : MONTHS)[MONTHS.indexOf(selMonth)] : "", [isMonth, selMonth, lang]);

  return (
    <div className="fi" style={{ width:"100%" }}>
      <StickyHeader C={C} icon="bar" title={t("Statistika")}/>
      <div style={{ padding:"12px 16px 0" }}>

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:"10px 12px", marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:600, color:C.textMuted, marginBottom:8, display:"flex", alignItems:"center", gap:5 }}>
            <Ic n="cal" s={12} c={C.textMuted}/>{t("Period prikaza")}
          </div>
          <div style={{ display:"flex", gap:5, overflowX:"auto", paddingBottom:2 }}>
            <Pill label={`${year}. (${t("Sve")})`} active={isYear} color={C.accent} onClick={()=>setSelMonth("YEAR")}/>
            {MONTHS.map((m,i)=>(
              <Pill key={m} label={(lang==="en"?MSHORT_EN:MSHORT)[i]} active={selMonth===m} color={C.accent} onClick={()=>setSelMonth(m)}/>
            ))}
            <Pill label={t("Sve ukupno")} active={isAll} color={C.accent} onClick={()=>setSelMonth("ALL")}/>
          </div>
        </div>

        {mDetail && (
          <div className="su" style={{ background:`linear-gradient(135deg,${C.accent}15,${C.income}10)`, border:`1px solid ${C.accent}30`, borderRadius:14, padding:"12px 14px", marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
              <Ic n="cal" s={14} c={C.accent}/>{activeMonthName} {year}.
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:6 }}>
              {[
                { lb:t("Primici"), val:fmtEur(mDetail.inc), col:C.income },
                { lb:t("Troškovi"), val:fmtEur(mDetail.exp), col:C.expense },
                { lb:t("Bilanca"), val:fmtEur(mDetail.bal), col:mDetail.bal>=0?C.income:C.expense },
                { lb:t("Stavki"), val:mDetail.count, col:C.accent },
              ].map(({lb,val,col})=>(
                <div key={lb} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:9, color:C.textMuted, marginBottom:2 }}>{lb}</div>
                  <div style={{ fontSize:11, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:col }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display:"flex", gap:5, marginBottom:12, overflowX:"auto", paddingBottom:4 }}>
          {tabs.map(([id,lb])=><Pill key={id} label={lb} active={tab===id} color={C.accent} onClick={()=>setTab(id)}/>)}
        </div>

        {tab==="expected" && (
          <div style={chartCard}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ fontSize:12, fontWeight:600, color:C.textMuted }}>{t("Ukupno očekivano")}</span>
              <span style={{ fontSize:16, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:C.expense }}>{fmtEur(expTotal)}</span>
            </div>
            <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
              {[
                {k:"recurring", lb:t("Obveze (short)"), col:C.accent},
                {k:"rate",      lb:t("Obroci (short)"), col:C.warning},
                {k:"kredit",    lb:t("Rate (short)"),   col:"#A78BFA"},
                {k:"processing",lb:t("Ostalo (short)"), col:"#FB923C"},
              ].map(({k,lb,col})=>(
                <button key={k} onClick={()=>setExpFilter(f=>({...f,[k]:!f[k]}))}
                  style={{ padding:"5px 12px", borderRadius:18, border:`1.5px solid ${expFilter[k]?col:C.border}`, background:expFilter[k]?`${col}18`:"transparent", color:expFilter[k]?col:C.textMuted, fontSize:11, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ width:7, height:7, borderRadius:2, background:expFilter[k]?col:C.border }}/>{lb}
                </button>
              ))}
            </div>
            {expData.length===0
              ? <p style={{ textAlign:"center", color:C.textMuted, padding:16, fontSize:13 }}>{t("Nema očekivanih obveza")}</p>
              : expData.map((e,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderBottom:i<expData.length-1?`1px solid ${C.border}`:"none" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:0, textAlign:"left" }}>
                    <div style={{ width:7, height:7, borderRadius:2, background:typeColor[e.type], flexShrink:0 }}/>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:500, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.desc}</div>
                      <div style={{ fontSize:10, color:C.textMuted }}>{typeLabel[e.type]}{e.cat?` · ${t(e.cat)}`:""}{e.remainLabel?` · ${e.remainLabel}`:""}{e.endDate&&!e.remainLabel?` · ${t("do")} ${fDate(e.endDate)}`:""}</div>
                    </div>
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:typeColor[e.type], flexShrink:0, marginLeft:8 }}>{fmtEur(e.amount)}</span>
                </div>
              ))
            }
          </div>
        )}

        {tab==="categories" && (
          <div style={chartCard}>
            {catD.length>0 ? <><PieChart width={W} height={200}><Pie data={catD} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" stroke="none">{catD.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}</Pie><Tooltip {...tt}/></PieChart><div style={{marginTop:10}}>{catD.map((c,i)=><div key={c.name} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:i<catD.length-1?`1px solid ${C.border}`:"none",fontSize:12,color:C.text}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:9,height:9,borderRadius:3,background:CHART_COLORS[i%CHART_COLORS.length]}}/>{t(c.name)}</div><span style={{fontFamily:"'JetBrains Mono',monospace"}}>{fmtEur(c.value)}</span></div>)}</div></> : <p style={{textAlign:"center",color:C.textMuted,padding:20,fontSize:13}}>{t("Nema podataka")}</p>}
          </div>
        )}

        {tab==="overview" && <>
          <div style={chartCard}>
            {chartLbl("bar",t("Primici vs Troškovi"))}
            <BarChart width={W} height={260} data={mBar}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="name" tick={{fill:C.textMuted,fontSize:9}} axisLine={false}/><YAxis tick={{fill:C.textMuted,fontSize:9}} axisLine={false} width={44} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/><Tooltip {...tt}/><Legend wrapperStyle={{fontSize:10}}/>
              <Bar dataKey={t("Primici")} fill={C.income} radius={[3,3,0,0]}/>
              <Bar dataKey={t("Troškovi")} fill={C.expense} radius={[3,3,0,0]}/>
              <Bar dataKey={t("Čeka plaćanje")} fill={C.warning} radius={[3,3,0,0]}/>
              <Bar dataKey={t("U obradi")} fill="#FB923C" radius={[3,3,0,0]}/>
              <Bar dataKey={t("Obveze")} fill={`${C.accent}80`} radius={[3,3,0,0]}/>
            </BarChart>
          </div>
          <div style={chartCard}>
            {chartLbl("up",t("Kumulativni saldo"))}
            <AreaChart width={W} height={220} data={saldo}><defs><linearGradient id="saldoFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.accent} stopOpacity={0.25}/><stop offset="95%" stopColor={C.accent} stopOpacity={0.03}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="name" tick={{fill:C.textMuted,fontSize:9}} axisLine={false}/><YAxis tick={{fill:C.textMuted,fontSize:9}} axisLine={false} width={44} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(1)}k`:v}/><Tooltip {...tt}/><Area type="monotone" dataKey="Saldo" stroke={C.accent} strokeWidth={2.5} fill="url(#saldoFill)" dot={{fill:C.accent,r:3}} activeDot={{r:6}} connectNulls={false}/></AreaChart>
          </div>
        </>}

        {tab==="paylocal" && <>
          <div style={chartCard}>
            {chartLbl("card",t("Po načinu plaćanja"))}
            {payD.length>0 ? <BarChart width={W} height={200} data={payD} layout="vertical"><XAxis type="number" tick={{fill:C.textMuted,fontSize:9}} axisLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/><YAxis type="category" dataKey="name" tick={{fill:C.textMuted,fontSize:11}} tickFormatter={v=>t(v)} axisLine={false} width={120}/><Tooltip {...tt}/><Bar dataKey="value" fill={C.warning} radius={[0,6,6,0]}/></BarChart> : <p style={{textAlign:"center",color:C.textMuted,padding:20,fontSize:13}}>{t("Nema podataka")}</p>}
          </div>
          <div style={chartCard}>
            {chartLbl("pin",t("Po lokacijama"))}
            {locD.length>0 ? <BarChart width={W} height={200} data={locD} layout="vertical"><XAxis type="number" tick={{fill:C.textMuted,fontSize:9}} axisLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/><YAxis type="category" dataKey="name" tick={{fill:C.textMuted,fontSize:11}} tickFormatter={v=>t(v)} axisLine={false} width={100}/><Tooltip {...tt}/><Bar dataKey="value" fill={C.accent} radius={[0,6,6,0]}/></BarChart> : <p style={{textAlign:"center",color:C.textMuted,padding:20,fontSize:13}}>{t("Nema podataka")}</p>}
          </div>
        </>}

      </div>
    </div>
  );
}

// ─── ListEditor ───────────────────────────────────────────────────────────────
function ListEditor({ C, title, items, onBack, t }) {
  const [arr,  setArr]  = useState([...items]);
  const [nv,   setNv]   = useState("");
  const [eIdx, setEIdx] = useState(null);
  const [eVal, setEVal] = useState("");

  const add = () => { const v=nv.trim(); if(!v||arr.includes(v))return; setArr(a=>[...a,v]); setNv(""); };
  
  const move = (i, dir) => {
    if (i+dir < 0 || i+dir >= arr.length) return;
    const nArr = [...arr];
    [nArr[i], nArr[i+dir]] = [nArr[i+dir], nArr[i]];
    setArr(nArr);
  };

  const fld = { flex:1, height:42, padding:"0 12px", background:C.bg, border:`1.5px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:13 };

  return (
    <div className="fi" style={{ width:"100%" }}>
      <div className="hdr" style={{ position:"sticky", top:0, zIndex:50, background:C.bg, paddingBottom:10, paddingLeft:16, paddingRight:16, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={()=>onBack(arr)} title={t("Natrag")} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:10, padding:"8px 10px", cursor:"pointer", display:"flex", alignItems:"center" }}><Ic n="arrow_l" s={18} c={C.accent}/></button>
          <h2 style={{ fontSize:17, fontWeight:700, color:C.text }}>{t(title)}</h2>
        </div>
      </div>
      <div style={{ padding:"14px 16px 0" }}>
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        <input type="text" placeholder={t("Nova stavka…")} value={nv} onChange={e=>setNv(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} style={fld}/>
        <button onClick={add} title={t("Dodaj")} style={{ height:42, padding:"0 16px", background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:10, color:"#fff", cursor:"pointer", display:"flex", alignItems:"center" }}><Ic n="plus" s={20} c="#fff"/></button>
      </div>
      {arr.map((item,i)=>(
        <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"10px 13px", marginBottom:7, display:"flex", alignItems:"center", gap:8 }}>
          
          <div style={{ display:"flex", flexDirection:"column", gap:2, marginRight:4 }}>
            <button onClick={()=>move(i, -1)} disabled={i===0} style={{ padding:2, background:"none", border:"none", cursor:i===0?"not-allowed":"pointer", opacity:i===0?0.2:1 }}><Ic n="chevron_up" s={14} c={C.textMuted}/></button>
            <button onClick={()=>move(i, 1)} disabled={i===arr.length-1} style={{ padding:2, background:"none", border:"none", cursor:i===arr.length-1?"not-allowed":"pointer", opacity:i===arr.length-1?0.2:1 }}><Ic n="chevron_down" s={14} c={C.textMuted}/></button>
          </div>

          {eIdx===i
            ? <>
                <input type="text" value={eVal} onChange={e=>setEVal(e.target.value)}
                  onKeyDown={e=>{ if(e.key==="Enter"){const v=eVal.trim();if(v)setArr(a=>a.map((x,j)=>j===i?v:x));setEIdx(null);} if(e.key==="Escape")setEIdx(null); }}
                  autoFocus style={{...fld,flex:1,height:36}}/>
                <button onClick={()=>{ const v=eVal.trim(); if(v)setArr(a=>a.map((x,j)=>j===i?v:x)); setEIdx(null); }} title={t("Spremi")} style={{ background:C.income, border:"none", borderRadius:8, padding:"6px 10px", cursor:"pointer" }}><Ic n="check" s={14} c="#fff"/></button>
                <button onClick={()=>setEIdx(null)} title={t("Odustani")} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 10px", cursor:"pointer" }}><Ic n="x" s={14} c={C.textMuted}/></button>
              </>
            : <>
                <span style={{ flex:1, fontSize:14, color:C.text }}>{t(item)}</span>
                <button onClick={()=>{ setEIdx(i); setEVal(item); }} title={t("Uredi")} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 8px", cursor:"pointer" }}><Ic n="edit" s={13} c={C.accent}/></button>
                {arr.length>1 && <button onClick={()=>setArr(a=>a.filter((_,j)=>j!==i))} title={t("Obriši")} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 8px", cursor:"pointer" }}><Ic n="trash" s={13} c={C.expense}/></button>}
              </>
          }
        </div>
      ))}
      <button onClick={()=>onBack(arr)} style={{ width:"100%", padding:13, marginTop:10, background:`linear-gradient(135deg,${C.income},#059669)`, border:"none", borderRadius:13, color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
        <Ic n="check" s={16} c="#fff"/>{t("Spremi i vrati se")}
      </button>
      </div>
    </div>
  );
}

// ─── ShareModal ───────────────────────────────────────────────────────────────
function ShareModal({ C, txs, year, user, onClose, t, lang }) {
  const [fmt2, setFmt2] = useState("summary");
  const [copied, setCopied] = useState(false);

  const sumTxt = buildSummary(txs, year, user, t);
  const csvTxt = buildCSV(txs, t, lang);
  const content = fmt2==="summary" ? sumTxt : csvTxt;
  const subj    = encodeURIComponent(`${t("Moja lova")} — ${year}.`);
  const body    = encodeURIComponent(fmt2==="summary" ? sumTxt : `CSV — ${year}.\n\nUser: ${[user.firstName,user.lastName].filter(Boolean).join(" ")||"—"}`);

  const dl = () => {
    const isCSV = fmt2==="csv";
    const blob = new Blob([content],{type:isCSV?"text/csv;charset=utf-8":"text/plain;charset=utf-8"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href=url; a.download=`moja_lova_${year}.${isCSV?"csv":"txt"}`; a.click(); URL.revokeObjectURL(url);
  };
  const cp = () => {
    try { navigator.clipboard.writeText(content); } catch { const ta=document.createElement("textarea");ta.value=content;document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta); }
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  };

  const channels=[
    {lb:"E-mail",   ic:"mail",  col:"#EA4335", fn:()=>window.open(`mailto:${encodeURIComponent(user.email||"")}?subject=${subj}&body=${body}`, "_blank", "noopener,noreferrer")},
    {lb:"WhatsApp", ic:"share", col:"#25D366", fn:()=>window.open(`https://wa.me/?text=${encodeURIComponent(sumTxt)}`, "_blank", "noopener,noreferrer")},
    {lb:"Telegram", ic:"share", col:"#2AABEE", fn:()=>window.open(`https://t.me/share/url?url=&text=${encodeURIComponent(sumTxt)}`, "_blank", "noopener,noreferrer")},
    {lb:"Viber",    ic:"phone", col:"#7360F2", fn:()=>window.open(`viber://forward?text=${encodeURIComponent(sumTxt.slice(0,1000))}`, "_blank", "noopener,noreferrer")},
    {lb:"SMS",      ic:"phone", col:"#4CAF50", fn:()=>window.open(`sms:?body=${encodeURIComponent(sumTxt.slice(0,500))}`, "_blank", "noopener,noreferrer")},
    {lb:copied?t("Kopirano!"):t("Kopiraj"), ic:copied?"check":"copy", col:copied?C.income:C.accent, fn:cp},
    {lb:t("Preuzmi"),  ic:"dl",    col:C.warning, fn:dl},
  ];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={e=>{ if(e.target===e.currentTarget)onClose(); }}>
      <div className="su" style={{ background:C.card, borderRadius:20, width:"100%", maxWidth:420, padding:"20px 16px 20px", maxHeight:"85vh", overflowY:"auto", border:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <h3 style={{ fontSize:17, fontWeight:700, color:C.text, display:"flex", alignItems:"center", gap:8 }}><Ic n="share" s={18} c={C.accent}/>{t("Dijeli / Izvezi")}</h3>
          <button onClick={onClose} title={t("Zatvori")} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:10, padding:"6px 10px", cursor:"pointer" }}><Ic n="x" s={16} c={C.textMuted}/></button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
          {[["summary",t("Sažetak")],["csv",t("CSV tablica")]].map(([id,lb])=>(
            <button key={id} onClick={()=>setFmt2(id)}
              style={{ padding:"10px 8px", border:`1.5px solid ${fmt2===id?C.accent:C.border}`, borderRadius:12, background:fmt2===id?`${C.accent}15`:"transparent", color:fmt2===id?C.accent:C.textMuted, fontSize:13, fontWeight:fmt2===id?600:400, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              <Ic n={id==="summary"?"list":"bar"} s={14} c={fmt2===id?C.accent:C.textMuted}/>{lb}
            </button>
          ))}
        </div>
        <div style={{ background:C.cardAlt, borderRadius:12, padding:11, marginBottom:14, maxHeight:150, overflowY:"auto" }}>
          <pre style={{ fontSize:10, color:C.textSub, whiteSpace:"pre-wrap", fontFamily:"'JetBrains Mono',monospace", lineHeight:1.6 }}>{content.slice(0,600)}{content.length>600?"…":""}</pre>
        </div>
        <p style={{ fontSize:11, fontWeight:600, color:C.textMuted, letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>{t("Odaberi kanal")}</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:14 }}>
          {channels.map(({lb,ic,col,fn})=>(
            <button key={lb} onClick={fn} style={{ padding:"11px 4px", background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:13, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
              <Ic n={ic} s={21} c={col}/><span style={{ fontSize:10, color:C.textMuted, textAlign:"center", lineHeight:1.2 }}>{lb}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── RecurringScreen ──────────────────────────────────────────────────────────
function RecurringScreen({ C, lists, data, setTxs, onBack, t, lang }) {
  const cmIdx= new Date().getMonth();
  const cmName = lang==="en" ? MONTHS_EN[cmIdx] : MONTHS[cmIdx];
  const now  = new Date();
  const cmYr = now.getFullYear();
  
  const initialOrderRef = useRef(null);

  const items = useMemo(() => {
    const list = [];
    const rec = lists.recurring || [];
    const recTxsThisMonth = data.filter(x => {
      const d = new Date(x.date);
      return d.getMonth()===cmIdx && d.getFullYear()===cmYr && x.recurringId;
    });
    const paidMap = {};
    recTxsThisMonth.forEach(x => paidMap[x.recurringId] = x);

    rec.forEach(r => {
      const tx = paidMap[r.id];
      list.push({ uid: `rec_${r.id}`, type: "recurring", isPaid: !!tx, txId: tx ? tx.id : null, template: r, description: r.description, amount: r.amount, category: r.category, location: r.location, payment: r.payment, dueDate: r.dueDate, totalPayments: r.totalPayments, endDate: r.endDate });
    });

    const instThisMonth = data.filter(x => {
      const d = new Date(x.date);
      return d.getMonth()===cmIdx && d.getFullYear()===cmYr && x.installmentGroup;
    });

    instThisMonth.forEach(inst => {
      list.push({ uid: `inst_${inst.id}`, type: "installment", isPaid: inst.status === "Plaćeno", txId: inst.id, data: inst, description: inst.description, amount: inst.amount, category: inst.category, location: inst.location, payment: inst.payment });
    });

    const otherPendingThisMonth = data.filter(x => {
        const d = new Date(x.date);
        return d.getMonth()===cmIdx && d.getFullYear()===cmYr && (x.status === "Čeka plaćanje" || x.status === "U obradi") && !x.installmentGroup && !x.recurringId;
    });
    
    otherPendingThisMonth.forEach(ot => {
        list.push({ uid: `oth_${ot.id}`, type: "other", isPaid: false, txId: ot.id, data: ot, description: ot.description, amount: ot.amount, category: ot.category, location: ot.location, payment: ot.payment })
    });

    if (!initialOrderRef.current) {
        list.sort((a,b) => (a.isPaid === b.isPaid ? 0 : a.isPaid ? 1 : -1));
        initialOrderRef.current = list.map(x => x.uid);
    } else {
        list.sort((a,b) => {
            const idxA = initialOrderRef.current.indexOf(a.uid);
            const idxB = initialOrderRef.current.indexOf(b.uid);
            if (idxA === -1 && idxB === -1) return 0;
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
        });
    }
    return list;
  }, [data, lists.recurring, cmIdx, cmYr]);

  const paidCount = items.filter(it => it.isPaid).length;

  const togglePay = (item) => {
    if (item.isPaid) {
      if (item.type === "recurring") setTxs(p => p.filter(x => x.id !== item.txId));
      else if (item.type === "installment") setTxs(p => p.map(x => x.id === item.txId ? {...x, status: "Čeka plaćanje"} : x));
    } else {
      if (item.type === "recurring") {
        const newTx = {
          id: Date.now().toString(), date: now.toISOString().split("T")[0], type: "Isplata",
          description: item.description, category: item.category || "", location: item.location || "", payment: item.payment || "",
          status: "Plaćeno", amount: parseFloat(item.amount) || 0, notes: `${t("Redovna obveza")} · ${cmName} ${cmYr}.`, installments: 0, recurringId: item.template.id,
        };
        setTxs(p => [...p, newTx]);
      } else if (item.type === "installment" || item.type === "other") {
        setTxs(p => p.map(x => x.id === item.txId ? {...x, status: "Plaćeno", date: now.toISOString().split("T")[0]} : x));
      }
    }
  };

  return (
    <div className="fi" style={{ width:"100%" }}>
      <div className="hdr" style={{ position:"sticky", top:0, zIndex:50, background:C.bg, paddingBottom:10, paddingLeft:16, paddingRight:16, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h2 style={{ fontSize:18, fontWeight:700, display:"flex", alignItems:"center", gap:8, color:C.text }}>
            <Ic n="repeat" s={18} c={C.accent}/>{t("Obveze")} · {cmName} {cmYr}.
          </h2>
          <button onClick={onBack} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, color:C.textMuted, padding:"8px 14px", borderRadius:10, fontSize:13, cursor:"pointer" }}>{t("Natrag")}</button>
        </div>
      </div>

      <div style={{ padding:"14px 16px 0" }}>
        {items.length > 0 && (
          <div className="su" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"12px 14px", marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:12, color:C.textMuted }}>{t("Plaćeno ovaj mjesec")}</span>
              <span style={{ fontSize:13, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:paidCount===items.length?C.income:C.accent }}>{paidCount}/{items.length}</span>
            </div>
            <div style={{ height:6, borderRadius:3, background:C.cardAlt, overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:3, width:`${items.length>0?(paidCount/items.length*100):0}%`, background:`linear-gradient(90deg,${C.accent},${C.income})`, transition:"width .4s" }}/>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div style={{ textAlign:"center", padding:"50px 20px", color:C.textMuted }}>
            <Ic n="repeat" s={44} c={C.border} style={{ marginBottom:12, opacity:.3 }}/>
            <p style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>{t("Nema obveza za ovaj mjesec")}</p>
            <p style={{ fontSize:12 }}>{t("Ovdje će se pojaviti redovne obveze i obroci čiji datum pada u tekući mjesec.")}</p>
          </div>
        ) : items.map((item, i) => {
          return (
            <div key={item.uid} className="su" style={{
              background: item.isPaid ? `${C.income}08` : C.card,
              border: `1px solid ${item.isPaid ? C.income+"40" : C.border}`,
              borderLeft: `3px solid ${item.isPaid ? C.income : item.type==="recurring" ? C.accent : C.warning}`,
              borderRadius:14, padding:14, marginBottom:8, animationDelay:`${i*.03}s`,
              opacity: item.isPaid ? .7 : 1, transition:"all .2s"
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1, minWidth:0, textAlign:"left" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <Ic n={item.isPaid?"check": item.type==="recurring"?"repeat":"coins"} s={15} c={item.isPaid?C.income: item.type==="recurring"?C.accent:C.warning}/>
                    <span style={{ fontWeight:600, fontSize:14, color:C.text }}>{item.description}</span>
                  </div>
                  <div style={{ fontSize:11, color:C.textMuted, marginTop:4, paddingLeft:22 }}>
                    {item.category && <span>{t(item.category)}</span>}
                    {item.type==="recurring" && item.dueDate && <span> · {t("dospijeva")} {item.dueDate}. {t("u mj.")}</span>}
                    {item.type==="installment" && <span> · {t("Obrok")}</span>}
                    {item.location && <span> · {t(item.location)}</span>}
                    {item.type==="recurring" && item.totalPayments>0 && <span> · {item.totalPayments} {t("obroka ukupno")}</span>}
                  </div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0, marginLeft:10, display:"flex", flexDirection:"column", alignItems:"flex-end" }}>
                  <div style={{ fontSize:16, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", color:item.isPaid?C.income:C.expense }}>
                    {fmtEur(+item.amount||0)}
                  </div>
                  
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8 }}>
                    <span style={{ fontSize:11, fontWeight:600, color:item.isPaid?C.income:C.warning }}>
                        {item.isPaid ? t("Plaćeno") : t("Čeka plaćanje")}
                    </span>
                    <button onClick={()=>togglePay(item)}
                        style={{ fontSize:11, fontWeight:700, padding:"5px 12px", borderRadius:8, border:"none", background:item.isPaid?C.cardAlt:C.income, color:item.isPaid?C.textMuted:"#fff", cursor:"pointer", display:"flex", alignItems:"center", gap:4, transition:"all .2s", boxShadow:item.isPaid?"none":`0 2px 8px ${C.income}40` }}>
                        {item.isPaid ? <><Ic n="arrow_l" s={11} c={C.textMuted}/> {t("Vrati")}</> : <><Ic n="check" s={11} c="#fff"/> {t("Plati")}</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── RecurringEditor ──────────────────────────────────────────────────────────
function RecurringEditor({ C, items, lists, onBack, t }) {
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
                        {lists.categories_expense.map(c=><option key={c} value={c}>{t(c)}</option>)}
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
                    {lists.categories_expense.map(c=><option key={c} value={c}>{t(c)}</option>)}
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

// ─── GeneralSettings ──────────────────────────────────────────────────────────
function GeneralSettings({ C, txs, setTxs, prefs, updPrefs, user, updUser, sec, updSec, year, setSetupMode, setUnlocked, onBack, t, lang }) {
  const [pinChg,  setPinChg]  = useState(false);
  const [rmPin,   setRmPin]   = useState(false);
  const [vPin,    setVPin]    = useState("");
  const [vErr,    setVErr]    = useState("");
  const [share,   setShare]   = useState(false);
  const [confirm, setConfirm] = useState(false);
  // Fallback state: if no download/share path works (some APK wrappers block both),
  // we show the JSON in a modal with a Copy button so the user can paste into any
  // note/chat app and save it elsewhere.
  const [exportFallback, setExportFallback] = useState(null); // { filename, content }

  const hasProfileData = user.firstName || user.lastName || user.phone || user.email;
  const [isEditingProfile, setIsEditingProfile] = useState(!hasProfileData);

  if (pinChg) return <SetupPin C={C} isChange onSave={hash=>{ updSec({pinHash:hash,attempts:0,totalFailed:0,lockedUntil:null}); setPinChg(false); }} onSkip={()=>setPinChg(false)} t={t}/>;

  const cy = curYear();

  const fld = { width:"100%", height:46, padding:"0 12px", background:C.cardAlt, border:`1.5px solid ${C.border}`, borderRadius:12, color:C.text, fontSize:14 };
  const lbl = { fontSize:11, fontWeight:600, color:C.textMuted, marginBottom:5, display:"flex", alignItems:"center", gap:5, letterSpacing:.3, textTransform:"uppercase" };

  const SL = ({text,icon}) => (
    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:9, marginTop:4 }}>
      <Ic n={icon} s={13} c={C.textMuted}/>
      <p style={{ fontSize:10, fontWeight:700, color:C.textMuted, letterSpacing:1.2, textTransform:"uppercase" }}>{text}</p>
    </div>
  );
  
  const Row = ({icon,label,sub,onClick,danger=false,right,toggle,toggled}) => (
    <button onClick={onClick} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:C.card, border:`1px solid ${danger?C.expense+"50":C.border}`, borderRadius:13, marginBottom:7, cursor:"pointer", textAlign:"left" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <Ic n={icon} s={16} c={danger?C.expense:C.accent}/>
        <div>
          <div style={{ fontSize:14, fontWeight:500, color:danger?C.expense:C.text }}>{label}</div>
          {sub && <div style={{ fontSize:11, color:C.textMuted, marginTop:1 }}>{sub}</div>}
        </div>
      </div>
      {toggle
        ? <div style={{ width:44, height:24, borderRadius:12, background:toggled?C.income:C.border, position:"relative", transition:"background .2s", flexShrink:0 }}>
            <div style={{ position:"absolute", top:2, left:toggled?20:2, width:20, height:20, borderRadius:"50%", background:"#fff", transition:"left .2s" }}/>
          </div>
        : right!==false && <div style={{ display:"flex", alignItems:"center", gap:5 }}>{right && <span style={{ fontSize:12, color:C.textMuted }}>{right}</span>}<Ic n="chevron" s={14} c={C.textMuted} style={{ transform:"rotate(-90deg)" }}/></div>
      }
    </button>
  );

  // Complete backup — serializes all app data except PIN hash (safety).
  // Instead of trying to silently pick the "right" save path (which fails
  // unpredictably in WebView/APK environments), we ALWAYS show the backup
  // content in a modal with three clear action buttons: Copy, Share, Download.
  // Whatever fails, the user always has a working option.
  const fullExport = () => {
    try {
      const payload = {
        __moja_lova_backup: true,
        version: 1,
        exportedAt: new Date().toISOString(),
        app: "Moja lova",
        data: {
          txs:    load(K.db, []),
          drafts: load(K.drf, []),
          lists:  load(K.lst, DEF_LISTS),
          user:   load(K.usr, {}),
          prefs:  load(K.prf, {}),
        }
      };
      const jsonStr  = JSON.stringify(payload, null, 2);
      const filename = `moja_lova_backup_${new Date().toISOString().split("T")[0]}.json`;
      setExportFallback({ filename, content: jsonStr });
    } catch {
      alert(t("Greška pri čitanju datoteke."));
    }
  };

  // Restore — validates payload, confirms, writes to localStorage, reloads.
  const fullImport = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    // Quick pre-check by name/type — avoid wasting time on images, PDFs, etc.
    // that the user may accidentally pick (Android's file picker shows everything).
    const looksJson = /\.json$/i.test(file.name) || file.type === "application/json" || file.type === "";
    if (!looksJson) { alert(t("Datoteka nije valjan Moja lova backup.")); return; }

    const reader = new FileReader();
    reader.onerror = () => alert(t("Greška pri čitanju datoteke."));
    reader.onload = (ev) => {
      let parsed;
      try { parsed = JSON.parse(ev.target.result); }
      catch { alert(t("Datoteka nije valjan Moja lova backup.")); return; }

      // Accept new format (__moja_lova_backup wrapper) OR legacy format (plain txs array)
      let data = null;
      if (parsed && parsed.__moja_lova_backup && parsed.data && typeof parsed.data === "object") {
        data = parsed.data;
      } else if (Array.isArray(parsed)) {
        data = { txs: parsed }; // legacy: file contained just the txs array
      }
      if (!data) { alert(t("Datoteka nije valjan Moja lova backup.")); return; }

      if (!window.confirm(t("Vraćanjem podataka trenutni podaci bit će ZAMIJENJENI. Nastaviti?"))) return;

      try {
        if (Array.isArray(data.txs))    save(K.db,  data.txs);
        if (Array.isArray(data.drafts)) save(K.drf, data.drafts);
        if (data.lists && typeof data.lists === "object") save(K.lst, { ...DEF_LISTS, ...data.lists });
        if (data.user  && typeof data.user  === "object") save(K.usr, data.user);
        if (data.prefs && typeof data.prefs === "object") {
          // Preserve onboarded=true so user doesn't re-enter onboarding after restore.
          save(K.prf, { ...load(K.prf,{}), ...data.prefs, onboarded: true });
        }
        alert(t("Podaci su uspješno vraćeni. Aplikacija će se ponovno učitati."));
        window.location.reload();
      } catch {
        alert(t("Datoteka nije valjan Moja lova backup."));
      }
    };
    reader.readAsText(file);
  };

  const removePIN = async () => { const h=await hashPin(vPin); if(h===sec.pinHash){updSec({pinHash:null,bioEnabled:false,bioCredId:null,attempts:0,totalFailed:0,lockedUntil:null});setRmPin(false);setVPin("");setVErr("");}else setVErr(t("Pogrešan PIN")); };

  const toggleBio = async () => {
    if (sec.bioEnabled) {
      updSec({ bioEnabled: false, bioCredId: null });
      return;
    }
    if (!window.PublicKeyCredential) {
      alert(t("Tvoj uređaj/preglednik ne podržava WebAuthn (Biometriju) ili aplikacija nije na HTTPS protokolu."));
      return;
    }
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = Uint8Array.from("mojalova_user", c=>c.charCodeAt(0));
      const createOpt = {
        publicKey: {
          rp: { name: "Moja Lova", id: window.location.hostname || "localhost" },
          user: { id: userId, name: user.email || t("Korisnik"), displayName: [user.firstName, user.lastName].join(" ") || t("Korisnik") },
          challenge: challenge,
          pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
          authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
          timeout: 60000
        }
      };
      const cred = await navigator.credentials.create(createOpt);
      const idBase64 = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
      updSec({ bioEnabled: true, bioCredId: idBase64 });
      alert(t("Biometrija uspješno aktivirana!"));
    } catch (e) {
      alert(t("Postavljanje biometrije nije uspjelo.\nProvjeri je li aplikacija na sigurnoj vezi (HTTPS) i koristiš li podržan uređaj."));
    }
  };

  const dn = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <div className="fi" style={{ width:"100%" }}>
      <StickyHeader C={C} icon="gear" title={t("Opće postavke")}
        right={<button onClick={onBack} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, color:C.textMuted, padding:"8px 14px", borderRadius:10, fontSize:13, cursor:"pointer" }}>{t("Natrag")}</button>}
      />
      <div style={{ padding:"12px 16px 0" }}>

        <SL text={t("Profil korisnika")} icon="user"/>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:15, padding:15, marginBottom:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
            <div style={{ width:46, height:46, borderRadius:14, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:"flex", alignItems:"center", justifyContent:"center" }}><Ic n="user" s={22} c="#fff"/></div>
            <div>
              <div style={{ fontSize:15, fontWeight:600, color:C.text }}>{dn||"Korisnik"}</div>
              <div style={{ fontSize:12, color:C.textMuted }}>{user.email||t("Nije upisana e-mail adresa")}</div>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div>
                <label style={{...lbl, opacity:isEditingProfile?1:0.5}}><Ic n="user" s={11} c={C.textMuted}/>{t("Ime")}</label>
                <input type="text" placeholder="Npr. Bojan" value={user.firstName} disabled={!isEditingProfile} onChange={e=>updUser({firstName:e.target.value})} style={{...fld, opacity:isEditingProfile?1:0.5}}/>
              </div>
              <div>
                <label style={{...lbl, opacity:isEditingProfile?1:0.5}}><Ic n="user" s={11} c={C.textMuted}/>{t("Prezime")}</label>
                <input type="text" placeholder="Npr. Vivoda" value={user.lastName} disabled={!isEditingProfile} onChange={e=>updUser({lastName:e.target.value})} style={{...fld, opacity:isEditingProfile?1:0.5}}/>
              </div>
            </div>
            <div>
              <label style={{...lbl, opacity:isEditingProfile?1:0.5}}><Ic n="phone" s={11} c={C.textMuted}/>{t("Telefon")}</label>
              <input type="tel" placeholder="+385 91 234 5678" value={user.phone} disabled={!isEditingProfile} onChange={e=>updUser({phone:e.target.value})} style={{...fld, opacity:isEditingProfile?1:0.5}}/>
            </div>
            <div>
              <label style={{...lbl, opacity:isEditingProfile?1:0.5}}><Ic n="mail" s={11} c={C.textMuted}/>{t("E-mail")}</label>
              <input type="email" placeholder="npr. bojan@email.com" value={user.email} disabled={!isEditingProfile} onChange={e=>updUser({email:e.target.value})} style={{...fld, opacity:isEditingProfile?1:0.5}}/>
            </div>
            
            {isEditingProfile ? (
              <button onClick={() => setIsEditingProfile(false)} 
                  style={{ padding:"11px 0", background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:12, color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all .3s" }}>
                <Ic n="check" s={16} c="#fff"/>{t("Spremi profil")}
              </button>
            ) : (
              <button onClick={() => setIsEditingProfile(true)} 
                  style={{ padding:"11px 0", background:`linear-gradient(135deg,${C.income},#059669)`, border:"none", borderRadius:12, color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all .3s" }}>
                <Ic n="edit" s={16} c="#fff"/>{t("Izmijeni profil")}
              </button>
            )}
          </div>
        </div>

        <div style={{ marginTop:14, marginBottom:6 }}>
          <SL text={t("Izgled")} icon="sun"/>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:13, marginBottom:7 }}>
            <p style={{ fontSize:12, color:C.textMuted, marginBottom:10 }}>{t("Tema prikaza")}</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:7 }}>
              {[["dark","moon",t("Tamni")],["light","sun",t("Svijetli")],["auto","auto",t("Auto")]].map(([id,ic,lb])=>{
                const a = prefs.theme===id;
                return <button key={id} onClick={()=>updPrefs({theme:id})} style={{ padding:"10px 6px", borderRadius:11, border:`1.5px solid ${a?C.accent:C.border}`, background:a?`${C.accent}15`:"transparent", color:a?C.accent:C.textMuted, fontSize:11, fontWeight:a?700:400, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <Ic n={ic} s={17} c={a?C.accent:C.textMuted}/>{lb}
                </button>;
              })}
            </div>
          </div>
          
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:13, marginBottom:7 }}>
            <p style={{ fontSize:12, color:C.textMuted, marginBottom:10 }}>{t("Jezik aplikacije")}</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
              {[["hr","Hrvatski"],["en","English"]].map(([id,lb])=>{
                const a = prefs.lang===id;
                return <button key={id} onClick={()=>updPrefs({lang:id})} style={{ padding:"10px 6px", borderRadius:11, border:`1.5px solid ${a?C.accent:C.border}`, background:a?`${C.accent}15`:"transparent", color:a?C.accent:C.textMuted, fontSize:12, fontWeight:a?700:500, cursor:"pointer" }}>{lb}</button>;
              })}
            </div>
          </div>
        </div>

        <div style={{ marginTop:14, marginBottom:6 }}>
          <SL text={t("Sigurnost")} icon="shield"/>
          {!sec.pinHash
            ? <Row icon="lock" label={t("Postavi PIN zaštitu")} sub={t("Aplikacija nije zaštićena")} onClick={()=>setSetupMode(true)}/>
            : <>
                <Row icon="lock" label={t("Promijeni PIN")} sub={`${t("Zaštita aktivna")} · max ${MAX_ATT} ${t("pokušaja")}`} onClick={()=>setPinChg(true)}/>
                <Row icon="finger" label={t("Biometrija")} sub={sec.bioEnabled?t("Aktivno"):t("Omogući fingerprint/Face ID")} toggle toggled={sec.bioEnabled} onClick={toggleBio}/>
                <Row icon="unlock" label={t("Ukloni PIN zaštitu")} danger onClick={()=>setRmPin(v=>!v)} right={false}/>
                {rmPin && (
                  <div style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:12, padding:13, marginBottom:7 }}>
                    <p style={{ fontSize:12, color:C.textMuted, marginBottom:8 }}>{t("Unesite trenutni PIN:")}</p>
                    <div style={{ display:"flex", gap:8 }}>
                      <input type="password" placeholder="PIN" value={vPin} onChange={e=>{ setVPin(e.target.value); setVErr(""); }} style={{...fld,flex:1,height:40}} maxLength={6}/>
                      <button onClick={removePIN} style={{ padding:"0 14px", background:C.expense, border:"none", borderRadius:10, color:"#fff", fontWeight:600, cursor:"pointer", height:40, fontSize:13 }}>{t("Ukloni")}</button>
                    </div>
                    {vErr && <p style={{ fontSize:11, color:C.expense, marginTop:5 }}>{vErr}</p>}
                  </div>
                )}
              </>
          }
        </div>

        <div style={{ marginTop:14, marginBottom:6 }}>
          <SL text={t("Dijeli i izvezi")} icon="share"/>
          
          {/* 1) SHARE — send via WhatsApp/Telegram/E-mail/CSV etc. */}
          <button onClick={()=>setShare(true)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 15px", background:`linear-gradient(135deg,${C.accent}20,${C.income}15)`, border:`1px solid ${C.accent}40`, borderRadius:13, marginBottom:7, cursor:"pointer" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <Ic n="share" s={19} c={C.accent}/>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{t("Podijeli podatke")}</div>
                <div style={{ fontSize:11, color:C.textMuted }}>{t("E-mail, WhatsApp, Telegram…")}</div>
              </div>
            </div>
            <Ic n="chevron" s={14} c={C.accent} style={{ transform:"rotate(-90deg)" }}/>
          </button>

          {/* 2) EXPORT (BACKUP) — full JSON backup of all data */}
          <button onClick={fullExport} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 15px", background:`linear-gradient(135deg,${C.warning}20,${C.warning}08)`, border:`1px solid ${C.warning}40`, borderRadius:13, marginBottom:7, cursor:"pointer" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <Ic n="dl" s={19} c={C.warning}/>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{t("Izvezi (Backup)")}</div>
                <div style={{ fontSize:11, color:C.textMuted }}>{t("Napravi kopiju svih podataka u .json datoteci")}</div>
              </div>
            </div>
            <Ic n="chevron" s={14} c={C.warning} style={{ transform:"rotate(-90deg)" }}/>
          </button>

          {/* 3) IMPORT (RESTORE) — full JSON restore with confirm */}
          <label style={{ display:"block", cursor:"pointer", marginBottom:7 }}>
            <div style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 15px", background:`linear-gradient(135deg,${C.income}18,${C.income}08)`, border:`1px solid ${C.income}40`, borderRadius:13 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <Ic n="ul" s={19} c={C.income}/>
                <div style={{ textAlign:"left" }}>
                  <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{t("Učitaj (Import / Restore)")}</div>
                  <div style={{ fontSize:11, color:C.textMuted }}>{t("Vrati podatke iz prethodne kopije")}</div>
                </div>
              </div>
              <Ic n="chevron" s={14} c={C.income} style={{ transform:"rotate(-90deg)" }}/>
            </div>
            {/* Android opens the Files/Documents picker when accept is a
                wildcard; JSON validity is verified inside fullImport. */}
            <input type="file" accept="*/*" onChange={fullImport} style={{ display:"none" }}/>
          </label>
        </div>

        <div style={{ marginTop:14, marginBottom:6 }}>
          <SL text={t("Opasna zona")} icon="alert"/>
          {!confirm
            ? <Row icon="trash" label={t("Obriši sve podatke")} danger onClick={()=>setConfirm(true)} right={false}/>
            : <div className="su" style={{ background:`${C.expense}12`, border:`1px solid ${C.expense}40`, borderRadius:13, padding:15, marginBottom:7 }}>
                <p style={{ fontSize:13, color:C.expense, fontWeight:600, marginBottom:12, display:"flex", alignItems:"center", gap:6 }}><Ic n="alert" s={14} c={C.expense}/>{t("Ovo se ne može poništiti!")}</p>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>{ setTxs([]); setConfirm(false); }} style={{ flex:1, padding:11, background:C.expense, border:"none", borderRadius:10, color:"#fff", fontWeight:700, cursor:"pointer" }}>{t("Da, obriši")}</button>
                  <button onClick={()=>setConfirm(false)} style={{ flex:1, padding:11, background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, cursor:"pointer" }}>{t("Odustani")}</button>
                </div>
              </div>
          }
        </div>

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:15, marginBottom:28, marginTop:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:"flex", alignItems:"center", justifyContent:"center" }}><Ic n="wallet" s={20} c="#fff"/></div>
            <div><div style={{ fontSize:15, fontWeight:700, color:C.text }}>{t("Moja lova")}</div><div style={{ fontSize:11, color:C.textMuted }}>{t("Verzija")} 1.2</div></div>
          </div>
          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:11 }}>
            <p style={{ fontSize:13, fontWeight:600, color:C.text }}>{t("Autor:")} Bojan Vivoda</p>
            <p style={{ fontSize:11, color:C.textMuted, marginTop:3 }}>© {cy} Bojan Vivoda · {t("Sva prava pridržana.")}</p>
            <p style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{t("Osobna upotreba · Nije za komercijalnu distribuciju.")}</p>
          </div>
        </div>
        
        {share && <ShareModal C={C} txs={txs} year={year} user={user} onClose={()=>setShare(false)} t={t} lang={lang} />}

        {/* Export modal — always shown when the user clicks Export (Backup).
            Provides three reliable save paths so at least one works on any
            device: Copy (works everywhere), Share (native share sheet),
            Download (browser download). */}
        {exportFallback && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={e=>{ if(e.target===e.currentTarget) setExportFallback(null); }}>
            <div className="su" style={{ background:C.card, borderRadius:18, width:"100%", maxWidth:420, padding:20, border:`1px solid ${C.border}`, maxHeight:"85vh", display:"flex", flexDirection:"column" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <h3 style={{ fontSize:16, fontWeight:700, color:C.text, display:"flex", alignItems:"center", gap:8 }}>
                  <Ic n="dl" s={17} c={C.warning}/>{t("Izvezi (Backup)")}
                </h3>
                <button onClick={()=>setExportFallback(null)} style={{ background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:6, cursor:"pointer" }}>
                  <Ic n="x" s={14} c={C.textMuted}/>
                </button>
              </div>
              <p style={{ fontSize:12, color:C.textMuted, marginBottom:10, lineHeight:1.5 }}>
                {t("Spremi backup koristeći jednu od opcija ispod. Ako jedna ne radi, druga hoće.")}
              </p>
              <div style={{ fontSize:11, color:C.textSub, marginBottom:8, fontFamily:"'JetBrains Mono',monospace" }}>
                {exportFallback.filename}
              </div>
              <textarea
                readOnly
                value={exportFallback.content}
                onFocus={e=>e.target.select()}
                style={{ width:"100%", flex:1, minHeight:140, padding:10, background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:11, fontFamily:"'JetBrains Mono',monospace", resize:"none", marginBottom:12 }}
              />
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                {/* Copy — works in every environment */}
                <button onClick={async ()=>{
                  try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      await navigator.clipboard.writeText(exportFallback.content);
                    } else {
                      const ta = document.createElement("textarea");
                      ta.value = exportFallback.content;
                      document.body.appendChild(ta);
                      ta.select();
                      document.execCommand("copy");
                      document.body.removeChild(ta);
                    }
                    alert(t("Kopirano!"));
                  } catch {
                    alert(t("Greška pri čitanju datoteke."));
                  }
                }} style={{ padding:12, background:`linear-gradient(135deg,${C.warning},#F59E0B)`, border:"none", borderRadius:12, color:"#000", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                  <Ic n="copy" s={14} c="#000"/>{t("Kopiraj")}
                </button>

                {/* Share — tries Web Share API (file first, then text) */}
                <button onClick={async ()=>{
                  const { filename, content } = exportFallback;
                  try {
                    if (typeof File !== "undefined" && typeof navigator !== "undefined" && typeof navigator.canShare === "function") {
                      const file = new File([content], filename, { type: "application/json" });
                      if (navigator.canShare({ files: [file] })) {
                        await navigator.share({ files: [file], title: "Moja lova — Backup", text: filename });
                        return;
                      }
                    }
                    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
                      await navigator.share({ title: filename, text: content });
                      return;
                    }
                    alert(t("Dijeljenje nije podržano na ovom uređaju. Koristi Kopiraj ili Preuzmi."));
                  } catch (shareErr) {
                    if (shareErr && shareErr.name === "AbortError") return;
                    alert(t("Dijeljenje nije uspjelo. Koristi Kopiraj ili Preuzmi."));
                  }
                }} style={{ padding:12, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, border:"none", borderRadius:12, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                  <Ic n="share" s={14} c="#fff"/>{t("Podijeli")}
                </button>

                {/* Download — prefers native Capacitor save on APK (guaranteed
                    to write a real file into Documents); falls back to the
                    classic browser download on web. */}
                <button onClick={async ()=>{
                  const { filename, content } = exportFallback;
                  // 1) Try native (Capacitor Filesystem + Share).
                  if (isCapacitor()) {
                    const ok = await nativeSaveAndShare(filename, content);
                    if (ok) {
                      alert(t("Backup uspješno spremljen."));
                      return;
                    }
                    // If native failed (plugins missing or permission denied),
                    // fall through to web download below.
                  }
                  // 2) Web fallback — standard anchor download.
                  try {
                    const blob = new Blob([content], { type: "application/json" });
                    const url  = URL.createObjectURL(blob);
                    const a    = document.createElement("a");
                    a.href = url;
                    a.download = filename;
                    a.rel = "noopener";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  } catch {
                    alert(t("Preuzimanje nije uspjelo. Koristi Kopiraj ili Podijeli."));
                  }
                }} style={{ padding:12, background:`linear-gradient(135deg,${C.income},#059669)`, border:"none", borderRadius:12, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                  <Ic n="dl" s={14} c="#fff"/>{t("Preuzmi")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Settings (Glavni izbornik) ───────────────────────────────────────────────
function Settings({ C, txs, setTxs, prefs, updPrefs, user, updUser, lists, setLists, subPg, setSubPg, year, sec, updSec, setUnlocked, setSetupMode, t, lang }) {
  const cy = curYear();
  const years = Array.from({length:12},(_,i)=>cy-5+i);

  if (subPg) {
    if (subPg === "general") {
      return <GeneralSettings C={C} txs={txs} setTxs={setTxs} prefs={prefs} updPrefs={updPrefs} user={user} updUser={updUser} sec={sec} updSec={updSec} year={year} setSetupMode={setSetupMode} setUnlocked={setUnlocked} onBack={()=>setSubPg(null)} t={t} lang={lang} />;
    }
    if (subPg === "recurring") {
      return <RecurringEditor C={C} items={lists.recurring||[]} lists={lists} t={t} onBack={arr=>{ setLists(l=>({...l,recurring:arr})); setSubPg(null); }}/>;
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
        </div>

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:15, marginBottom:28, marginTop:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:`linear-gradient(135deg,${C.accent},${C.accentDk})`, display:"flex", alignItems:"center", justifyContent:"center" }}><Ic n="wallet" s={20} c="#fff"/></div>
            <div><div style={{ fontSize:15, fontWeight:700, color:C.text }}>{t("Moja lova")}</div><div style={{ fontSize:11, color:C.textMuted }}>{t("Verzija")} 1.2</div></div>
          </div>
          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:11 }}>
            <p style={{ fontSize:13, fontWeight:600, color:C.text }}>{t("Autor:")} Bojan Vivoda</p>
            <p style={{ fontSize:11, color:C.textMuted, marginTop:3 }}>© {cy} Bojan Vivoda · {t("Sva prava pridržana.")}</p>
            <p style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{t("Osobna upotreba · Nije za komercijalnu distribuciju.")}</p>
          </div>
        </div>

      </div>
    </div>
  );
}