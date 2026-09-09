import { CATEGORY_KEYS } from "../constants/waste";
import { getBenchmarks } from "./baselineService";
import { sumRows } from "./benchmarkService";

/* ==================================================================
   SUSTAINABILITY MILESTONES  (F7)
   ------------------------------------------------------------------
   Every milestone is evaluated against the real ledger. None are
   awarded by hand, and partial progress is a genuine ratio rather
   than a decorative bar.
   ================================================================== */

const ECO_MASTER_TARGET = 5; // months graded A or better
const ZERO_WASTE_TARGET = 30; // days under every baseline
const CARBON_HERO_TARGET_KG = 30; // kg CO2e avoided

function monthLabel(iso) {
  const [y, m] = iso.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

/** A day where every logged category sits at or below its baseline. */
function isCleanDay(dayRows) {
  const benchmarks = getBenchmarks();
  const totals = sumRows(dayRows);
  return CATEGORY_KEYS.every((k) => totals[k] <= benchmarks[k]);
}

export function evaluateMilestones(logs, monthlies, mcc) {
  const sorted = [...logs].sort((a, b) => (a.iso < b.iso ? -1 : 1));
  const first = sorted[0] || null;

  // Group by day so "clean day" is judged on a full day's consumption.
  const byDay = {};
  logs.forEach((l) => {
    (byDay[l.iso] = byDay[l.iso] || []).push(l);
  });
  const cleanDays = Object.values(byDay).filter(isCleanDay).length;

  const benchmarks = getBenchmarks();

  const plasticMonth = monthlies.find(
    (m) => m.totals.plastic / m.days <= benchmarks.plastic
  );

  const aGradeMonths = monthlies.filter((m) => m.grade.startsWith("A"));

  const carbonAchieved = mcc.totalAvoided >= CARBON_HERO_TARGET_KG;

  return [
    {
      key: "first-log",
      label: "First Eco-Log",
      icon: "🌱",
      achieved: Boolean(first),
      date: first ? monthLabel(first.iso) : null,
      progress: first ? 100 : 0,
    },
    {
      key: "carbon-hero",
      label: `Carbon Hero (${CARBON_HERO_TARGET_KG} kg CO₂e avoided)`,
      icon: "🌍",
      achieved: carbonAchieved,
      date: carbonAchieved ? monthLabel(sorted[sorted.length - 1].iso) : null,
      progress: Math.min(
        100,
        Math.round((Math.max(0, mcc.totalAvoided) / CARBON_HERO_TARGET_KG) * 100)
      ),
    },
    {
      key: "plastic-reducer",
      label: `Plastic Reducer (under ${benchmarks.plastic.toFixed(1)} items/day)`,
      icon: "♻️",
      achieved: Boolean(plasticMonth),
      date: plasticMonth ? plasticMonth.label : null,
      progress: plasticMonth ? 100 : 0,
    },
    {
      key: "eco-master",
      label: `Eco Master (${ECO_MASTER_TARGET} A-grade months)`,
      icon: "⭐",
      achieved: aGradeMonths.length >= ECO_MASTER_TARGET,
      date:
        aGradeMonths.length >= ECO_MASTER_TARGET
          ? aGradeMonths[ECO_MASTER_TARGET - 1].label
          : null,
      progress: Math.min(
        100,
        Math.round((aGradeMonths.length / ECO_MASTER_TARGET) * 100)
      ),
    },
    {
      key: "zero-waste",
      label: `Zero Waste Champion (${ZERO_WASTE_TARGET} days under baseline)`,
      icon: "🏆",
      achieved: cleanDays >= ZERO_WASTE_TARGET,
      date: null,
      progress: Math.min(100, Math.round((cleanDays / ZERO_WASTE_TARGET) * 100)),
    },
  ];
}
