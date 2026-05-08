import { MONTHS } from './constants.js';
import { fmtCurrency, safeNum, expandSplits } from './helpers.js';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

const APP_TITLE = 'Moja Lova';
const APP_BRAND = 'MoneyLynx';

const downloadBlob = (filename, blob) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
};

const sortByDateDesc = (arr) => [...(arr || [])].sort((a,b)=>new Date(b.date)-new Date(a.date));
const yearRows = (txs, year) => (txs || []).filter(x => new Date(x.date).getFullYear() === year);

export const buildReportData = ({ txs, lists, prefs, user, year }) => {
  const rows = yearRows(txs, year);
  const splitRows = expandSplits(rows);
  const income = rows.filter(x=>x.type==='Primitak').reduce((s,x)=>s+safeNum(x.amount),0);
  const paidExpenses = rows.filter(x=>x.type==='Isplata' && x.status==='Plaćeno').reduce((s,x)=>s+safeNum(x.amount),0);
  const allExpenses = rows.filter(x=>x.type==='Isplata').reduce((s,x)=>s+safeNum(x.amount),0);
  const pending = rows.filter(x=>x.status==='Čeka plaćanje' || x.status==='U obradi').reduce((s,x)=>s+safeNum(x.amount),0);
  const monthly = MONTHS.map((m, idx) => {
    const mt = rows.filter(x=>new Date(x.date).getMonth()===idx);
    const inc = mt.filter(x=>x.type==='Primitak').reduce((s,x)=>s+safeNum(x.amount),0);
    const exp = mt.filter(x=>x.type==='Isplata' && x.status==='Plaćeno').reduce((s,x)=>s+safeNum(x.amount),0);
    const wait = mt.filter(x=>x.status==='Čeka plaćanje' || x.status==='U obradi').reduce((s,x)=>s+safeNum(x.amount),0);
    return { Mjesec:m, Primici:inc, Placeno:exp, Obveze:wait, Saldo:inc-exp };
  });
  const cats = {};
  splitRows.filter(x=>x.type==='Isplata').forEach(x => { cats[x.category || 'Ostalo'] = (cats[x.category || 'Ostalo'] || 0) + safeNum(x.amount); });
  const categoryRows = Object.entries(cats).map(([Kategorija, Iznos]) => {
    const budget = safeNum((lists?.budgets || {})[Kategorija]);
    return { Kategorija, Iznos, Budzet: budget || '', Iskoristenost: budget ? Iznos / budget : '' };
  }).sort((a,b)=>safeNum(b.Iznos)-safeNum(a.Iznos));
  const budgets = Object.entries(lists?.budgets || {})
    .filter(([,v]) => safeNum(v) > 0)
    .map(([Kategorija, Budzet]) => {
      const spent = safeNum(cats[Kategorija]);
      return { Kategorija, Budzet:safeNum(Budzet), Potroseno:spent, Preostalo:safeNum(Budzet)-spent, Iskoristenost:safeNum(Budzet)?spent/safeNum(Budzet):0 };
    }).sort((a,b)=>safeNum(b.Potroseno)-safeNum(a.Potroseno));
  const top = categoryRows.slice(0, 8);
  const profileName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Korisnik';
  return {
    title: APP_TITLE,
    brand: APP_BRAND,
    year,
    generatedAt: new Date().toLocaleString('hr-HR'),
    currency: prefs?.currency || 'EUR',
    profileName,
    summary: { income, paidExpenses, allExpenses, pending, balance: income - paidExpenses, txCount: rows.length },
    monthly,
    categories: categoryRows,
    budgets,
    top,
    txs: sortByDateDesc(rows),
  };
};

