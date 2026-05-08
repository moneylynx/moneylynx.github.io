// ─── Months ───────────────────────────────────────────────────────────────────
export const MONTHS = ["Siječanj","Veljača","Ožujak","Travanj","Svibanj","Lipanj","Srpanj","Kolovoz","Rujan","Listopad","Studeni","Prosinac"];
export const MSHORT = ["Sij.","Velj.","Ožu.","Trav.","Svi.","Lip.","Srp.","Kol.","Ruj.","Lis.","Stu.","Pro."];

export const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
export const MSHORT_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── Default lists ────────────────────────────────────────────────────────────
export const DEF_LISTS = {
  categories_expense: ["Hrana","Prijevoz","Režije","Kredit","Osiguranje","Porez","Visa premium","Zabava","Pretplata","Putovanja","Oprema","Radovi","Usluge","Investicije","Ostali izdaci"],
  categories_income:  ["Plaća","Uplata","Ostali primici"],
  locations:  ["Zagreb","Knežija","Kajini","Šimunčevec","Online","Ostalo"],
  payments:   ["Gotovina","Kartica (debitna)","Kreditna kartica","Bankovni prijenos","Online plaćanje"],
  statuses:   ["Plaćeno","Čeka plaćanje","U obradi"],
  recurring:        [],  // recurring expenses
  recurring_income: [],  // recurring income (salary, rent received, honorari…)
  budgets:          {}, // { "Hrana": 400, "Zabava": 100, ... } — monthly limits per category
};

// ─── Themes ───────────────────────────────────────────────────────────────────
export const T = {
  dark: {
    bg:"#0A1628", card:"#0F2035", cardAlt:"#162845",
    accent:"#38BDF8", accentDk:"#0EA5E9", accentGlow:"#38BDF830",
    income:"#34D399", expense:"#F87171", warning:"#FBBF24",
    text:"#F1F5F9", textMuted:"#7A9EC0", textSub:"#94A3B8",
    border:"#1A3355", navBg:"#07111E",
  },
  light: {
    bg:"#EEF4FB",            // layered off-white — cards pop above it
    card:"#FFFFFF",           // pure white cards have clear contrast vs bg
    cardAlt:"#E2ECFB",        // distinct input/secondary fill (was too close to card)
    accent:"#0284C7",         // deeper sky-blue (was #0EA5E9 — washed out on white)
    accentDk:"#0369A1",
    accentGlow:"#0284C720",
    income:"#059669",
    expense:"#DC2626",
    warning:"#B45309",        // deeper amber — clearer on white bg
    text:"#0F172A",
    textMuted:"#475569",      // darker (was #64748B — too low contrast)
    textSub:"#334155",        // darker (was #475569)
    border:"#C2D4ED",         // stronger border (was #DBEAFE — nearly invisible)
    navBg:"#FFFFFF",
    shadow:"0 1px 4px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)",
  },
};

export const CHART_COLORS = ["#38BDF8","#34D399","#F87171","#FBBF24","#A78BFA","#F472B6","#22D3EE","#86EFAC","#FCA5A5","#FCD34D","#C4B5FD","#FB923C"];

// ─── Security constants ───────────────────────────────────────────────────────
export const MAX_ATT = 5;
export const LOCK_SEC = 30;
export const WIPE_AT = 10;

// ─── Storage keys ─────────────────────────────────────────────────────────────
export const K = { db:"ml_data", prf:"ml_prefs", lst:"ml_lists", usr:"ml_user", sec:"ml_sec", drf:"ml_drafts" };

// ─── Backup reminder ─────────────────────────────────────────────────────────
export const BACKUP_REMIND_AFTER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const BACKUP_SNOOZE_MS       =  7 * 24 * 60 * 60 * 1000; //  7 days

