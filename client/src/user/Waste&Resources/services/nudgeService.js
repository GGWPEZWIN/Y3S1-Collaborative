import { Droplet, ShoppingBag } from "lucide-react";
import { BENCHMARKS, NUDGE_POIS, SHOWER_FLOW_L_PER_MIN } from "../constants/waste";
import { sumRows } from "./benchmarkService";

/* ==================================================================
   ECO-NUDGE RULE ENGINE  (F6)
   ================================================================== */

export function evaluateNudges(rows) {
  const recent = rows.slice(0, 3);
  if (recent.length === 0) return [];
  const days = new Set(recent.map((r) => r.iso)).size || 1;
  const totals = sumRows(recent);
  const out = [];

  if (totals.plastic / days > BENCHMARKS.plastic) {
    out.push({
      id: "plastic",
      icon: Droplet,
      tone: "text-blue-600",
      title: "Your plastic count is running above the national average",
      body: `You logged ${totals.plastic} single-use items over ${days} days. Three refill points are within walking distance of your route.`,
      pois: NUDGE_POIS.refill,
    });
  }

  if (totals.foodWaste / days > BENCHMARKS.foodWaste) {
    out.push({
      id: "food",
      icon: ShoppingBag,
      tone: "text-orange-600",
      title: "Plate waste is trending high",
      body: `Averaging ${Math.round(totals.foodWaste / days)}g a day against a ${BENCHMARKS.foodWaste}g baseline. Asking for kurang nasi at the stall removes most of it.`,
      pois: NUDGE_POIS.zeroWaste,
    });
  }

  if (totals.showerMin / days > BENCHMARKS.showerMin) {
    out.push({
      id: "water",
      icon: Droplet,
      tone: "text-sky-600",
      title: "Shower duration above baseline",
      body: `${(totals.showerMin / days).toFixed(1)} min average against ${BENCHMARKS.showerMin} min. Every minute saved is about ${SHOWER_FLOW_L_PER_MIN}L.`,
      pois: [],
    });
  }

  return out;
}