export async function exportReportXlsx(args) {
  const report = buildReportData(args);
  const wb = XLSX.utils.book_new();
  const summary = [
    ['Aplikacija', report.title], ['Brand', report.brand], ['Godina', report.year], ['Korisnik', report.profileName], ['Generirano', report.generatedAt], ['Valuta', report.currency], [],
    ['Primici', report.summary.income], ['Plaćeni troškovi', report.summary.paidExpenses], ['Sve obveze', report.summary.allExpenses], ['Čeka/U obradi', report.summary.pending], ['Saldo', report.summary.balance], ['Broj transakcija', report.summary.txCount],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Sažetak');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(report.monthly), 'Mjesečno');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(report.categories), 'Kategorije');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(report.budgets), 'Budžeti');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(report.txs.map(x => ({
    Datum: x.date, Tip: x.type, Opis: x.description, Kategorija: x.category, Lokacija: x.location, Placanje: x.payment, Iznos: safeNum(x.amount), Status: x.status, Napomene: x.notes || ''
  }))), 'Transakcije');
  XLSX.writeFile(wb, `moja_lova_izvjestaj_${report.year}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

export async function exportReportPdf(args, { pro = false } = {}) {
  const report = buildReportData(args);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const fmt = (n) => fmtCurrency(n, report.currency);
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  let y = 52;
  const margin = 42;
  const line = (txt, size=10, bold=false, color=[33, 45, 63]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const parts = doc.splitTextToSize(String(txt), W - margin*2);
    parts.forEach(p => { if (y > H - 55) { doc.addPage(); y = 52; } doc.text(p, margin, y); y += size + 5; });
  };
  const box = (label, value, x, y0, w, color) => {
    doc.setDrawColor(219, 234, 254); doc.roundedRect(x, y0, w, 52, 8, 8);
    doc.setFontSize(8); doc.setTextColor(100,116,139); doc.text(label, x+10, y0+18);
    doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(...color); doc.text(value, x+10, y0+38); doc.setFont('helvetica','normal');
  };
  line(`${report.title} by ${report.brand}`, 18, true, [2,132,199]);
  line('Osobne financije bez kompliciranja', 11, false, [71,85,105]);
  line(`Financijski izvještaj za ${report.year}. · Generirano: ${report.generatedAt}`, 9, false, [100,116,139]);
  y += 8;
  const bw = (W - margin*2 - 16) / 3;
  box('Primici', fmt(report.summary.income), margin, y, bw, [5,150,105]);
  box('Plaćeni troškovi', fmt(report.summary.paidExpenses), margin+bw+8, y, bw, [220,38,38]);
  box('Saldo', fmt(report.summary.balance), margin+(bw+8)*2, y, bw, report.summary.balance >= 0 ? [5,150,105] : [220,38,38]);
  y += 78;

  line('Mjesečni pregled', 13, true);
  report.monthly.forEach(m => {
    if (safeNum(m.Primici) || safeNum(m.Placeno) || safeNum(m.Obveze)) {
      line(`${m.Mjesec}: primici ${fmt(m.Primici)} · plaćeno ${fmt(m.Placeno)} · obveze ${fmt(m.Obveze)} · saldo ${fmt(m.Saldo)}`, 9);
    }
  });
  y += 8;
  line('Top kategorije', 13, true);
  const maxCat = Math.max(...report.top.map(c=>safeNum(c.Iznos)), 1);
  report.top.forEach(c => {
    if (y > H - 70) { doc.addPage(); y = 52; }
    const barW = Math.max(8, (safeNum(c.Iznos) / maxCat) * 220);
    doc.setFontSize(9); doc.setTextColor(15,23,42); doc.text(c.Kategorija, margin, y);
    doc.setTextColor(71,85,105); doc.text(fmt(c.Iznos), W - margin - 95, y);
    doc.setFillColor(56,189,248); doc.roundedRect(margin, y+6, barW, 6, 3, 3, 'F');
    y += 24;
  });
  y += 8;
  line('Budžeti', 13, true);
  if (report.budgets.length === 0) line('Nema definiranih budžeta.', 9, false, [100,116,139]);
  report.budgets.slice(0, 12).forEach(b => line(`${b.Kategorija}: budžet ${fmt(b.Budzet)} · potrošeno ${fmt(b.Potroseno)} · preostalo ${fmt(b.Preostalo)} · ${Math.round(safeNum(b.Iskoristenost)*100)}%`, 9));

  if (pro) {
    y += 10;
    line('PRO analiza: usporedbe, ciljevi i prognoze', 13, true, [2,132,199]);
    const lastYear = report.year - 1;
    const ly = buildReportData({ ...args, year: lastYear });
    const diff = report.summary.paidExpenses - ly.summary.paidExpenses;
    const pct = ly.summary.paidExpenses ? diff / ly.summary.paidExpenses : 0;
    line(`Godina/godina: troškovi ${report.year}. ${fmt(report.summary.paidExpenses)} naspram ${lastYear}. ${fmt(ly.summary.paidExpenses)} (${diff>=0?'+':''}${Math.round(pct*100)}%).`, 9);
    line('Ciljevi: modul za osobne ciljeve nije još aktiviran; izvještaj je pripremljen da ga uključi čim se doda model ciljeva.', 9, false, [100,116,139]);
    line('Prognoze: za stabilnu prognozu koristi se povijest transakcija i redovnih obveza; detaljni forecast ostaje PRO modul.', 9, false, [100,116,139]);
  }
  doc.save(`moja_lova_${pro?'pro_':''}izvjestaj_${report.year}_${new Date().toISOString().slice(0,10)}.pdf`);
}

export function exportReportCsvFallback(args) {
  const report = buildReportData(args);
  const rows = [
    ['Mjesec','Primici','Plaćeno','Obveze','Saldo'],
    ...report.monthly.map(m=>[m.Mjesec,m.Primici,m.Placeno,m.Obveze,m.Saldo]),
    [], ['Kategorija','Iznos','Budžet','Iskoristenost'],
    ...report.categories.map(c=>[c.Kategorija,c.Iznos,c.Budzet,c.Iskoristenost]),
  ];
  const csv = '\uFEFF' + rows.map(r=>r.map(v=>`"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
  downloadBlob(`moja_lova_izvjestaj_${report.year}.csv`, new Blob([csv], { type:'text/csv;charset=utf-8' }));
}
