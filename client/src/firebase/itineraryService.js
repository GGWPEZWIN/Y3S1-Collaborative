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
import { syncTravelHistoryFromItinerary } from "./travelHistoryService";
import { checkAchievementsAfterProgressChange } from "./achievementService";

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
 * Document shape:
 *
 * {
 *   itineraryId,
 *   userId,
 *   title,
 *   dates: {
 *     startDate,
 *     endDate
 *   },
 *   startLocation,
 *   destinations,
 *   accommodation,
 *   ecoScore,
 *   status,
 *   ...
 * }
 *
 * Module 1 does NOT compute transport carbon or the transport-inclusive eco
 * score. Module 2 is responsible for that.
 * ============================================================
 */

const ITINERARIES = "itineraries";

/*
 * ============================================================
 * GET CURRENT FIREBASE USER
 * ============================================================
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

        if (user) {
          resolve(user);
        } else {
          reject(new Error("No user is currently logged in."));
        }
      },
      (error) => {
        unsubscribe();
        reject(error);
      }
    );
  });
}

/*
 * ============================================================
 * NUMBER HELPERS
 * ============================================================
 */

function toNumberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/*
 * ============================================================
 * EMPTY SUSTAINABILITY
 * ============================================================
 */

function emptySustainability() {
  return {
    ecoScore: null,
    carbonKgCo2e: null,
    source: null,
  };
}

/*
 * ============================================================
 * ECO SCORE
 * ============================================================
 */

function toEcoScoreOrNull(value) {
  const n = Number(value);

  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }

  return Math.round(Math.min(100, n));
}

/*
 * ============================================================
 * START LOCATION
 * ============================================================
 */

function buildStartLocation(startLocation) {
  if (!startLocation) {
    return null;
  }

  return {
    locationId:
      startLocation.locationId ??
      startLocation.id ??
      null,

    name:
      startLocation.name ??
      "",

    latitude:
      toNumberOrNull(startLocation.latitude),

    longitude:
      toNumberOrNull(startLocation.longitude),
  };
}

/*
 * ============================================================
 * DESTINATION
 * ============================================================
 */

function buildDestination(destination, order, day) {
  const base = {
    destinationId:
      destination.destinationId ??
      destination.id ??
      null,

    name:
      destination.name ??
      "",

    latitude:
      toNumberOrNull(destination.latitude),

    longitude:
      toNumberOrNull(destination.longitude),

    order,

    day,

    sustainability:
      emptySustainability(),
  };

  if (destination.placeId) {
    base.placeId = destination.placeId;
  }

  return base;
}

/*
 * ============================================================
 * ACCOMMODATION
 * ============================================================
 */

function buildAccommodation(accommodation) {
  if (!accommodation) {
    return null;
  }

  const out = {
    accommodationId:
      accommodation.accommodationId ??
      accommodation.id ??
      null,

    name:
      accommodation.name ??
      "",

    type:
      accommodation.type ??
      null,

    destinationId:
      accommodation.destinationId ??
      null,

    pricePerNight:
      toNumberOrNull(
        accommodation.pricePerNight
      ),

    certifications:
      Array.isArray(accommodation.certifications)
        ? accommodation.certifications
        : [],

    // Plan-level eco score of the stay (0–100) — persisted so the review step
    // and the dashboard keep the same number after an edit reload. Optional;
    // older docs simply won't have it.
    ecoScore:
      toNumberOrNull(
        accommodation.ecoScore
      ),

    // Extra context kept for an approved Firebase hotel so the saved itinerary
    // is self-describing. Null for static-catalogue stays that don't have them.
    certificationTier:
      accommodation.certificationTier ?? null,

    state:
      accommodation.state ?? null,

    source:
      accommodation.source ?? null,
  };

  if (
    accommodation.latitude != null ||
    accommodation.longitude != null
  ) {
    out.latitude =
      toNumberOrNull(
        accommodation.latitude
      );

    out.longitude =
      toNumberOrNull(
        accommodation.longitude
      );
  }

  return out;
}

