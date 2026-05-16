import { MONTHS, MONTHS_EN, BACKUP_REMIND_AFTER_MS } from './constants.js';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// ─── Formatters ───────────────────────────────────────────────────────────────
export const fmtEur = n => {
  if (n == null || isNaN(n)) return "0,00 €";
  const a = Math.abs(n);
  const s = a.toFixed(2).replace(".",",").replace(/\B(?=(\d{3})+(?!\d))/g,".");
  return n < 0 ? `-${s} €` : `${s} €`;
};

// Currency formatter — uses Intl.NumberFormat with selected currency
export const fmtCurrency = (n, currency = "EUR") => {
  if (n == null || isNaN(n)) {
    try {
      return new Intl.NumberFormat("hr-HR", { style:"currency", currency, minimumFractionDigits:2 }).format(0);
    } catch { return "0,00 €"; }
  }
  try {
    return new Intl.NumberFormat("hr-HR", { style:"currency", currency, minimumFractionDigits:2 }).format(n);
  } catch { return fmtEur(n); }
};

// Currency symbol only
export const currencySymbol = (currency = "EUR") => {
  try {
    const parts = new Intl.NumberFormat("hr-HR", { style:"currency", currency }).formatToParts(0);
    return parts.find(p => p.type === "currency")?.value || currency;
  } catch { return currency; }
};

