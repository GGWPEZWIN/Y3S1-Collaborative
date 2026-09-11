import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./config";

/* ==================================================================
   TRIP RESOURCE IMPACT  —  cross-module read (Waste & Resource -> trips)
   ------------------------------------------------------------------
   Waste logs are tagged with `tripId` (the itinerary id) whenever they
   are recorded while that trip is active — see
   user/Waste&Resources/hooks/useActiveTrip.js. This lets the
   Recommendations and Itinerary modules show a trip's food waste,
   water and plastic totals without the Waste & Resource module
   exposing anything beyond its own Firestore documents, and without
   touching Module 2's versioned Eco Report schema.
   ================================================================== */

/**
 * @param {string} uid    owner of the wasteLogs subcollection
 * @param {string} tripId itinerary id the logs were recorded under
 * @returns {Promise<{foodWasteG:number, waterL:number, plasticItems:number, disposables:number, logCount:number}|null>}
 *   null when either id is missing — there is nothing to query yet.
 */
export async function getTripWasteImpact(uid, tripId) {
  if (!uid || !tripId) return null;

  const q = query(collection(db, "users", uid, "wasteLogs"), where("tripId", "==", tripId));
  const snap = await getDocs(q);

  const totals = { foodWasteG: 0, waterL: 0, plasticItems: 0, disposables: 0, logCount: snap.size };
  snap.forEach((doc) => {
    const data = doc.data();
    totals.foodWasteG += Number(data.foodWaste) || 0;
    totals.waterL += Number(data.water) || 0;
    totals.plasticItems += Number(data.plastic) || 0;
    totals.disposables += Number(data.disposables) || 0;
  });
  return totals;
}
