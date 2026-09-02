import { Droplet, Trash2, UtensilsCrossed } from "lucide-react";
import StatCard from "./StatCard";
import { variance, varianceLabel } from "../services/benchmarkService";

const tone = (pct) => (pct < 0 ? "text-green-600" : "text-red-600");

/** F5 — the three headline cards, benchmarked against the national baseline. */
export default function WasteStats({ recent }) {
  // With no logged days there is nothing to compare against. variance() would
  // return 0, which renders as "on par with avg" and claims a result we do not have.
  const empty = recent.days === 0;

  const foodVar = variance(recent.totals.foodWaste, recent.days, "foodWaste");
  const plasticVar = variance(recent.totals.plastic, recent.days, "plastic");

  const caption = (v, key) => (empty ? "No logs yet" : varianceLabel(v, key));
  const captionClass = (v) => (empty ? "text-slate-500" : tone(v));

  return (
    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <StatCard
        label="Food Waste"
        icon={UtensilsCrossed}
        iconClass="text-orange-500"
        value={`${Math.round(recent.totals.foodWaste)}g`}
        caption={caption(foodVar, "foodWaste")}
        captionClass={captionClass(foodVar)}
      />
      <StatCard
        label="Plastic Items"
        icon={Trash2}
        iconClass="text-red-500"
        value={recent.totals.plastic}
        caption={caption(plasticVar, "plastic")}
        captionClass={captionClass(plasticVar)}
      />
      <StatCard
        label="Water Usage"
        icon={Droplet}
        iconClass="text-blue-500"
        value={`${Math.round(recent.totals.water)}L`}
        caption={empty ? "No logs yet" : `Last ${recent.days} days`}
        captionClass="text-slate-500"
      />
    </div>
  );
}
