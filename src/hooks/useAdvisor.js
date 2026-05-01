import { useMemo } from 'react';
import { computeForecast, detectAnomalies, computeYoY, generateInsights } from '../lib/advisor.js';

// ─── useAdvisor ───────────────────────────────────────────────────────────────
// Memoised wrapper around the advisor engine. Recomputes only when txs or
// lists change (which happens at most once per transaction add/edit).
//
// Returns:
//   forecast   — { paidSoFar, pendingKnown, recurringLeft, discForecast,
//                  daysLeft, projectedSpend, projectedBalance, incomeSoFar,
//                  hasHistory, dailyDisc, monthName }
//   anomalies  — [{ category, currentSpend, avgSpend, pctAbove, severity }]
//   insights   — [{ type, severity, icon, color, title, body }]
//   yoy        — (thisYear, lastYear) → computed on demand in Charts
// ─────────────────────────────────────────────────────────────────────────────
export function useAdvisor(txs, lists, fmt) {
  const forecast = useMemo(
    () => computeForecast(txs, lists),
    // Re-run whenever txs or recurring list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [txs.length, JSON.stringify(lists.recurring)]
  );

  const anomalies = useMemo(
    () => detectAnomalies(txs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [txs.length]
  );

  const insights = useMemo(
    () => generateInsights(forecast, anomalies, fmt),
    [forecast, anomalies, fmt]
  );

  return { forecast, anomalies, insights };
}
