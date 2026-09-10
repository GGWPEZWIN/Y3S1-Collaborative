import { CATEGORY_KEYS, CO2E } from "../constants/waste";
import { getBenchmarks } from "./baselineService";
import { monthKey, monthName } from "../utils/date";
import { compositeScore, gradeFor, sumRows, variance } from "./benchmarkService";

/* ==================================================================
   TEMPORAL REPORTING  (F7)
   ================================================================== */

export function buildMonthlySummaries(rows) {
  const groups = {};
  rows.forEach((r) => {
    const k = monthKey(r.iso);
    (groups[k] = groups[k] || []).push(r);
  });

  const keys = Object.keys(groups).sort();
  return keys.map((key, i) => {
    const monthRows = groups[key];
    const days = new Set(monthRows.map((r) => r.iso)).size || 1;
    const totals = sumRows(monthRows);
    const score = compositeScore(monthRows);

    const prev = i > 0 ? groups[keys[i - 1]] : null;
    const prevDays = prev ? new Set(prev.map((r) => r.iso)).size || 1 : 0;
    const prevTotals = prev ? sumRows(prev) : null;

    const categories = CATEGORY_KEYS.map((k) => {
      const perDay = totals[k] / days;
      const prevPerDay = prevTotals ? prevTotals[k] / prevDays : null;
      const change =
        prevPerDay && prevPerDay > 0 ? ((perDay - prevPerDay) / prevPerDay) * 100 : null;
      return {
        key: k,
        perDay,
        benchmark: getBenchmarks()[k],
        variance: variance(totals[k], days, k),
        change,
      };
    });

    // Emissions actually attributable to this month's logged consumption.
    // Distinct from mcc.avoided, which measures the gap against the baseline.
    const carbonKg = CATEGORY_KEYS.reduce((sum, k) => sum + totals[k] * CO2E[k], 0);

    return {
      key,
      label: monthName(key),
      days,
      totals,
      score,
      grade: gradeFor(score),
      categories,
      carbonKg,
    };
  });
}

/** Malaysian Conservation Contribution — the annual headline figure. */
export function computeMCC(rows) {
  const totals = sumRows(rows);

  // No logs means no contribution. Without this guard the `|| 1` below would
  // credit a full day of avoided baseline to an account that has logged nothing.
  if (rows.length === 0) {
    const avoided = CATEGORY_KEYS.reduce((acc, k) => {
      acc[k] = 0;
      return acc;
    }, {});
    return { days: 0, totals, avoided, totalAvoided: 0, score: 0 };
  }

  const days = new Set(rows.map((r) => r.iso)).size || 1;

  const avoided = CATEGORY_KEYS.reduce((acc, k) => {
    const baseline = getBenchmarks()[k] * days;
    acc[k] = (baseline - totals[k]) * CO2E[k]; // kg CO2e, may be negative
    return acc;
  }, {});

  const totalAvoided = CATEGORY_KEYS.reduce((s, k) => s + avoided[k], 0);
  const score = Math.max(0, Math.min(1000, Math.round(totalAvoided * 10 + days * 1.5)));

  return { days, totals, avoided, totalAvoided, score };
}
