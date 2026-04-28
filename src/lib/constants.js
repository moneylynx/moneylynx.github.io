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
  recurring:  [],
  budgets:    {}, // { "Hrana": 400, "Zabava": 100, ... } — monthly limits per category
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
    bg:"#FFFFFF", card:"#F8FAFC", cardAlt:"#EFF6FF",
    accent:"#0EA5E9", accentDk:"#0284C7", accentGlow:"#0EA5E920",
    income:"#059669", expense:"#DC2626", warning:"#D97706",
    text:"#0F172A", textMuted:"#64748B", textSub:"#475569",
    border:"#DBEAFE", navBg:"#FFFFFF",
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
