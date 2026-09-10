/**
 * Module 1 — in-wizard recommendations.
 *
 * These help the traveller BUILD their itinerary before it is saved. They are
 * suggestions only: every step keeps its manual controls.
 *
 * This is NOT Module 2. Nothing here computes transport, routing, or
 * transport-inclusive carbon. Module 2 owns that.
 *
 * There is no existing AI/LLM integration in this project and no server to hold
 * a key, so the logic here is a small deterministic scoring service. It takes
 * structured Module 1 data and returns structured results:
 *
 *   recommendFirstActivity(...) -> { activityId, recommendation, reason } | null
 *   listApprovedHotels(...)     -> { hotels: [...], recommendedId, reason, ... }
 *                               | { error: "unavailable" }
 *
 * The shape is deliberately the same one an AI call would return, so this can
 * be swapped for a real model later without touching the steps.
 */

import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../firebase/config";

/* ------------------------------------------------------------------ */
/* STEP 3 — which selected activity to do first                        */
/* ------------------------------------------------------------------ */

// A gentle nudge: orientation-style activities make a good opener, high-effort
// adventure a poor one. Only ever used to break a tie between the user's OWN
// selected activities — never to pull in something they didn't pick.
const OPENER_CATEGORY_BONUS = {
  Culture: 3,
  Community: 2,
  Nature: 1,
  Adventure: 0,
};

/**
 * Picks which of the traveller's ALREADY-SELECTED activities should be done
 * first. Never returns an activity that isn't in `selectedActivities`.
 *
 * @param {object}  args
 * @param {Array}   args.selectedActivities  the chosen activities, each with
 *   { id, title, category, ecoScore, durationHours, destinationId }
 * @param {Array}   [args.orderedDestinations]  destinations in visiting order
 *   (each { id, ... }); used to know which stop is visited first
 * @param {Array}   [args.dayAssignments]  1-based day per ordered destination
 * @returns {{ activityId: string, recommendation: string, reason: string } | null}
 */
export function recommendFirstActivity({
  selectedActivities = [],
  orderedDestinations = [],
  dayAssignments = [],
} = {}) {
  const activities = selectedActivities.filter((a) => a && a.id);
  if (activities.length === 0) return null;

  // Map each destination id -> the day it is visited (earlier = better opener).
  const dayByDestination = new Map();
  orderedDestinations.forEach((d, index) => {
    if (d && d.id != null) {
      dayByDestination.set(d.id, Number(dayAssignments[index]) || index + 1);
    }
  });

  const scored = activities.map((a, index) => {
    const day = dayByDestination.get(a.destinationId) ?? 1;
    const eco = Number(a.ecoScore) || 0;
    const duration = Number(a.durationHours) || 0;
    const opener = OPENER_CATEGORY_BONUS[a.category] ?? 0;

    // Lower `day` first; then a lighter, higher-eco, orientation-friendly pick.
    // `index` keeps the result stable when everything else ties.
    return {
      activity: a,
      day,
      sortKey: [
        day, // 1. earliest day visited
        -opener, // 2. good "first thing" category
        -eco, // 3. greener first
        duration, // 4. shorter first
        index, // 5. stable
      ],
    };
  });

  scored.sort((x, y) => {
    for (let i = 0; i < x.sortKey.length; i += 1) {
      if (x.sortKey[i] !== y.sortKey[i]) return x.sortKey[i] - y.sortKey[i];
    }
    return 0;
  });

  const best = scored[0].activity;
  const multiDay = new Set(scored.map((s) => s.day)).size > 1;

  const reasonBits = [];
  if (multiDay && scored[0].day === 1) {
    reasonBits.push("it's at the first stop on your route");
  }
  if ((Number(best.ecoScore) || 0) >= 85) {
    reasonBits.push(`a high eco score (${best.ecoScore})`);
  }
  if ((Number(best.durationHours) || 0) <= 3) {
    reasonBits.push("a shorter duration that eases you into the trip");
  }
  if ((OPENER_CATEGORY_BONUS[best.category] ?? 0) >= 2) {
    reasonBits.push(
      `a ${best.category.toLowerCase()} activity that helps you get oriented`
    );
  }
  if (reasonBits.length === 0) {
    reasonBits.push("it fits well as the opening activity for your selection");
  }

  return {
    activityId: best.id,
    recommendation: best.title,
    reason: `Suggested first because ${joinWithAnd(reasonBits)}.`,
  };
}

