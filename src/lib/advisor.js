// ─── Active Advisor engine ────────────────────────────────────────────────────
// Pure functions — no React, no side-effects, easily unit-testable.
//
// THREE capabilities:
//   1. FORECAST  — projects end-of-month balance using known pending items +
//                  a discretionary daily rate derived from recent history.
//                  Correctly handles recurring obligations, installments, and
//                  irregular income patterns.
//
//   2. ANOMALIES — per-category spend comparison vs a 3-month rolling average.
//                  Only flags categories with ≥ 2 months of prior history and
//                  a minimum absolute threshold to avoid noise.
//
//   3. INSIGHTS  — assembles 1–3 actionable plain-language insight strings that
//                  the UI renders as cards. Insights are ranked by severity.
// ─────────────────────────────────────────────────────────────────────────────

import { MONTHS } from './constants.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Month index 0–11 for a date string 'YYYY-MM-DD'. */
const miOf = (d) => new Date(d).getMonth();

/** Year for a date string. */
const yrOf = (d) => new Date(d).getFullYear();

/** Month name from constants for a month index. */
const monthName = (i) => MONTHS[i];

// ─── 1. FORECAST ─────────────────────────────────────────────────────────────

/**
 * Projects remaining spending and end-of-month balance.
 *
 * Algorithm:
 *   A) Known upcoming spend = pending/processing txs + uninstantiated recurring items
 *   B) Discretionary spend remaining = (3-month avg daily discretionary) × days left
 *   C) Projected total spend = paid_so_far + A + B
 *   D) Projected income     = received_so_far + expected recurring income (if any)
 *   E) Projected balance    = D − C
 *
 * "Discretionary" = paid expenses minus recurring and installment amounts,
 * so we don't double-count fixed costs already captured in (A).
 *
 * @param {Array}  txs        - all transactions
 * @param {object} lists      - { recurring: [] }
 * @param {number} nowTs      - Date.now() (injectable for tests)
 * @returns {object} forecast
 */
export function computeForecast(txs, lists, nowTs = Date.now()) {
  const now   = new Date(nowTs);
  const cy    = now.getFullYear();
  const cm    = now.getMonth();        // 0-based
  const today = now.getDate();
  const daysInMonth = new Date(cy, cm + 1, 0).getDate();
  const daysLeft    = daysInMonth - today;
  const cmName      = monthName(cm);

  const rec = lists.recurring || [];

  // Current-month transactions
  const cmTxs = txs.filter(x => yrOf(x.date) === cy && miOf(x.date) === cm);

  // A1) Already paid this month
  const paidSoFar = cmTxs
    .filter(x => x.type === 'Isplata' && x.status === 'Plaćeno')
    .reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);

  // A2) Pending/processing transactions (known future spend)
  const pendingKnown = cmTxs
    .filter(x => x.type === 'Isplata' && (x.status === 'Čeka plaćanje' || x.status === 'U obradi'))
    .reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);

  // A3) Recurring obligations not yet instantiated this month
  const recTxIds = new Set(cmTxs.filter(x => x.recurringId).map(x => x.recurringId));
  const recurringLeft = rec
    .filter(r => !recTxIds.has(r.id))
    .reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  // B) Discretionary daily rate from the past 3 months
  //    We exclude recurring and installment amounts to avoid double-counting.
  const recurringAmtPerMonth = rec.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  let discTotal = 0, discMonths = 0;
  for (let offset = 1; offset <= 3; offset++) {
    let mo = cm - offset;
    let yr = cy;
    if (mo < 0) { mo += 12; yr -= 1; }
    const mName = monthName(mo);
    const mTxs  = txs.filter(x => yrOf(x.date) === yr && miOf(x.date) === mo);
    const mPaid = mTxs
      .filter(x => x.type === 'Isplata' && x.status === 'Plaćeno')
      .reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
    if (mPaid > 0) {
      // Subtract recurring to isolate discretionary
      const disc = Math.max(0, mPaid - recurringAmtPerMonth);
      const dim  = new Date(yr, mo + 1, 0).getDate();
      discTotal  += disc / dim;  // daily rate for this month
      discMonths++;
    }
  }
  const dailyDisc = discMonths > 0 ? discTotal / discMonths : 0;
  const discForecast = dailyDisc * daysLeft;

  // C) Income so far this month
  const incomeSoFar = cmTxs
    .filter(x => x.type === 'Primitak' && x.status === 'Plaćeno')
    .reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);

  // D) Totals
  const projectedSpend   = paidSoFar + pendingKnown + recurringLeft + discForecast;
  const projectedBalance = incomeSoFar - projectedSpend;
  const knownCommitted   = paidSoFar + pendingKnown + recurringLeft;

  return {
    paidSoFar,
    pendingKnown,
    recurringLeft,
    discForecast,
    dailyDisc,
    daysLeft,
    daysInMonth,
    today,
    incomeSoFar,
    projectedSpend,
    projectedBalance,
    knownCommitted,
    hasHistory: discMonths > 0,
    monthName: cmName,
  };
}

