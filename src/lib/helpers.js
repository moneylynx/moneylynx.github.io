import { MONTHS, MONTHS_EN, BACKUP_REMIND_AFTER_MS } from './constants.js';

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
  try {
    const [fs, sh] = await Promise.all([
      import("@capacitor/filesystem").catch(() => null),
      import("@capacitor/share").catch(() => null),
    ]);
    if (!fs || !sh) return false;
    const { Filesystem, Directory, Encoding } = fs;
    const { Share } = sh;
    const writeRes = await Filesystem.writeFile({
      path: filename, data: content, directory: Directory.Documents,
      encoding: Encoding.UTF8, recursive: true,
    });
    try {
      await Share.share({
        title: "Moja lova — Backup", text: filename,
        url: writeRes && writeRes.uri, dialogTitle: filename,
      });
    } catch { /* user cancelled share; file is still saved */ }
    return true;
  } catch (e) {
    console.warn("nativeSaveAndShare failed:", e);
    return false;
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
