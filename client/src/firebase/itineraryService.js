import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";

import { db, auth } from "./config";

/*
 * ============================================================
 * ITINERARY SERVICE  —  Module 1
 * ============================================================
 *
 * Reuses the shared Firebase app from ./config (no new config).
 *
 * Saved itineraries live in a single top-level collection so Module 2 can
 * fetch one directly:  getItinerary(id)  ->  doc(db, "itineraries", id)
 *
 * Document shape (see saveItinerary):
 *
 *   {
 *     itineraryId, userId, title,
 *     dates: { startDate, endDate },
 *     startLocation: { locationId, name, latitude, longitude },
 *     destinations: [
 *       { destinationId, name, latitude, longitude, order, day,
 *         sustainability: { ecoScore: null, carbonKgCo2e: null, source: null } }
 *     ],
 *     accommodation: { ... } | null,
 *     ecoScore: number | null,   // plan-level preview (activities + stay avg)
 *     ...meta
 *   }
 *
 * Module 1 does NOT compute transport carbon or the transport-inclusive eco
 * score — the per-destination `sustainability` block is written as null for
 * Module 2 to fill in. It does persist a top-level `ecoScore` preview that the
 * wizard already computed from the chosen activities + accommodation
 * (itineraryData.calcEcoScore), so the list / detail views have a value to show.
 * ============================================================
 */

const ITINERARIES = "itineraries";

/*
 * ------------------------------------------------------------
 * GET CURRENT FIREBASE USER
 * ------------------------------------------------------------
 * Same pattern as travelHistoryService.getLoggedInUser — resolve immediately
 * if auth is ready, otherwise wait for it to restore.
 */
function getLoggedInUser() {
  return new Promise((resolve, reject) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        if (user) resolve(user);
        else reject(new Error("No user is currently logged in."));
      },
      (error) => {
        unsubscribe();
        reject(error);
      }
    );
  });
}

/*
 * ------------------------------------------------------------
 * COORD HELPERS
 * ------------------------------------------------------------
 * Coordinates must be stored as real numbers, never strings.
 */
function toNumberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Sustainability placeholder — Module 2 replaces these. Never 0. */
function emptySustainability() {
  return { ecoScore: null, carbonKgCo2e: null, source: null };
}

/**
 * Normalise the plan-level Eco Score the wizard passes in (from
 * itineraryData.calcEcoScore). This does NOT recompute anything — it only
 * guards the stored value: a real 0–100 number is kept, anything else
 * (including the 0 calcEcoScore returns for an empty selection) becomes null
 * so the dashboard shows "—" rather than a misleading zero.
 */
function toEcoScoreOrNull(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(Math.min(100, n));
}

/*
 * ------------------------------------------------------------
 * NORMALISE START LOCATION
 * ------------------------------------------------------------
 */
function buildStartLocation(startLocation) {
  if (!startLocation) return null;

  return {
    locationId: startLocation.locationId ?? startLocation.id ?? null,
    name: startLocation.name ?? "",
    latitude: toNumberOrNull(startLocation.latitude),
    longitude: toNumberOrNull(startLocation.longitude),
  };
}

/*
 * ------------------------------------------------------------
 * NORMALISE ONE DESTINATION
 * ------------------------------------------------------------
 * Always an object — never a bare name string.
 */
function buildDestination(destination, order, day) {
  const base = {
    destinationId: destination.destinationId ?? destination.id ?? null,
    name: destination.name ?? "",
    latitude: toNumberOrNull(destination.latitude),
    longitude: toNumberOrNull(destination.longitude),
    order,
    day,
    sustainability: emptySustainability(),
  };

  // placeId is optional — only persist a real one if the catalogue has it.
  if (destination.placeId) {
    base.placeId = destination.placeId;
  }

  return base;
}

/*
 * ------------------------------------------------------------
 * NORMALISE ACCOMMODATION
 * ------------------------------------------------------------
 * Adapts the existing wizard accommodation object (from itineraryData.js)
 * to the saved shape. Kept simple on purpose.
 */
function buildAccommodation(accommodation) {
  if (!accommodation) return null;

  const out = {
    accommodationId: accommodation.accommodationId ?? accommodation.id ?? null,
    name: accommodation.name ?? "",
    type: accommodation.type ?? null,
    destinationId: accommodation.destinationId ?? null,
    pricePerNight: toNumberOrNull(accommodation.pricePerNight),
    certifications: Array.isArray(accommodation.certifications)
      ? accommodation.certifications
      : [],
  };

  if (accommodation.latitude != null || accommodation.longitude != null) {
    out.latitude = toNumberOrNull(accommodation.latitude);
    out.longitude = toNumberOrNull(accommodation.longitude);
  }

  return out;
}

/*
 * ------------------------------------------------------------
 * VALIDATE WIZARD INPUT
 * ------------------------------------------------------------
 * Shared by saveItinerary and updateItinerary so both flows reject the same
 * bad input with the same messages.
 */
