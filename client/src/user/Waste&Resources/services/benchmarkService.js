import { CATEGORY_KEYS, GRADE_BANDS, GRADE_WEIGHTS } from "../constants/waste";
import { getBenchmarks } from "./baselineService";

/* ==================================================================
   BENCHMARK ENGINE  (F5)
   ================================================================== */

export function sumRows(rows) {
  return rows.reduce(
    (acc, r) => {
      CATEGORY_KEYS.forEach((k) => {
        acc[k] += Number(r[k]) || 0;
      });
      acc.showerMin += Number(r.showerMin) || 0;
      return acc;
    },
    { foodWaste: 0, plastic: 0, water: 0, disposables: 0, showerMin: 0 }
  );
}

/** Percentage variance against the national baseline. Negative = better. */
export function variance(actual, days, key) {
  const expected = getBenchmarks()[key] * days;
  if (expected <= 0) return 0;
  return ((actual - expected) / expected) * 100;
}

/**
 * `disposables` has no published statistical baseline, so it is compared
 * against an app-defined target. The label must say so — calling it an
 * average would misrepresent an invented number as a national statistic.
 */
export function varianceLabel(pct, key) {
  const against = key === "disposables" ? "target" : "avg";
  const rounded = Math.round(Math.abs(pct));
  if (rounded === 0) return `on par with ${against}`;
  return `${pct < 0 ? "↓" : "↑"} ${rounded}% vs ${against}`;
}

/** 0–100 per category: 50 sits exactly on the benchmark. */
export function categoryScore(pct) {
  return Math.max(0, Math.min(100, 50 - pct));
}

export function compositeScore(rows) {
  if (rows.length === 0) return 0;
  const days = new Set(rows.map((r) => r.iso)).size || 1;
  const totals = sumRows(rows);
  return CATEGORY_KEYS.reduce(
    (acc, k) => acc + categoryScore(variance(totals[k], days, k)) * GRADE_WEIGHTS[k],
    0
  );
}

export function gradeFor(score) {
  return GRADE_BANDS.find((b) => score >= b.min).grade;
}

export function gradeTone(grade) {
  if (grade.startsWith("A")) return "bg-green-100 text-green-800";
  if (grade.startsWith("B")) return "bg-lime-100 text-lime-800";
  if (grade.startsWith("C")) return "bg-amber-100 text-amber-800";
  if (grade.startsWith("D")) return "bg-orange-100 text-orange-800";
  return "bg-red-100 text-red-800";
}
