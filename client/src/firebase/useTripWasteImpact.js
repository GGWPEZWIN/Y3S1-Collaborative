import { useEffect, useState } from "react";
import { getTripWasteImpact } from "./wasteImpactService";

export const WASTE_IMPACT_LOAD = {
  IDLE: "idle",
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
};

/**
 * A trip's food waste / water / plastic totals, aggregated live from the
 * Waste & Resource ledger. Read-only and independent of Module 2's Eco
 * Report snapshot — see wasteImpactService.js.
 *
 * @param {string|null} uid
 * @param {string|null} tripId
 * @returns {{status: string, impact: object|null}}
 */
export default function useTripWasteImpact(uid, tripId) {
  const key = uid && tripId ? `${uid}:${tripId}` : null;

  // Reset during render when the (uid, tripId) pair changes, rather than in
  // an effect — the same pattern used by useEcoReport.
  const [activeKey, setActiveKey] = useState(key);
  const [status, setStatus] = useState(key ? WASTE_IMPACT_LOAD.LOADING : WASTE_IMPACT_LOAD.IDLE);
  const [impact, setImpact] = useState(null);

  if (activeKey !== key) {
    setActiveKey(key);
    setImpact(null);
    setStatus(key ? WASTE_IMPACT_LOAD.LOADING : WASTE_IMPACT_LOAD.IDLE);
  }

  useEffect(() => {
    if (!key) return undefined;

    let cancelled = false;

    getTripWasteImpact(uid, tripId)
      .then((data) => {
        if (cancelled) return;
        setImpact(data);
        setStatus(WASTE_IMPACT_LOAD.SUCCESS);
      })
      .catch(() => {
        if (cancelled) return;
        setImpact(null);
        setStatus(WASTE_IMPACT_LOAD.ERROR);
      });

    return () => {
      cancelled = true;
    };
  }, [key, uid, tripId]);

  return { status, impact };
}