export const fDate = d => {
  if (!d) return "";
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,"0")}.${String(dt.getMonth()+1).padStart(2,"0")}.${dt.getFullYear()}.`;
};

// Date formatter with timezone
export const fDateTZ = (d, timezone) => {
  if (!d) return "";
  if (!timezone) return fDate(d);
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString("hr-HR", { timeZone: timezone, day:"2-digit", month:"2-digit", year:"numeric" }).replace(/\//g, ".");
  } catch { return fDate(d); }
};

export const monthOf = d => d ? MONTHS[new Date(d).getMonth()] ?? MONTHS[0] : MONTHS[0];
export const curMonthIdx = () => new Date().getMonth();
export const curYear = () => new Date().getFullYear();

// ─── LocalStorage ─────────────────────────────────────────────────────────────
export const load  = (k,fb) => { try { const v=localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
export const save  = (k,v)  => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
export const saveRaw = (k,v) => { try { localStorage.setItem(k, v); } catch {} };
export const loadRaw = (k)   => { try { return localStorage.getItem(k) || null; } catch { return null; } };

// ─── Backup reminder ─────────────────────────────────────────────────────────
export const needsBackupReminder = (prefs) => {
  if (!prefs) return false;
  const now = Date.now();
  if (prefs.backupSnoozedUntil && prefs.backupSnoozedUntil > now) return false;
  const last = prefs.lastBackupAt || prefs.firstUseAt || 0;
  if (!last) return false;
  return (now - last) >= BACKUP_REMIND_AFTER_MS;
};

// ─── Capacitor native bridge ──────────────────────────────────────────────────
export const isCapacitor = () =>
  typeof window !== "undefined"
  && window.Capacitor
  && typeof window.Capacitor.isNativePlatform === "function"
  && window.Capacitor.isNativePlatform();

export const nativeSaveAndShare = async (filename, content) => {
  if (!isCapacitor()) return false;
  // Try writing to Cache first (always writable on Android, no permission needed).
  // Cache is internal to the app, but Share plugin gives us a content:// URI that
  // the OS share sheet exposes (Save to Drive, Save to Downloads, send via Mail…).
  let writeRes = null;
  let lastError = null;
  try {
    writeRes = await Filesystem.writeFile({
      path: filename,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
      recursive: true,
    });
  } catch (e1) {
    lastError = e1;
    // Fallback: Documents (app-private but reliable).
    try {
      writeRes = await Filesystem.writeFile({
        path: filename,
        data: content,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });
    } catch (e2) {
      lastError = e2;
    }
  }
  if (!writeRes) {
    console.warn("nativeSaveAndShare: write failed:", lastError);
    return false;
  }
  // Open share sheet so user can save to Downloads / Drive / send via WhatsApp etc.
  try {
    await Share.share({
      title: "Money Lynx — Backup",
      text: filename,
      url: writeRes.uri,
      dialogTitle: filename,
    });
  } catch (shareErr) {
    // User cancelled or share unavailable — file is still saved in Cache.
    if (shareErr && shareErr.message && !/cancel/i.test(shareErr.message)) {
      console.warn("Share failed:", shareErr);
    }
  }
  return true;
};

// Save to local storage. On Android 14+, ExternalStorage/Download requires MANAGE_EXTERNAL_STORAGE.
// Strategy: try ExternalStorage/Download first; if blocked, fall back to app-private Documents.
// Documents path is always writable on any Android version without special permission.
export const nativeSaveToDownloads = async (filename, content) => {
  if (!isCapacitor()) return { ok:false, location:null };

  // Step 1: Request storage permission — on Android 11+ this triggers
  // "Allow all files access" settings page for MANAGE_EXTERNAL_STORAGE.
  try {
    const perm = await Filesystem.requestPermissions();
    if (perm?.publicStorage === 'granted') {
      // Permission granted — write to public Downloads folder
      try {
        const res = await Filesystem.writeFile({
          path: `Download/${filename}`,
          data: content,
          directory: Directory.ExternalStorage,
          encoding: Encoding.UTF8,
          recursive: true,
        });
        return { ok:true, location:`Downloads/${filename}`, uri: res.uri };
      } catch (eWrite) {
        return { ok:false, location:null, error: `Write failed after permission: ${eWrite?.message}` };
      }
    }
    // Permission denied by user
    return { ok:false, location:null, error: 'permission_denied' };
  } catch (ePerm) {
    // requestPermissions itself failed (e.g. already denied permanently)
    // Try anyway — permission may have been granted manually in Settings
    try {
      const res = await Filesystem.writeFile({
        path: `Download/${filename}`,
        data: content,
        directory: Directory.ExternalStorage,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      return { ok:true, location:`Downloads/${filename}`, uri: res.uri };
    } catch (eFallback) {
      return { ok:false, location:null, error: eFallback?.message || String(eFallback) };
    }
  }
};

// ─── CSV / Summary builders ───────────────────────────────────────────────────
export const buildCSV = (txs, t, lang) => {
  const hdr = `${t("Datum")},${t("Mjesec")},${t("Tip")},${t("Opis")},${t("Lokacija")},${t("Kategorija")},${t("Plaćanje")},${t("Iznos (€)")},${t("Status")},${t("Napomene")}\n`;
  const M_Arr = lang === "en" ? MONTHS_EN : MONTHS;
  const rows = txs.map(tx => {
    const mName = M_Arr[new Date(tx.date).getMonth()];
    return `${fDate(tx.date)},${mName},${t(tx.type)},"${tx.description}",${t(tx.location)??""},${t(tx.category)??""},${t(tx.payment)??""},${+tx.amount||0},${t(tx.status)??""},"${tx.notes??""}"`;
  }).join("\n");
  return "\uFEFF" + hdr + rows;
};

export const buildSummary = (txs, year, user, t) => {
  const yd  = txs.filter(x => new Date(x.date).getFullYear() === year);
  const inc = yd.filter(x=>x.type==="Primitak").reduce((s,x)=>s+(+x.amount||0),0);
  const exp = yd.filter(x=>x.type==="Isplata").reduce((s,x)=>s+(+x.amount||0),0);
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "—";
  return [
    `${t("Moja Lova")} — ${t("Sažetak")} ${year}.`, "",
    `${t("Korisnik")} : ${name}`,
    user?.phone  ? `${t("Telefon")}  : ${user.phone}`  : null,
    user?.email  ? `${t("E-mail")}   : ${user.email}`  : null,
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

// ─── Safe number helpers ──────────────────────────────────────────────────────
// Guard against NaN/null/undefined in transaction amounts.
// Use these in all reduce operations to prevent a single bad record from
// crashing Charts, advisor, or any other calculation screen.

/** Safely parse a numeric value — returns 0 for anything non-numeric. */
export const safeNum = (v) => {
  const n = parseFloat(v);
  return isFinite(n) ? n : 0;
};

/** Sum an array of transactions by extracting a numeric field. */
export const safeSum = (arr, fn) =>
  (arr || []).reduce((s, x) => { try { return s + safeNum(fn(x)); } catch { return s; } }, 0);

// ─── Split-transaction analytics helper ──────────────────────────────────────
// A "split" transaction has tx.splits = [{id, amount, category, description}].
// For analytics (charts, forecasts, category totals) we expand each split
// into a virtual transaction so amounts flow to their correct categories.
// Regular transactions (tx.splits falsy) are returned unchanged.

/**
 * Expand split transactions into virtual per-category records.
 * Safe to call on any array — non-split txs pass through unchanged.
 * @param {Array} txs
 * @returns {Array} expanded txs ready for reduce operations
 */
export function expandSplits(txs) {
  const out = [];
  for (const tx of txs || []) {
    if (!tx.splits || !tx.splits.length) {
      out.push(tx);
    } else {
      for (const split of tx.splits) {
        out.push({
          ...tx,
          id:          `${tx.id}_split_${split.id}`,
          amount:      safeNum(split.amount),
          category:    split.category || tx.category,
          description: split.description || tx.description,
          _splitParent: tx.id,
        });
      }
    }
  }
  return out;
}


// ── translateNote ──────────────────────────────────────────────────────────
// Legacy note translator. Transaction notes are persisted in the language the
// user was using when the transaction was created. When the user switches to
// another language, those frozen strings would otherwise stay in the original
// language. This helper recognises the well-known patterns and translates
// month names + labels at render time without modifying stored data.
//
// Patterns supported:
//   "Ponavljajući trošak"                      → "Recurring expense"
//   "Redovna obveza · {MonthName} {Year}."     → "Recurring obligation · April 2026."
//   "Obrok N/M · 389,00 €"                     → "Instalment N/M · 389,00 €"
//   "Rata N/M · Ukupno: 389,00 €"              → "Instalment N/M · Total: 389,00 €"
//   "OCR račun:\n..."                          → "OCR receipt:\n..."
export const translateNote = (note, lang) => {
  if (!note || lang === "hr") return note;
  if (lang !== "en") return note;
  const HR_TO_EN_MONTHS = {
    "Siječanj": "January", "Veljača": "February", "Ožujak": "March",
    "Travanj": "April",   "Svibanj": "May",      "Lipanj": "June",
    "Srpanj":  "July",    "Kolovoz": "August",   "Rujan":  "September",
    "Listopad":"October", "Studeni": "November", "Prosinac":"December",
  };
  let out = note;
  // Label translations (longest first to avoid partial collisions)
  const REPL = [
    [/Ponavljajući trošak/g, "Recurring expense"],
    [/Redovna obveza/g,      "Recurring obligation"],
    [/Ukupno:/g,             "Total:"],
    [/Obrok\s/g,             "Instalment "],
    [/Rata\s/g,              "Instalment "],
    [/OCR račun:/g,          "OCR receipt:"],
  ];
  for (const [re, en] of REPL) out = out.replace(re, en);
  // HR month names → EN
  for (const [hr, en] of Object.entries(HR_TO_EN_MONTHS)) {
    out = out.replace(new RegExp(`\\b${hr}\\b`, "g"), en);
  }
  return out;
};
