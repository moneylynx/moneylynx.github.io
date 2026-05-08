import { useMemo } from 'react';
import { predictDefaults, predictPaymentForCategory, topRecentCombos } from '../lib/smartDefaults.js';

// ─── useSmartDefaults ─────────────────────────────────────────────────────────
// Wraps the smart-defaults engine and memoises predictions so they only
// recompute when txs or the relevant form fields change.
//
// Returns:
//   predictions  — { category, location, payment } each { value, confidence }
//   recentCombos — top-N recent transaction tuples for chip-style quick fill
//   suggestField — helper: returns suggested value if confidence ≥ threshold
// ─────────────────────────────────────────────────────────────────────────────

const AUTO_THRESHOLD     = 0.7;  // ≥ this → auto-fill
const SUGGEST_THRESHOLD  = 0.4;  // ≥ this → show as ghost suggestion

export function useSmartDefaults(txs, form) {
  // Description-based predictions (recompute when description or type changes).
  const predictions = useMemo(() => {
    if (!txs || txs.length === 0) return {};
    return predictDefaults(txs, {
      description: form.description,
      type:        form.type,
    });
  }, [txs, form.description, form.type]);

  // Payment prediction based on category — only used as a secondary fallback
  // when description-based prediction has no payment value.
  const paymentByCategory = useMemo(() => {
    if (!txs || !form.category || (predictions.payment && predictions.payment.confidence > 0)) {
      return null;
    }
    return predictPaymentForCategory(txs, form.category, form.type);
  }, [txs, form.category, form.type, predictions.payment]);

  // Top recent combos — used for chip rendering above the form.
  const recentCombos = useMemo(() => topRecentCombos(txs, 5), [txs]);

  // Helper that returns the suggested value if confidence is high enough,
  // or null otherwise. Threshold parameter lets callers choose between
  // auto-fill (high) and ghost-suggestion (medium).
  const suggestField = (fieldKey, threshold = SUGGEST_THRESHOLD) => {
    let pred = predictions[fieldKey];
    // For payment, fall back to category-based prediction if description had nothing.
    if (fieldKey === 'payment' && (!pred || pred.confidence < threshold) && paymentByCategory) {
      pred = paymentByCategory;
    }
    if (!pred || pred.confidence < threshold) return null;
    return pred.value;
  };

  return {
    predictions,
    recentCombos,
    suggestField,
    AUTO_THRESHOLD,
    SUGGEST_THRESHOLD,
  };
}
