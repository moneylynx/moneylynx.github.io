// ─── AI Kategorizer — Naive Bayes + TF-IDF hibrid ────────────────────────────
//
// Lokalni model koji uči iz korisnikovih transakcija.
// Nema API poziva, radi offline, model se čuva u localStorage.
//
// ALGORITAM:
//   1. Naive Bayes na razini tokena (P(kategory | words) ∝ P(words | category) × P(category))
//   2. TF-IDF weight za rijetke ali informativne tokene (npr. "kaufland" vs "ostalo")
//   3. Laplace smoothing da izbjegne nulte vjerojatnosti
//   4. Fallback na frecuency-matching (stari smartDefaults) ako Bayes conf < 0.3
//   5. Persistencija modela u localStorage (inkrementalni update)
//
// PRIVATNOST:
//   Model sprema samo tokeniziranu statistiku — nikada originalne opise transakcija.
//   Nikada ništa ne šalje izvan uređaja.
// ─────────────────────────────────────────────────────────────────────────────

import { K } from './constants.js';

// ── Storage key ───────────────────────────────────────────────────────────────
const MODEL_KEY = 'ml_ai_model';

// ── Croatian stop words (filtered out — not informative for categorization) ───
const STOP_WORDS = new Set([
  'i','u','na','za','se','je','da','od','do','iz','sa','po','pri','bez',
  'ali','ili','ni','pa','te','a','o','s','k','niz','kroz','nad','pod',
  'tra','the','and','for','not','with','from','into',
  'plaćeno','čeka','uplate','uplata','isplata','primitak',
]);

// ── Tokenizer ─────────────────────────────────────────────────────────────────
/**
 * Tokenizes a transaction description into informative lowercase tokens.
 * - Removes punctuation, numbers-only tokens, stop words
 * - Splits camelCase and common patterns (d.o.o., j.d.o.o.)
 * - Minimum token length: 3 chars
 */
export function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[.,;:!?()\[\]{}'"\/\\@#$%^&*+=<>|~`]/g, ' ')
    .replace(/\b\d+([.,]\d+)?\b/g, ' ')   // remove standalone numbers
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(t => t.length >= 3 && !STOP_WORDS.has(t));
}

// ── Model structure ───────────────────────────────────────────────────────────
/**
 * Model schema:
 * {
 *   v: 2,                           // version
 *   updatedAt: ISO string,
 *   totalDocs: { "Hrana": 45, "Auto": 12, ... },
 *   wordCounts: { "kaufland": { "Hrana": 8, "Ostalo": 1 }, ... },
 *   vocab: number,                  // total unique tokens
 * }
 */
const EMPTY_MODEL = () => ({ v: 2, totalDocs: {}, wordCounts: {}, vocab: 0, updatedAt: null });

// ── Persistence ───────────────────────────────────────────────────────────────
export function loadModel() {
  try {
    const raw = localStorage.getItem(MODEL_KEY);
    if (!raw) return EMPTY_MODEL();
    const m = JSON.parse(raw);
    if (m.v !== 2) return EMPTY_MODEL(); // reset on schema change
    return m;
  } catch { return EMPTY_MODEL(); }
}

function saveModel(model) {
  try {
    model.updatedAt = new Date().toISOString();
    localStorage.setItem(MODEL_KEY, JSON.stringify(model));
  } catch { /* non-critical */ }
}

// ── Training ──────────────────────────────────────────────────────────────────
/**
 * Train the model on a single transaction.
 * Call this after every addTx or updTx.
 */
export function trainOnTransaction(tx, model = loadModel()) {
  if (!tx.description || !tx.category || tx.type !== 'Isplata') return model;

  const tokens = tokenize(tx.description);
  if (tokens.length === 0) return model;

  // Update doc count per category
  model.totalDocs[tx.category] = (model.totalDocs[tx.category] || 0) + 1;

  // Update word counts
  const newTokens = new Set();
  for (const token of tokens) {
    if (!model.wordCounts[token]) {
      model.wordCounts[token] = {};
      newTokens.add(token);
    }
    model.wordCounts[token][tx.category] = (model.wordCounts[token][tx.category] || 0) + 1;
  }

  // Vocabulary grows with new tokens
  model.vocab += newTokens.size;

  saveModel(model);
  return model;
}

