/* ==================================================================
   REPORT EXPORT  (F7)
   ------------------------------------------------------------------
   CSV rather than PDF: it opens in Excel, needs no dependency, and
   keeps the underlying figures inspectable — which matters when the
   numbers feed a sustainability grade someone may want to check.
   ================================================================== */

import { CATEGORY_KEYS, CATEGORY_LABELS, CATEGORY_UNITS } from "../constants/waste";

function escapeCell(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows) {
  return rows.map((r) => r.map(escapeCell).join(",")).join("\n");
}

/**
 * Builds a two-section report: per-month summary, then the raw ledger.
 *
 * @param {Array} monthlies  from buildMonthlySummaries
 * @param {object} mcc       from computeMCC
 * @param {Array} logs       raw ledger rows
 */
export function buildReportCsv(monthlies, mcc, logs) {
  const rows = [];

  rows.push(["GreenTrip Malaysia — Eco Report"]);
  rows.push(["Generated", new Date().toISOString().slice(0, 10)]);
  rows.push([]);

  rows.push(["Malaysian Conservation Contribution"]);
  rows.push(["MCC score", mcc.score]);
  rows.push(["Days logged", mcc.days]);
  rows.push(["CO2e avoided (kg)", mcc.totalAvoided.toFixed(2)]);
  rows.push([]);

  rows.push(["Monthly summary"]);
  rows.push([
    "Month",
    "Days logged",
    "Grade",
    "Score",
    ...CATEGORY_KEYS.map((k) => `${CATEGORY_LABELS[k]} (${CATEGORY_UNITS[k]})`),
  ]);
  monthlies.forEach((m) => {
    rows.push([
      m.label,
      m.days,
      m.grade,
      Math.round(m.score),
      ...CATEGORY_KEYS.map((k) => Math.round(m.totals[k])),
    ]);
  });
  rows.push([]);

  rows.push(["Daily ledger"]);
  rows.push(["Date", "Type", "Source", "Food waste (g)", "Plastic", "Water (L)", "Disposables", "Edited"]);
  logs.forEach((l) => {
    rows.push([
      l.iso,
      l.type,
      l.source === "cv" ? "Scan" : "Manual",
      l.foodWaste,
      l.plastic,
      l.water,
      l.disposables,
      l.editedAtMs ? "yes" : "",
    ]);
  });

  return toCsv(rows);
}

/** Triggers a browser download without any third-party dependency. */
export function downloadCsv(filename, csv) {
  // The BOM makes Excel read UTF-8 correctly instead of mangling accents.
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