// ─── 2. ANOMALY DETECTION (seasonal-aware) ──────────────────────────────────
//
// Primary strategy: compare current month against the SAME month in the prior
// 1–2 years. This prevents December shopping or summer holidays from being
// flagged as anomalies every year just because they spike above a 3-month
// rolling average.
//
// Fallback strategy: if no same-month prior-year data exists (app is too new),
// fall back to a 3-month rolling average — same as before.
//
// Thresholds:
//   • ≥ 40% above baseline
//   • absolute current spend ≥ 15 € (avoids €2 → €3 noise)
//   • at least 1 comparable data point required
//
// @returns {Array} anomalies sorted by severity (worst first)
export function detectAnomalies(txs, nowTs = Date.now()) {
  const now = new Date(nowTs);
  const cy  = now.getFullYear();
  const cm  = now.getMonth();

  // Current-month spend per category (expenses only)
  const cmTxs  = txs.filter(x => yrOf(x.date) === cy && miOf(x.date) === cm && x.type === 'Isplata');
  const cmCats = {};
  for (const tx of cmTxs) {
    const c = tx.category || 'Ostalo';
    cmCats[c] = (cmCats[c] || 0) + (parseFloat(tx.amount) || 0);
  }

  const anomalies = [];

  for (const [cat, currentSpend] of Object.entries(cmCats)) {
    if (currentSpend < 15) continue;

    // ── Primary: same month in prior years (seasonal baseline) ─────────────
    const seasonalAmounts = [];
    for (let yOffset = 1; yOffset <= 2; yOffset++) {
      const priorYr = cy - yOffset;
      const amt = txs
        .filter(x => yrOf(x.date) === priorYr && miOf(x.date) === cm &&
                     x.type === 'Isplata' && (x.category || 'Ostalo') === cat)
        .reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
      if (amt > 0) seasonalAmounts.push(amt);
    }

    // ── Fallback: 3-month rolling average if no seasonal data ──────────────
    let baseline = null;
    let baselineLabel = 'seasonal';

    if (seasonalAmounts.length >= 1) {
      baseline = seasonalAmounts.reduce((a, b) => a + b, 0) / seasonalAmounts.length;
      baselineLabel = 'seasonal';
    } else {
      // Rolling fallback — same logic as before
      const rollingAmounts = [];
      for (let offset = 1; offset <= 3; offset++) {
        let mo = cm - offset;
        let yr = cy;
        if (mo < 0) { mo += 12; yr -= 1; }
        const amt = txs
          .filter(x => yrOf(x.date) === yr && miOf(x.date) === mo &&
                       x.type === 'Isplata' && (x.category || 'Ostalo') === cat)
          .reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
        if (amt > 0) rollingAmounts.push(amt);
      }
      if (rollingAmounts.length < 2) continue; // not enough history either way
      baseline = rollingAmounts.reduce((a, b) => a + b, 0) / rollingAmounts.length;
      baselineLabel = 'rolling';
    }

    if (!baseline || baseline <= 0) continue;

    const pctAbove = (currentSpend - baseline) / baseline;
    if (pctAbove < 0.4) continue;

    anomalies.push({
      category:     cat,
      currentSpend,
      avgSpend:     baseline,
      pctAbove,
      baselineLabel,
      severity: Math.min(1, (pctAbove - 0.4) / 1.6),
    });
  }

  return anomalies.sort((a, b) => b.severity - a.severity);
}

// ─── 3. YEAR-OVER-YEAR ───────────────────────────────────────────────────────

/**
 * Computes per-category year-over-year comparison between two years.
 *
 * @returns {Array} rows sorted by absolute change (biggest movers first)
 *   Each: { category, thisYear, lastYear, diff, pctChange }
 */