/*
 * ============================================================
 * VALIDATE INPUT
 * ============================================================
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
    throw new Error(
      "An itinerary title is required."
    );
  }

  if (!startLocation) {
    throw new Error(
      "A starting location is required."
    );
  }

  if (orderedDestinations.length === 0) {
    throw new Error(
      "Select at least one destination."
    );
  }

  if (
    startDate &&
    endDate &&
    endDate < startDate
  ) {
    throw new Error(
      "The end date must be on or after the start date."
    );
  }
}

/*
 * ============================================================
 * BUILD ITINERARY CORE FIELDS
 * ============================================================
 */

function buildItineraryCoreFields(
  input,
  {
    existingDestinations = [],
  } = {}
) {
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

  const sustainabilityByDestId =
    new Map(
      (existingDestinations || [])
        .filter(
          (d) =>
            d &&
            d.destinationId != null &&
            d.sustainability
        )
        .map(
          (d) => [
            d.destinationId,
            d.sustainability,
          ]
        )
    );

  const destinations =
    orderedDestinations.map(
      (destination, index) => {
        const built =
          buildDestination(
            destination,
            index + 1,
            Number(
              dayAssignments[index]
            ) || 1
          );

        const carried =
          sustainabilityByDestId.get(
            built.destinationId
          );

        if (
          carried &&
          typeof carried === "object"
        ) {
          built.sustainability = {
            ...emptySustainability(),
            ...carried,
          };
        }

        return built;
      }
    );

  return {
    title: title.trim(),

    dates: {
      startDate:
        startDate || null,

      endDate:
        endDate || null,
    },

    startLocation:
      buildStartLocation(
        startLocation
      ),

    destinations,

    accommodation:
      buildAccommodation(
        accommodation
      ),

    travellers:
      meta.travellers ?? null,

    budget:
      meta.budget != null
        ? Number(meta.budget)
        : null,

    travellerStyle:
      meta.travellerStyle ?? null,

    activityIds:
      Array.isArray(
        meta.activityIds
      )
        ? meta.activityIds
        : [],

    ecoScore:
      toEcoScoreOrNull(
        meta.ecoScore
      ),
  };
}

/*
 * ============================================================
 * ASSERT NO DATE OVERLAP
 * ============================================================
 *
 * Server-side backstop for the Step 1 overlap block: refuses to write an
 * itinerary whose [startDate, endDate] range overlaps one the SIGNED-IN USER
 * already has, so an overlapping itinerary can't be created by bypassing the
 * wizard UI (jumped steps, a stale tab, a direct call, a save-time race).
 *
 * Inclusive interval test — two ranges overlap iff aStart <= bEnd && aEnd >=
 * bStart. yyyy-mm-dd strings compare chronologically as plain strings. Mirrors
 * dateRangesOverlap / findDateConflict in
 * user/Itinerary/constants/itineraryData.js (kept inline to avoid coupling the
 * Firebase layer to a UI module). Missing dates => nothing to check.
 */

async function assertNoDateOverlap(startDate, endDate, excludeId = null) {
  if (!startDate || !endDate) {
    return;
  }

  const ranges = await getMyItineraryDateRanges();

  const clash = ranges.find(
    (row) =>
      row.id !== excludeId &&
      row.itineraryId !== excludeId &&
      startDate <= row.endDate &&
      endDate >= row.startDate
  );

  if (clash) {
    throw new Error(
      `These dates overlap an existing itinerary ("${clash.title}", ${clash.startDate} to ${clash.endDate}). Please choose different dates.`
    );
  }
}

/*
 * ============================================================
 * SAVE ITINERARY
 * ============================================================
 */