function assertItineraryInput(input) {
  const {
    title,
    startDate,
    endDate,
    startLocation,
    orderedDestinations = [],
  } = input || {};

  if (!title || !title.trim()) {
    throw new Error("An itinerary title is required.");
  }
  if (!startLocation) {
    throw new Error("A starting location is required.");
  }
  if (orderedDestinations.length === 0) {
    throw new Error("Select at least one destination.");
  }
  if (startDate && endDate && endDate < startDate) {
    throw new Error("The end date must be on or after the start date.");
  }
}

/*
 * ------------------------------------------------------------
 * BUILD THE FIELDS THE WIZARD OWNS
 * ------------------------------------------------------------
 * The subset of the itinerary document that the Create/Edit wizard is allowed
 * to write. Identity fields (itineraryId, userId), lifecycle (status, module
 * flags, createdAt) and the per-destination Module 2 sustainability/transport
 * block are deliberately NOT produced here. The top-level `ecoScore` preview is
 * the one sustainability value Module 1 owns (see toEcoScoreOrNull).
 *
 * @param {object} input
 * @param {object} [opts.existingDestinations] destinations already on the doc —
 *        their per-destination `sustainability` is carried forward so an edit
 *        from Module 1 never wipes values Module 2 has filled in.
 */
function buildItineraryCoreFields(input, { existingDestinations = [] } = {}) {
  const {
    title,
    startDate,
    endDate,
    startLocation,
    orderedDestinations = [],
    dayAssignments = [],
    accommodation = null,
    meta = {},
  } = input || {};

  const sustainabilityByDestId = new Map(
    (existingDestinations || [])
      .filter((d) => d && d.destinationId != null && d.sustainability)
      .map((d) => [d.destinationId, d.sustainability])
  );

  const destinations = orderedDestinations.map((destination, index) => {
    const built = buildDestination(
      destination,
      index + 1,
      Number(dayAssignments[index]) || 1
    );
    const carried = sustainabilityByDestId.get(built.destinationId);
    if (carried && typeof carried === "object") {
      built.sustainability = { ...emptySustainability(), ...carried };
    }
    return built;
  });

  return {
    title: title.trim(),

    dates: {
      startDate: startDate || null,
      endDate: endDate || null,
    },

    startLocation: buildStartLocation(startLocation),
    destinations,
    accommodation: buildAccommodation(accommodation),

    // Non-authoritative extras kept from the wizard so the list/detail views
    // still have something to show. Not part of the Module 2 contract.
    travellers: meta.travellers ?? null,
    budget: meta.budget != null ? Number(meta.budget) : null,
    travellerStyle: meta.travellerStyle ?? null,
    activityIds: Array.isArray(meta.activityIds) ? meta.activityIds : [],

    // Plan-level Eco Score the wizard already computed (calcEcoScore). Kept in
    // sync on every save/edit so it reflects the current activity + stay picks.
    ecoScore: toEcoScoreOrNull(meta.ecoScore),
  };
}

/*
 * ============================================================
 * SAVE ITINERARY
 * ============================================================
 *
 * @param {object} input
 * @param {string} input.title
 * @param {string} input.startDate               yyyy-mm-dd
 * @param {string} input.endDate                 yyyy-mm-dd
 * @param {object} input.startLocation           { id|locationId, name, latitude, longitude }
 * @param {Array}  input.orderedDestinations     already in visiting order;
 *                                               each { id|destinationId, name, latitude, longitude }
 * @param {Array}  [input.dayAssignments]        1-based day per destination (same length/order)
 * @param {object} [input.accommodation]         wizard accommodation object or null
 * @param {object} [input.meta]                  extra non-authoritative fields (travellers, budget…)
 *
 * @returns {Promise<string>} the generated itineraryId
 */
export async function saveItinerary(input) {
  const user = await getLoggedInUser();

  assertItineraryInput(input);

  // Generate the document id up front so it can be stored inside the document
  // too and returned to the caller for the Module 2 handoff.
  const ref = doc(collection(db, ITINERARIES));
  const itineraryId = ref.id;

  const payload = {
    itineraryId,
    userId: user.uid,

    ...buildItineraryCoreFields(input),

    status: "Planning",
    module1Complete: true,
    module2Complete: false,

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(ref, payload);
  } catch (err) {
    // Surface the underlying Firestore error code so the wizard's error
    // banner is actionable rather than a generic failure message.
    if (err?.code === "permission-denied") {
      throw new Error(
        "You don't have permission to save this itinerary. Please sign in " +
          "again and try once more.",
        { cause: err }
      );
    }
    throw new Error(
      `Could not save the itinerary (${err?.code || "unknown"}): ` +
        `${err?.message || err}`,
      { cause: err }
    );
  }

  return itineraryId;
}

/*
 * ============================================================
 * UPDATE AN EXISTING ITINERARY
 * ============================================================
 *
 * Edits the itinerary the user opened from the dashboard. It writes back to the
 * SAME document (itineraries/{itineraryId}) — it never creates a new one.
 *
 * Guarantees:
 *  - the caller must be signed in;
 *  - the signed-in user must already own the document;
 *  - `userId`, `itineraryId`, `createdAt`, `status` and every Module 2 field
 *    are left untouched (ownership cannot be reassigned here);
 *  - `updatedAt` is refreshed to the server clock.
 *
 * @param {string} itineraryId  the existing document id
 * @param {object} input        same shape as saveItinerary's input
 * @returns {Promise<string>}   the unchanged itineraryId
 */
