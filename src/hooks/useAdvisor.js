import { useMemo } from 'react';
import { computeForecast, detectAnomalies, computeYoY, generateInsights } from '../lib/advisor.js';

// ─── useAdvisor ───────────────────────────────────────────────────────────────
// Memoised wrapper around the advisor engine.
// Also computes _lastYearSameMonthSpend and attaches it to forecast so
// generateInsights can produce positive-reinforcement cards.
// ─────────────────────────────────────────────────────────────────────────────
export function useAdvisor(txs, lists, fmt) {
  const forecast = useMemo(() => {
    const base = computeForecast(txs, lists);

    // Attach same-month last-year paid spend for positive reinforcement.
    const now = new Date();
    const lastYr = now.getFullYear() - 1;
    const cm     = now.getMonth();
    const lastYrSpend = txs
      .filter(x => {
        const d = new Date(x.date);
        return d.getFullYear() === lastYr && d.getMonth() === cm &&
               x.type === 'Isplata' && x.status === 'Plaćeno';
      })
      .reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);

    return { ...base, _lastYearSameMonthSpend: lastYrSpend };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txs.length, JSON.stringify(lists.recurring)]);

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