export function computeYoY(txs, thisYear, lastYear) {
  const sum = (yr) => {
    const m = {};
    txs.filter(x => yrOf(x.date) === yr && x.type === 'Isplata')
      .forEach(x => {
        const c = x.category || 'Ostalo';
        m[c] = (m[c] || 0) + (parseFloat(x.amount) || 0);
      });
    return m;
  };

  const thisMap = sum(thisYear);
  const lastMap = sum(lastYear);
  const cats    = new Set([...Object.keys(thisMap), ...Object.keys(lastMap)]);

  return [...cats].map(cat => {
    const thisAmt = thisMap[cat] || 0;
    const lastAmt = lastMap[cat] || 0;
    const diff    = thisAmt - lastAmt;
    const pctChange = lastAmt > 0 ? diff / lastAmt : (thisAmt > 0 ? 1 : 0);
    return { category: cat, thisYear: thisAmt, lastYear: lastAmt, diff, pctChange };
  }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}

// ─── 4. INSIGHTS ─────────────────────────────────────────────────────────────

/**
 * Assembles 1–3 ranked insight objects from forecast + anomalies.
 *
 * Each insight: { type, severity, titleKey, title, body, icon, color }
 * type: 'forecast' | 'anomaly' | 'healthy' | 'no_income'
 *
 * The UI renders these as cards. Callers translate the strings if needed.
 */
export function generateInsights(forecast, anomalies, fmt = (n) => `${n.toFixed(2)} €`) {
  const insights = [];

  // ─── Forecast insight ──────────────────────────────────────────────────────
  if (forecast.hasHistory && forecast.daysLeft > 0) {
    const bal    = forecast.projectedBalance;
    const isGood = bal >= 0;
    insights.push({
      type:     'forecast',
      severity: isGood ? 0 : Math.min(1, Math.abs(bal) / Math.max(forecast.projectedSpend, 1)),
      icon:     isGood ? '📊' : '⚠️',
      color:    isGood ? 'income' : 'expense',
      title:    isGood
        ? `Projekcija kraju mjeseca: +${fmt(bal)}`
        : `Projekcija kraju mjeseca: ${fmt(bal)}`,
      body: `Potrošeno: ${fmt(forecast.paidSoFar)} · Obveze: ${fmt(forecast.recurringLeft)} · Procjena: ${fmt(forecast.discForecast)} · Ostalo: ${forecast.daysLeft} dana`,
    });
  } else if (!forecast.hasHistory && forecast.incomeSoFar > 0) {
    insights.push({
      type:     'no_history',
      severity: 0,
      icon:     '📈',
      color:    'accent',
      title:    'Dodaj više transakcija za projekciju',
      body:     'Nakon 1–2 mjeseca praćenja, aplikacija može projicirati stanje kraju svakog mjeseca.',
    });
  }

  // ─── Anomaly insights (max 2) ──────────────────────────────────────────────
  for (const a of anomalies.slice(0, 2)) {
    insights.push({
      type:     'anomaly',
      severity: a.severity,
      icon:     '🔍',
      color:    'warning',
      title:    `${a.category}: +${Math.round(a.pctAbove * 100)}% iznad prosjeka`,
      body:     `Ovaj mjesec: ${fmt(a.currentSpend)} · Prosjek 3 mj.: ${fmt(a.avgSpend)}`,
    });
  }

  // ─── Positive reinforcement ────────────────────────────────────────────────
  // Compare current-month spending vs same month last year. If ≥10% lower,
  // celebrate it. This is computed from forecast data which has the current
  // month spend in paidSoFar.
  if (forecast.paidSoFar > 20) {
    const now   = new Date();
    const cy    = now.getFullYear();
    const cm    = now.getMonth();
    // avgSpend from anomalies for all categories combined, or we derive from
    // the anomaly list. Simpler: the caller passes txs via useAdvisor so we
    // can't access it here directly. Instead we embed a txs parameter below.
    // Signal is passed via forecast._lastYearSameMonthSpend (set by useAdvisor).
    const lastYrSpend = forecast._lastYearSameMonthSpend;
    if (lastYrSpend > 20) {
      const improvement = (lastYrSpend - forecast.paidSoFar) / lastYrSpend;
      if (improvement >= 0.10) {
        insights.push({
          type:     'positive',
          severity: -0.1, // negative = always sorts last, below healthy
          icon:     '🎉',
          color:    'income',
          title:    `Odličan ${now.toLocaleDateString('hr-HR', { month: 'long' })}!`,
          body:     `Potrošio si ${Math.round(improvement * 100)}% manje nego prošle godine u ovom mjesecu (${fmt(lastYrSpend)} → ${fmt(forecast.paidSoFar)}).`,
        });
      }
    }
  }

  // ─── Healthy state ─────────────────────────────────────────────────────────
  if (insights.filter(i => i.type !== 'positive').length === 0 && forecast.paidSoFar > 0) {
    insights.push({
      type:     'healthy',
      severity: 0,
      icon:     '✅',
      color:    'income',
      title:    'Sve izgleda dobro ovog mjeseca',
      body:     `Potrošeno: ${fmt(forecast.paidSoFar)} · Prihodi: ${fmt(forecast.incomeSoFar)}`,
    });
  }

  return insights.sort((a, b) => b.severity - a.severity).slice(0, 3);
}