export async function saveItinerary(input) {
  const user =
    await getLoggedInUser();

  assertItineraryInput(input);

  await assertNoDateOverlap(
    input.startDate,
    input.endDate
  );

  const ref =
    doc(
      collection(
        db,
        ITINERARIES
      )
    );

  const itineraryId =
    ref.id;

  const payload = {
    itineraryId,

    userId:
      user.uid,

    ...buildItineraryCoreFields(
      input
    ),

    status:
      "Planning",

    module1Complete:
      true,

    module2Complete:
      false,

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp(),
  };

  await setDoc(
    ref,
    payload
  );

  /*
   * Mirror the itinerary into Travel History.
   * The same itinerary ID is used so editing does not
   * create duplicate history records.
   */
  await syncTravelHistoryFromItinerary(
    {
      id: itineraryId,
      ...payload,
    },
    "Planning"
  );

  return itineraryId;
}

/*
 * ============================================================
 * UPDATE ITINERARY
 * ============================================================
 */

export async function updateItinerary(
  itineraryId,
  input
) {
  const user =
    await getLoggedInUser();

  if (!itineraryId) {
    throw new Error(
      "Itinerary ID is required."
    );
  }

  assertItineraryInput(input);

  const ref =
    doc(
      db,
      ITINERARIES,
      itineraryId
    );

  const existingSnapshot =
    await getDoc(ref);

  if (
    !existingSnapshot.exists()
  ) {
    throw new Error(
      "Itinerary not found."
    );
  }

  const existing =
    existingSnapshot.data();

  if (
    existing.userId !== user.uid
  ) {
    throw new Error(
      "You do not have permission to edit this itinerary."
    );
  }

  await assertNoDateOverlap(
    input.startDate,
    input.endDate,
    itineraryId
  );

  const updates =
    buildItineraryCoreFields(
      input,
      {
        existingDestinations:
          existing.destinations ||
          [],
      }
    );

  await updateDoc(
    ref,
    {
      ...updates,

      updatedAt:
        serverTimestamp(),
    }
  );

  /*
   * Keep Travel History synchronized.
   */
  await syncTravelHistoryFromItinerary(
    {
      id: itineraryId,

      ...existing,

      ...updates,

      status:
        existing.status ||
        "Planning",
    },

    existing.status ||
      "Planning"
  );

  return itineraryId;
}

/*
 * ============================================================
 * UPDATE ITINERARY STATUS
 * ============================================================
 *
 * Allowed lifecycle:
 *
 * Planning
 * Active
 * Completed
 *
 * When status becomes Completed:
 * 1. itinerary status is updated
 * 2. Travel History is updated
 * 3. achievement checking is triggered automatically
 *
 * This means the user does NOT need to open the Achievements page
 * to unlock a trip-based achievement.
 * ============================================================
 */

export async function updateItineraryStatus(
  itineraryId,
  status
) {
  const user =
    await getLoggedInUser();

  if (!itineraryId) {
    throw new Error(
      "Itinerary ID is required."
    );
  }

  const allowedStatuses = [
    "Planning",
    "Active",
    "Completed",
  ];

  if (
    !allowedStatuses.includes(
      status
    )
  ) {
    throw new Error(
      "Invalid itinerary status."
    );
  }

  const itineraryRef =
    doc(
      db,
      ITINERARIES,
      itineraryId
    );

  const snapshot =
    await getDoc(
      itineraryRef
    );

  if (
    !snapshot.exists()
  ) {
    throw new Error(
      "Itinerary not found."
    );
  }

  const existing =
    snapshot.data();

  if (
    existing.userId !== user.uid
  ) {
    throw new Error(
      "You do not have permission to update this itinerary."
    );
  }

  const updateData = {
    status,

    updatedAt:
      serverTimestamp(),
  };

  if (
    status === "Completed"
  ) {
    updateData.completedAt =
      serverTimestamp();

    updateData.isCompleted =
      true;
  } else {
    updateData.isCompleted =
      false;
  }

  await updateDoc(
    itineraryRef,
    updateData
  );

  /*
   * Update Travel History using the same document ID.
   */
  await syncTravelHistoryFromItinerary(
    {
      id: itineraryId,

      ...existing,

      ...updateData,

      status,
    },

    status
  );

  /*
   * Automatically check achievements.
   *
   * Example:
   * trips_completed >= 1
   *
   * will unlock immediately when this trip
   * becomes Completed.
   */
  if (
    status === "Completed"
  ) {
    try {
      await checkAchievementsAfterProgressChange(
        user.uid
      );
    } catch (achievementError) {
      /*
       * Achievement failure should not make the
       * itinerary status update fail.
       */
      console.error(
        "Achievement check failed:",
        achievementError
      );
    }
  }

  return {
    id: itineraryId,
    status,
  };
}

