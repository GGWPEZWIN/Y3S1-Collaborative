import { SHOWER_FLOW_L_PER_MIN } from "../constants/waste";
import { displayDate, isoDate } from "../utils/date";

/* ==================================================================
   SEEDED HISTORY
   ------------------------------------------------------------------
   Deterministic pseudo-random history so the monthly and annual
   reports have something to consolidate. Replace with your API.
   ================================================================== */

function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function buildHistory() {
  const rand = lcg(20260628);
  const rows = [];
  const start = new Date(2026, 0, 1);
  const end = new Date(2026, 5, 25); // history stops before the three visible logs

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (rand() < 0.14) continue; // some days simply are not logged

    // gentle downward trend across the year = behavioural improvement
    const monthsIn = d.getMonth();
    const trend = 1 - monthsIn * 0.055;

    const showerMin = Math.round((6 + rand() * 6) * trend * 10) / 10;
    rows.push({
      id: `h-${isoDate(d)}`,
      iso: isoDate(d),
      date: displayDate(d),
      type: rand() > 0.45 ? "Food" : "Resource",
      source: rand() > 0.5 ? "cv" : "manual",
      foodWaste: Math.round((45 + rand() * 110) * trend),
      plastic: Math.round((1 + rand() * 5) * trend),
      showerMin,
      water: Math.round(showerMin * SHOWER_FLOW_L_PER_MIN + 12 + rand() * 20),
      disposables: Math.round(rand() * 4 * trend),
      detections: null,
    });
  }

  // The three logs shown in the design, most recent first.
  const visible = [
    { id: "v-3", iso: "2026-06-28", date: "6/28/2026", type: "Food", source: "cv", foodWaste: 120, plastic: 3, water: 85, disposables: 2, showerMin: 8.1, detections: null },
    { id: "v-2", iso: "2026-06-27", date: "6/27/2026", type: "Food", source: "cv", foodWaste: 65, plastic: 1, water: 72, disposables: 0, showerMin: 6.7, detections: null },
    { id: "v-1", iso: "2026-06-26", date: "6/26/2026", type: "Food", source: "cv", foodWaste: 45, plastic: 2, water: 68, disposables: 1, showerMin: 6.2, detections: null },
  ];

  return [...visible, ...rows.reverse()]; // newest first
}