function joinWithAnd(parts) {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/* ------------------------------------------------------------------ */
/* STEP 4 — which approved certified hotel to choose                   */
/* ------------------------------------------------------------------ */

const HOTEL_COLLECTION = "hotel_applications";

// Fields that are safe to read out of a hotel_applications document for a
// traveller-facing recommendation. Everything else on the document
// (electricityBillUrl, waterBillUrl, contactEmail, userId, fraudFlags,
// spotCheck, suspension* , admin* , ...) is intentionally never touched.
const SAFE_HOTEL_FIELDS = [
  "hotelName",
  "state",
  "address",
  "certificationTier",
  "rooms",
  "electricityUsage",
  "waterUsage",
  "sustainabilityInitiatives",
];

const TIER_RANK = { Platinum: 4, Gold: 3, Silver: 2, Bronze: 1 };

// Destination `state` (from itineraryData DESTINATIONS) can be written a little
// differently from a hotel's free-text `state`. Normalise both sides to one
// canonical key before comparing so "Penang" and "Pulau Pinang" are the same
// place and "Kuala Lumpur" never matches "Penang".
const STATE_ALIASES = {
  "pulau pinang": "penang",
  penang: "penang",
  "george town": "penang",
  georgetown: "penang",
  "wilayah persekutuan": "kuala lumpur",
  "wilayah persekutuan kuala lumpur": "kuala lumpur",
  "kuala lumpur": "kuala lumpur",
  kl: "kuala lumpur",
  malacca: "melaka",
  melaka: "melaka",
  "cameron highlands": "pahang",
  pahang: "pahang",
  langkawi: "kedah",
  kedah: "kedah",
  ipoh: "perak",
  perak: "perak",
};

export function normaliseState(value) {
  const key = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!key) return "";
  if (STATE_ALIASES[key]) return STATE_ALIASES[key];
  // The value may carry extra words ("George Town, Penang",
  // "Kuala Lumpur, Malaysia", "WP Kuala Lumpur"). Match the longest known alias
  // that appears in it as a whole word — still an exact place match, never a
  // loose substring of an unrelated name.
  const alias = Object.keys(STATE_ALIASES)
    .sort((a, b) => b.length - a.length)
    .find((name) =>
      new RegExp(
        `(^|[^a-z])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`
      ).test(key)
    );
  return alias ? STATE_ALIASES[alias] : key;
}

/** Keep only the safe fields, coercing the numeric ones. */
function toSafeHotel(id, data) {
  const safe = { id };
  SAFE_HOTEL_FIELDS.forEach((field) => {
    safe[field] = data[field] ?? null;
  });
  safe.rooms = Number(safe.rooms) || 0;
  safe.electricityUsage = Number(safe.electricityUsage) || 0;
  safe.waterUsage = Number(safe.waterUsage) || 0;
  return safe;
}

/** Monthly kWh per room — a rough energy-efficiency proxy. Lower is better. */
function perRoomEnergy(hotel) {
  if (!hotel.rooms || !hotel.electricityUsage) return null;
  return hotel.electricityUsage / hotel.rooms;
}

/** Monthly litres per room — a rough water-efficiency proxy. Lower is better. */
function perRoomWater(hotel) {
  if (!hotel.rooms || !hotel.waterUsage) return null;
  return hotel.waterUsage / hotel.rooms;
}

/**
 * Loads every APPROVED certified hotel from `hotel_applications` (safe fields
 * only) and marks the one recommended for this itinerary.
 *
 * Recommendation ranking (as specified for Module 1):
 *   1. destination / state match     (primary)
 *   2. certification tier            (primary)
 *   3. per-room utility efficiency   (secondary tie-breaker)
 *
 * The recommendation is a SUGGESTION only — every returned hotel is selectable
 * and the caller keeps its manual list.
 *
 * @param {object} args
 * @param {Array}  args.destinations  the itinerary's destinations, each with
 *   { id, name, state }
 * @returns {Promise<
 *   | { hotels: Array<{ id, hotelName, name, type, state, address,
 *       certificationTier, ecoLabel, certifications, ecoScore, stateMatch,
 *       source }>, recommendedId: string, reason: string,
 *       recommendation: string, hotelName: string,
 *       certificationTier: string|null, state: string|null,
 *       matchedDestination: string|null }
 *   | { error: "unavailable" }
 * >}
 */