/*
 * ============================================================
 * GET ONE ITINERARY
 * ============================================================
 */

export async function getItinerary(
  itineraryId
) {
  const user =
    await getLoggedInUser();

  if (!itineraryId) {
    throw new Error(
      "Itinerary ID is required."
    );
  }

  const ref =
    doc(
      db,
      ITINERARIES,
      itineraryId
    );

  const snapshot =
    await getDoc(ref);

  if (
    !snapshot.exists()
  ) {
    return null;
  }

  const data =
    snapshot.data();

  if (
    data.userId !== user.uid
  ) {
    throw new Error(
      "You do not have permission to view this itinerary."
    );
  }

  return {
    id: snapshot.id,
    ...data,
  };
}

/*
 * ============================================================
 * GET MY ITINERARIES
 * ============================================================
 */

export async function getMyItineraries() {
  const user =
    await getLoggedInUser();

  const ref =
    collection(
      db,
      ITINERARIES
    );

  const q =
    query(
      ref,
      where(
        "userId",
        "==",
        user.uid
      ),
      orderBy(
        "createdAt",
        "desc"
      )
    );

  const snapshot =
    await getDocs(q);

  return snapshot.docs.map(
    (item) => ({
      id: item.id,
      ...item.data(),
    })
  );
}

/*
 * ============================================================
 * GET MY ITINERARY DATE RANGES
 * ============================================================
 *
 * Lightweight read used by the Create wizard (Step 1) to stop a traveller
 * booking two overlapping itineraries. Returns only what the overlap check
 * needs, for the SIGNED-IN USER ONLY.
 *
 * Uses a single-field `where("userId", "==", uid)` filter (no orderBy), so it
 * needs no composite index of its own.
 *
 *   [{ id, itineraryId, title, startDate, endDate }]
 *
 * Rows without both dates are dropped — they can't overlap anything.
 * ============================================================
 */

export async function getMyItineraryDateRanges() {
  const user = await getLoggedInUser();

  const snapshot = await getDocs(
    query(collection(db, ITINERARIES), where("userId", "==", user.uid))
  );

  return snapshot.docs
    .map((item) => {
      const data = item.data();
      return {
        id: item.id,
        itineraryId: data.itineraryId || item.id,
        title: data.title || "Untitled trip",
        startDate: data.dates?.startDate || null,
        endDate: data.dates?.endDate || null,
      };
    })
    .filter((row) => row.startDate && row.endDate);
}

/*
 * ============================================================
 * DELETE ITINERARY
 * ============================================================
 */

export async function deleteItinerary(
  itineraryId
) {
  const user =
    await getLoggedInUser();

  if (!itineraryId) {
    throw new Error(
      "Itinerary ID is required."
    );
  }

  const itineraryRef =
    doc(
      db,
      ITINERARIES,
      itineraryId
    );

  const snapshot =
    await getDoc(
      itineraryRef
    );

  if (
    !snapshot.exists()
  ) {
    throw new Error(
      "Itinerary not found."
    );
  }

  const data =
    snapshot.data();

  if (
    data.userId !== user.uid
  ) {
    throw new Error(
      "You do not have permission to delete this itinerary."
    );
  }

  /*
   * Delete the itinerary.
   */
  await deleteDoc(
    itineraryRef
  );

  /*
   * Also remove the mirrored Travel History record.
   */
  const historyRef =
    doc(
      db,
      "users",
      user.uid,
      "travelHistory",
      itineraryId
    );

  try {
    await deleteDoc(
      historyRef
    );
  } catch (error) {
    console.warn(
      "Travel History record could not be deleted:",
      error
    );
  }

  return true;
}