export async function updateItinerary(itineraryId, input) {
  const user = await getLoggedInUser();

  if (!itineraryId) {
    throw new Error("No itinerary was selected to update.");
  }

  assertItineraryInput(input);

  const ref = doc(db, ITINERARIES, itineraryId);

  let snap;
  try {
    snap = await getDoc(ref);
  } catch (err) {
    if (err?.code === "permission-denied") {
      throw new Error(
        "You don't have permission to edit this itinerary.",
        { cause: err }
      );
    }
    throw new Error(
      `Could not load the itinerary to update (${err?.code || "unknown"}): ` +
        `${err?.message || err}`,
      { cause: err }
    );
  }

  if (!snap.exists()) {
    throw new Error(
      "That itinerary no longer exists — it may have been deleted."
    );
  }

  const existing = snap.data();
  if (existing.userId && existing.userId !== user.uid) {
    throw new Error("You can only edit your own itineraries.");
  }

  // Only the wizard-owned fields, plus a fresh updatedAt. Because updateDoc
  // merges, everything not listed here (userId, itineraryId, createdAt, status,
  // module flags, Module 2 output) stays exactly as it was.
  const updates = {
    ...buildItineraryCoreFields(input, {
      existingDestinations: Array.isArray(existing.destinations)
        ? existing.destinations
        : [],
    }),
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(ref, updates);
  } catch (err) {
    if (err?.code === "permission-denied") {
      throw new Error(
        "You don't have permission to update this itinerary. Please sign in " +
          "again and try once more.",
        { cause: err }
      );
    }
    if (err?.code === "not-found") {
      throw new Error(
        "That itinerary no longer exists — it may have been deleted.",
        { cause: err }
      );
    }
    throw new Error(
      `Could not update the itinerary (${err?.code || "unknown"}): ` +
        `${err?.message || err}`,
      { cause: err }
    );
  }

  return itineraryId;
}

/*
 * ============================================================
 * DELETE AN ITINERARY
 * ============================================================
 *
 * Permanently removes a single itinerary the user opened from the dashboard.
 * It only ever touches itineraries/{itineraryId} — one document, by its
 * existing id. It never deletes anything else.
 *
 * Guarantees (mirrors updateItinerary):
 *  - the caller must be signed in;
 *  - the signed-in user must already own the document;
 *  - a document that is already gone is treated as a successful delete so the
 *    dashboard can safely drop the card.
 *
 * @param {string} itineraryId  the existing document id
 * @returns {Promise<string>}   the deleted itineraryId
 */
export async function deleteItinerary(itineraryId) {
  const user = await getLoggedInUser();

  if (!itineraryId) {
    throw new Error("No itinerary was selected to delete.");
  }

  const ref = doc(db, ITINERARIES, itineraryId);

  let snap;
  try {
    snap = await getDoc(ref);
  } catch (err) {
    if (err?.code === "permission-denied") {
      throw new Error("You don't have permission to delete this itinerary.", {
        cause: err,
      });
    }
    throw new Error(
      `Could not load the itinerary to delete (${err?.code || "unknown"}): ` +
        `${err?.message || err}`,
      { cause: err }
    );
  }

  // Already deleted (e.g. from another device) — nothing to do, and the caller
  // should still remove the card.
  if (!snap.exists()) {
    return itineraryId;
  }

  const existing = snap.data();
  if (existing.userId && existing.userId !== user.uid) {
    throw new Error("You can only delete your own itineraries.");
  }

  try {
    await deleteDoc(ref);
  } catch (err) {
    if (err?.code === "permission-denied") {
      throw new Error(
        "You don't have permission to delete this itinerary. Please sign in " +
          "again and try once more.",
        { cause: err }
      );
    }
    throw new Error(
      `Could not delete the itinerary (${err?.code || "unknown"}): ` +
        `${err?.message || err}`,
      { cause: err }
    );
  }

  return itineraryId;
}

/*
 * ============================================================
 * GET ONE ITINERARY  (used by Module 2 and the detail view)
 * ============================================================
 */
export async function getItinerary(itineraryId) {
  if (!itineraryId) throw new Error("itineraryId is required.");

  const snap = await getDoc(doc(db, ITINERARIES, itineraryId));
  if (!snap.exists()) return null;

  return { id: snap.id, ...snap.data() };
}

/*
 * ============================================================
 * LIST THE SIGNED-IN USER'S ITINERARIES
 * ============================================================
 */
export async function getMyItineraries() {
  const user = await getLoggedInUser();

  // orderBy on a field that always exists (createdAt). If the composite index
  // isn't there yet Firestore throws — fall back to an unordered query.
  let snapshot;
  try {
    snapshot = await getDocs(
      query(
        collection(db, ITINERARIES),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      )
    );
  } catch {
    snapshot = await getDocs(
      query(collection(db, ITINERARIES), where("userId", "==", user.uid))
    );
  }

  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}