export async function listApprovedHotels({ destinations = [] } = {}) {
  const destStates = new Set(
    destinations.map((d) => normaliseState(d?.state)).filter(Boolean)
  );

  let approved = [];
  try {
    const snapshot = await getDocs(
      query(collection(db, HOTEL_COLLECTION), where("status", "==", "Approved"))
    );
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() || {};
      // Extra guard on top of the query: never surface a flagged/suspicious one.
      if (data.fraudFlags && data.fraudFlags.hasSuspicion === true) return;
      approved.push(toSafeHotel(docSnap.id, data));
    });
  } catch {
    // Permission denied (rule not deployed yet), offline, etc. The step shows
    // its manual list and the "unavailable" message — creation is never blocked.
    return { error: "unavailable" };
  }

  // Drop obviously-invalid rows (test data): a real hotel uses well over
  // 5 kWh/room/month and has more than a handful of rooms.
  let candidates = approved.filter((h) => {
    if (!h.hotelName || h.rooms < 5) return false;
    const energy = perRoomEnergy(h);
    return energy == null || energy > 5;
  });
  if (candidates.length === 0) candidates = approved.filter((h) => h.hotelName);
  if (candidates.length === 0) return { error: "unavailable" };

  // Efficiency is a tie-breaker only, so rank it within the candidate set.
  const energyOrder = rankAscending(candidates, perRoomEnergy);
  const waterOrder = rankAscending(candidates, perRoomWater);

  const scored = candidates.map((hotel, index) => {
    // Strict: a hotel is only "at" a destination when its normalised state
    // equals one of the chosen destinations' normalised states. The hotel name
    // and address text are deliberately NOT used for matching — an address like
    // "Jalan Penang, Kuala Lumpur" must never pull a KL hotel into a Penang trip.
    const stateMatch = destStates.has(normaliseState(hotel.state));
    const tier = TIER_RANK[hotel.certificationTier] || 0;
    const efficiency =
      (energyOrder.get(hotel.id) ?? 0) + (waterOrder.get(hotel.id) ?? 0); // 0..2

    const score =
      (stateMatch ? 1000 : 0) +
      tier * 100 +
      efficiency * 10 -
      index * 0.001; // stable

    return { hotel, score, stateMatch, tier };
  });

  scored.sort((a, b) => b.score - a.score);

  // Only surface hotels that actually sit at one of the traveller's chosen
  // destinations — `stateMatch` is a strict normalised-state equality. When
  // nothing certified is at these destinations, report "unavailable" so the
  // caller falls back to its built-in list (which is itself filtered to the
  // destination) instead of showing certified hotels from other states.
  const atDestination = scored.filter((s) => s.stateMatch);
  if (atDestination.length === 0) return { error: "unavailable" };

  // Per-hotel eco indicator: the certification tier sets the base and the
  // per-room utility ranking nudges it a few points. Deterministic, 0–100.
  // No price is stored on hotel_applications, so cards never show a rate.
  const TIER_ECO_BASE = { Platinum: 95, Gold: 88, Silver: 80, Bronze: 72 };
  const toCard = ({ hotel, stateMatch }) => {
    const base = TIER_ECO_BASE[hotel.certificationTier] ?? 66;
    const efficiency =
      ((energyOrder.get(hotel.id) ?? 0) + (waterOrder.get(hotel.id) ?? 0)) / 2;
    const ecoScore = Math.max(
      0,
      Math.min(100, Math.round(base + efficiency * 6))
    );
    return {
      id: hotel.id,
      hotelName: hotel.hotelName,
      name: hotel.hotelName,
      type: "Hotel",
      state: hotel.state || null,
      address: hotel.address || null,
      certificationTier: hotel.certificationTier || null,
      ecoLabel: hotel.certificationTier
        ? `${hotel.certificationTier} Certified`
        : "Certified partner",
      certifications: hotel.certificationTier
        ? [`${hotel.certificationTier} Certified`]
        : ["GreenTrip Certified"],
      ecoScore,
      stateMatch,
      source: "firebase",
    };
  };

  const hotels = atDestination.map(toCard);
  const winner = atDestination[0];
  const { hotel } = winner;

  const matchedDestination =
    destinations.find(
      (d) => normaliseState(d?.state) === normaliseState(hotel.state)
    )?.name || null;

  const reasonBits = [];
  if (winner.stateMatch) {
    reasonBits.push(
      matchedDestination
        ? `it's in ${hotel.state}, matching ${matchedDestination} on your route`
        : `it's in ${hotel.state}, on your route`
    );
  } else {
    reasonBits.push(
      "it's the strongest certified stay available for your destinations"
    );
  }
  if (hotel.certificationTier) {
    reasonBits.push(
      `it holds a ${hotel.certificationTier} GreenTrip certification`
    );
  }
  const energy = perRoomEnergy(hotel);
  if (energy != null && (energyOrder.get(hotel.id) ?? 0) >= 0.6) {
    reasonBits.push("low energy use per room compared with the other options");
  }

  return {
    hotels,
    recommendedId: hotel.id,
    reason: `Recommended because ${joinWithAnd(reasonBits)}.`,
    recommendation: hotel.hotelName,
    hotelName: hotel.hotelName,
    certificationTier: hotel.certificationTier,
    state: hotel.state,
    matchedDestination,
  };
}

/**
 * Returns a Map of id -> 0..1 score where the LOWEST value from `getValue`
 * scores highest. Rows with no value get 0.
 */
function rankAscending(rows, getValue) {
  const withValue = rows
    .map((row) => ({ id: row.id, value: getValue(row) }))
    .filter((r) => r.value != null && Number.isFinite(r.value))
    .sort((a, b) => a.value - b.value);

  const order = new Map(rows.map((row) => [row.id, 0]));
  const n = withValue.length;
  withValue.forEach((r, index) => {
    order.set(r.id, n <= 1 ? 1 : (n - 1 - index) / (n - 1));
  });
  return order;
}