// ─── Countries (auto-detect) ──────────────────────────────────────────────────
export const COUNTRIES = [
  { code:"HR", name:"Hrvatska",       nameEN:"Croatia",       currency:"EUR", timezone:"Europe/Zagreb" },
  { code:"BA", name:"Bosna i Hercegovina", nameEN:"Bosnia & Herzegovina", currency:"BAM", timezone:"Europe/Sarajevo" },
  { code:"RS", name:"Srbija",         nameEN:"Serbia",        currency:"RSD", timezone:"Europe/Belgrade" },
  { code:"SI", name:"Slovenija",      nameEN:"Slovenia",      currency:"EUR", timezone:"Europe/Ljubljana" },
  { code:"ME", name:"Crna Gora",      nameEN:"Montenegro",    currency:"EUR", timezone:"Europe/Belgrade" },
  { code:"MK", name:"Sjeverna Makedonija", nameEN:"North Macedonia", currency:"EUR", timezone:"Europe/Belgrade" },
  { code:"AT", name:"Austrija",       nameEN:"Austria",       currency:"EUR", timezone:"Europe/Vienna" },
  { code:"DE", name:"Njemačka",       nameEN:"Germany",       currency:"EUR", timezone:"Europe/Berlin" },
  { code:"CH", name:"Švicarska",      nameEN:"Switzerland",   currency:"CHF", timezone:"Europe/Zurich" },
  { code:"IT", name:"Italija",        nameEN:"Italy",         currency:"EUR", timezone:"Europe/Rome" },
  { code:"HU", name:"Mađarska",       nameEN:"Hungary",       currency:"HUF", timezone:"Europe/Budapest" },
  { code:"CZ", name:"Češka",          nameEN:"Czech Republic", currency:"CZK", timezone:"Europe/Prague" },
  { code:"PL", name:"Poljska",        nameEN:"Poland",        currency:"PLN", timezone:"Europe/Warsaw" },
  { code:"FR", name:"Francuska",      nameEN:"France",        currency:"EUR", timezone:"Europe/Paris" },
  { code:"GB", name:"Velika Britanija", nameEN:"United Kingdom", currency:"GBP", timezone:"Europe/London" },
  { code:"US", name:"SAD",            nameEN:"United States",  currency:"USD", timezone:"America/New_York" },
  { code:"AE", name:"UAE",            nameEN:"UAE",            currency:"USD", timezone:"Asia/Dubai" },
  { code:"AU", name:"Australija",     nameEN:"Australia",      currency:"USD", timezone:"Australia/Sydney" },
];
export const CURRENCIES = [
  { code:"EUR", name:"Euro (€)" },
  { code:"USD", name:"US Dollar ($)" },
  { code:"HRK", name:"Hrvatska kuna (kn)" },
  { code:"GBP", name:"British Pound (£)" },
  { code:"CHF", name:"Swiss Franc (CHF)" },
  { code:"BAM", name:"Konvertibilna marka (KM)" },
  { code:"RSD", name:"Srpski dinar (RSD)" },
  { code:"HUF", name:"Mađarska forinta (Ft)" },
  { code:"CZK", name:"Češka kruna (Kč)" },
  { code:"PLN", name:"Poljski zlot (zł)" },
];

// ─── Timezones ────────────────────────────────────────────────────────────────
export const TIMEZONES = [
  { value:"Europe/Zagreb",    label:"Zagreb (CET/CEST)" },
  { value:"Europe/Belgrade",  label:"Beograd (CET/CEST)" },
  { value:"Europe/Sarajevo",  label:"Sarajevo (CET/CEST)" },
  { value:"Europe/Ljubljana", label:"Ljubljana (CET/CEST)" },
  { value:"Europe/London",    label:"London (GMT/BST)" },
  { value:"Europe/Paris",     label:"Paris (CET/CEST)" },
  { value:"Europe/Berlin",    label:"Berlin (CET/CEST)" },
  { value:"Europe/Vienna",    label:"Beč (CET/CEST)" },
  { value:"Europe/Rome",      label:"Rim (CET/CEST)" },
  { value:"Europe/Athens",    label:"Atena (EET/EEST)" },
  { value:"America/New_York", label:"New York (EST/EDT)" },
  { value:"America/Chicago",  label:"Chicago (CST/CDT)" },
  { value:"America/Los_Angeles", label:"Los Angeles (PST/PDT)" },
  { value:"Asia/Dubai",       label:"Dubai (GST)" },
  { value:"Asia/Tokyo",       label:"Tokio (JST)" },
  { value:"Australia/Sydney", label:"Sydney (AEST/AEDT)" },
];