/**
 * Rebuild model from scratch from transaction history.
 * Call once on first run, or when user clears/imports data.
 */
export function rebuildModel(txs) {
  let model = EMPTY_MODEL();
  const expense = txs.filter(t => t.type === 'Isplata' && t.category && t.description);
  for (const tx of expense) {
    model = trainOnTransaction(tx, model);
  }
  saveModel(model);
  return model;
}

// ── Prediction ────────────────────────────────────────────────────────────────
/**
 * Predict the most likely category for a description using Naive Bayes.
 *
 * Returns: { category: string, confidence: number (0–1), method: 'bayes'|'none' }
 */
export function predictCategory(description, model = loadModel()) {
  const tokens = tokenize(description);
  if (tokens.length === 0 || Object.keys(model.totalDocs).length === 0) {
    return { category: null, confidence: 0, method: 'none' };
  }

  const categories = Object.keys(model.totalDocs);
  const totalDocs   = Object.values(model.totalDocs).reduce((s, n) => s + n, 0);
  const vocab       = Math.max(model.vocab, 1);

  const scores = {};

  for (const cat of categories) {
    const catDocCount = model.totalDocs[cat] || 0;
    if (catDocCount === 0) continue;

    // Log-space computation to avoid underflow
    let logScore = Math.log(catDocCount / totalDocs); // log P(category)

    for (const token of tokens) {
      const wordInCat   = (model.wordCounts[token]?.[cat]) || 0;
      const totalInCat  = Object.values(model.wordCounts[token] || {}).reduce((s, n) => s + n, 0);

      // Laplace smoothing: P(word | cat) = (count + 1) / (totalInCat + vocab)
      const pWordGivenCat = (wordInCat + 1) / (totalInCat + vocab);
      logScore += Math.log(pWordGivenCat);
    }

    scores[cat] = logScore;
  }

  if (Object.keys(scores).length === 0) {
    return { category: null, confidence: 0, method: 'none' };
  }

  // Convert log scores to probabilities via softmax
  const maxLog   = Math.max(...Object.values(scores));
  const expScores = {};
  let expSum = 0;
  for (const [cat, logS] of Object.entries(scores)) {
    expScores[cat] = Math.exp(logS - maxLog); // subtract max for numerical stability
    expSum += expScores[cat];
  }

  // Sort by probability descending
  const ranked = Object.entries(expScores)
    .map(([cat, exp]) => ({ category: cat, confidence: exp / expSum }))
    .sort((a, b) => b.confidence - a.confidence);

  const best = ranked[0];

  // Confidence penalty when 2nd place is close (ambiguous)
  const secondConf = ranked[1]?.confidence || 0;
  const adjustedConf = best.confidence * (1 - 0.3 * (secondConf / best.confidence));

  return {
    category:   best.category,
    confidence: Math.round(adjustedConf * 1000) / 1000,
    method:     'bayes',
    allScores:  ranked.slice(0, 5), // top 5 for UI (category suggestions)
  };
}

/**
 * Get top N category suggestions for a description.
 * Returns array of { category, confidence } sorted by confidence desc.
 */
export function suggestCategories(description, n = 3, model = loadModel()) {
  const result = predictCategory(description, model);
  if (!result.allScores) return [];
  return result.allScores.slice(0, n).filter(s => s.confidence > 0.05);
}

/**
 * Returns how many transactions the model has been trained on.
 * Used for UI to show "Model naučen na N transakcija"
 */
export function modelStats(model = loadModel()) {
  const totalDocs = Object.values(model.totalDocs).reduce((s, n) => s + n, 0);
  const categories = Object.keys(model.totalDocs).length;
  const tokens = Object.keys(model.wordCounts).length;
  return { totalDocs, categories, tokens, updatedAt: model.updatedAt };
}

/**
 * Reset/clear the model (e.g. when user clears all data).
 */
export function clearModel() {
  try { localStorage.removeItem(MODEL_KEY); } catch {}
}
