// ─── Smart defaults engine ────────────────────────────────────────────────────
// Analyses the user's transaction history to predict the most likely values
// for category, location, payment, and status given a partial form.
//
// Strategy (updated v1.1 — AI hybrid):
//   0. NAIVE BAYES AI model (primary) — trained on full history, persisted in localStorage
//   1. EXACT description match (fallback if AI confidence < 0.5)
//   2. SUBSTRING / token match (fallback)
//   3. CATEGORY → typical PAYMENT
//   4. RECENT FALLBACK — top 5 recent tuples
// ─────────────────────────────────────────────────────────────────────────────

import { predictCategory, suggestCategories, loadModel } from './aiCategorizer.js';

const ZERO = { value: null, confidence: 0 };

/** Lowercase + trim + collapse whitespace. */
const norm = (s) => (s || '').toString().toLowerCase().trim().replace(/\s+/g, ' ');

/** Token split — words ≥ 3 chars, lowercase. */
const tokens = (s) => norm(s).split(/[\s,;./\-_(){}[\]]+/).filter(t => t.length >= 3);

/**
 * Build a frequency map for a key extracted from txs, scoped to a filter.
 * Returns array of [value, count] sorted descending.
 */
function freqMap(txs, keyFn, filter = () => true) {
  const m = new Map();
  for (const tx of txs) {
    if (!filter(tx)) continue;
    const v = keyFn(tx);
    if (!v) continue;
    m.set(v, (m.get(v) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/**
 * Predict the most likely value for a field, given a description and history.
 * Returns { value, confidence } where confidence is in [0, 1].
 */
function predictFromDescription(txs, description, fieldKey) {
  const desc = norm(description);
  if (!desc) return ZERO;

  // 1) Exact match.
  const exact = txs.filter(tx => norm(tx.description) === desc);
  if (exact.length > 0) {
    const map = freqMap(exact, tx => tx[fieldKey]);
    if (map.length > 0) {
      const [value, count] = map[0];
      return { value, confidence: Math.min(0.95, 0.6 + (count / exact.length) * 0.4) };
    }
  }

  // 2) Token overlap. Collect txs sharing at least one ≥3-char token.
  const descTokens = new Set(tokens(description));
  if (descTokens.size === 0) return ZERO;

  const matched = txs.filter(tx => {
    const txTokens = tokens(tx.description);
    return txTokens.some(t => descTokens.has(t));
  });
  if (matched.length === 0) return ZERO;

  const map = freqMap(matched, tx => tx[fieldKey]);
  if (map.length === 0) return ZERO;

  const [value, count] = map[0];
  // Lower confidence ceiling for fuzzy match.
  return { value, confidence: Math.min(0.7, 0.3 + (count / matched.length) * 0.4) };
}

/**
 * Top recent (category, location, payment) tuples — used as quick-fill chips.
 * Returns up to `n` tuples ordered by recency and frequency.
 */
export function topRecentCombos(txs, n = 5) {
  if (!txs || txs.length === 0) return [];

  // Take the most recent 100 expense txs (chronological — we'll sort by date).
  const recent = [...txs]
    .filter(tx => tx.type === 'Isplata' && tx.category && tx.category !== 'Ostalo')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 100);

  // Count tuples — same description+amount-bracket counts as same combo.
  const m = new Map();
  for (const tx of recent) {
    const key = JSON.stringify({
      d: norm(tx.description),
      c: tx.category,
      l: tx.location,
      p: tx.payment,
    });
    if (!m.has(key)) {
      m.set(key, {
        description: tx.description,
        category:    tx.category,
        location:    tx.location,
        payment:     tx.payment,
        amount:      tx.amount,  // last seen amount as default
        count:       0,
        lastDate:    tx.date,
      });
    }
    m.get(key).count++;
  }

  // Sort by count then recency.
  return [...m.values()]
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return new Date(b.lastDate) - new Date(a.lastDate);
    })
    .slice(0, n);
}

/**
 * Main prediction entry point. Given a partial form (just description so far),
 * return predicted values for all fields the user hasn't filled yet.
 *
 * Priority:
 *   1. AI (Naive Bayes) — if confidence ≥ 0.50, use as primary category prediction
 *   2. Frequency match   — fallback for category + location + payment
 *
 * Each predicted field comes back with { value, confidence }. The UI decides:
 *   • confidence ≥ 0.7 → auto-fill (user can override)
 *   • confidence ≥ 0.4 → show as ghost suggestion
 *   • confidence < 0.4 → don't suggest
 */
export function predictDefaults(txs, partialForm) {
  const out = {};
  const desc = partialForm.description;

  if (!desc || desc.trim().length < 2) return out;

  const sameTypeFilter = (tx) => tx.type === partialForm.type;

  // ── Category: try AI first, fall back to frequency ────────────────────────
  if (partialForm.type === 'Isplata') {
    const aiResult = predictCategory(desc, loadModel());
    if (aiResult.category && aiResult.confidence >= 0.50) {
      out.category = { value: aiResult.category, confidence: aiResult.confidence, method: 'ai' };
      // Attach top alternatives for UI suggestion chips
      out.categorySuggestions = aiResult.allScores?.slice(0, 3) || [];
    } else {
      // Fallback to frequency-based
      out.category = predictFromDescription(txs.filter(sameTypeFilter), desc, 'category');
      out.categorySuggestions = suggestCategories(desc, 3);
    }
  } else {
    // For income, use frequency only (less varied, AI overkill)
    out.category = predictFromDescription(txs.filter(sameTypeFilter), desc, 'category');
  }

  // ── Location and payment: always frequency-based ──────────────────────────
  out.location = predictFromDescription(txs.filter(sameTypeFilter), desc, 'location');
  out.payment  = predictFromDescription(txs.filter(sameTypeFilter), desc, 'payment');

  return out;
}

/**
 * Given a chosen category, predict the typical payment method.
 * Useful when the user picks a category but skips the description-based
 * prediction (e.g. selecting "Hrana" from the dropdown).
 */
export function predictPaymentForCategory(txs, category, type = 'Isplata') {
  if (!category) return ZERO;
  const matched = txs.filter(tx => tx.category === category && tx.type === type);
  if (matched.length === 0) return ZERO;
  const map = freqMap(matched, tx => tx.payment);
  if (map.length === 0) return ZERO;
  const [value, count] = map[0];
  return { value, confidence: Math.min(0.8, count / matched.length) };
}
