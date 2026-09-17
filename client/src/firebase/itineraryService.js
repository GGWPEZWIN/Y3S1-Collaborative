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
import {
  checkAchievementsAfterProgressChange,
  checkItinerarySavedAchievement,
} from "./achievementService";

/*
 * ============================================================
 * ITINERARY SERVICE  —  Module 1
 * ============================================================
 *
 * Reuses the shared Firebase app from ./config (no new config).
 *
 * Saved itineraries live in a single top-level collection so Module 2 can
 * fetch one directly:
 *
 * getItinerary(id) -> doc(db, "itineraries", id)
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
 *
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
          reject(
            new Error(
              "No user is currently logged in."
            )
          );
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

  return Number.isFinite(n)
    ? n
    : null;
}

/*
 * ============================================================
 * TRAVELLER COUNT
 * ============================================================
 *
 * Module 1 now sends a numeric traveller count (Step 1's +/- counter)
 * instead of the old fixed dropdown strings. Clamped 1-20 here as a
 * server-side backstop in case a bypassed/older client sends something
 * else; non-numeric input is simply omitted rather than guessed at.
 */

function toTravellerCountOrNull(value) {
  if (value == null) return null;

  const n = Math.round(Number(value));

  if (!Number.isFinite(n)) {
    return null;
  }

  return Math.min(20, Math.max(1, n));
}

/*
 * ============================================================
 * DATE STRING VALIDATION
 * ============================================================
 *
 * A server-side backstop so a corrupted/malformed date (from a bypassed
 * client, a direct Firestore edit, or old data) can never be written back
 * out as a "valid" date — it becomes null instead of e.g. "31/10/0002" or
 * "1970-01-01" landing on a saved itinerary. Deliberately a small inline
 * check rather than importing the UI's date helpers into this Firebase
 * layer (see the date-overlap helpers below for the same convention).
 */

function isPlausibleDateString(value) {
  if (typeof value !== "string") return false;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);

  if (y < 1900 || y > 2200) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;

  const rebuilt = new Date(y, m - 1, d);

  return (
    rebuilt.getFullYear() === y &&
    rebuilt.getMonth() === m - 1 &&
    rebuilt.getDate() === d
  );
}

function toDateStringOrNull(value) {
  return isPlausibleDateString(value) ? value : null;
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

  return Math.round(
    Math.min(100, n)
  );
}

/*
 * ============================================================
 * START LOCATION
 * ============================================================
 */

function buildStartLocation(
  startLocation
) {
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
      toNumberOrNull(
        startLocation.latitude
      ),

    longitude:
      toNumberOrNull(
        startLocation.longitude
      ),
  };
}

/*
 * ============================================================
 * DESTINATION
 * ============================================================
 */

function buildDestination(
  destination,
  order,
  day
) {
  const base = {
    destinationId:
      destination.destinationId ??
      destination.id ??
      null,

    name:
      destination.name ??
      "",

    latitude:
      toNumberOrNull(
        destination.latitude
      ),

    longitude:
      toNumberOrNull(
        destination.longitude
      ),

    order,

    day,

    sustainability:
      emptySustainability(),
  };

  if (destination.placeId) {
    base.placeId =
      destination.placeId;
  }

  return base;
}

/*
 * ============================================================
 * ACCOMMODATION
 * ============================================================
 */

function buildAccommodation(
  accommodation,
  { destinationId = null, day = null, nights = null } = {}
) {
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
      destinationId ??
      null,

    pricePerNight:
      toNumberOrNull(
        accommodation.pricePerNight
      ),

    certifications:
      Array.isArray(
        accommodation.certifications
      )
        ? accommodation.certifications
        : [],
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

  if (day != null) {
    out.day = toNumberOrNull(day);
  }

  if (nights != null) {
    out.nights = toNumberOrNull(nights);
  }

  return out;
}

/*
 * ============================================================
 * ACTIVITY (persisted, destination-tagged)
 * ============================================================
 *
 * Mirrors the shape Module 2's itinerary normaliser already reads
 * (`normalizeActivities` in AIRecommendation/services/itinerary) —
 * { activityId, name, destinationId, ecoScore, carbonKg }. `activityIds`
 * (a flat list, no destination tag) is kept alongside this for existing
 * code that already reads it.
 */

function buildActivity(activity) {
  if (!activity) {
    return null;
  }

  return {
    activityId:
      activity.activityId ??
      activity.id ??
      null,

    name:
      activity.name ??
      activity.title ??
      "",

    destinationId:
      activity.destinationId ??
      null,

    category:
      activity.category ??
      null,

    ecoScore:
      toNumberOrNull(activity.ecoScore),

    carbonKg:
      toNumberOrNull(activity.carbonKg),
  };
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

  if (
    orderedDestinations.length ===
    0
  ) {
    throw new Error(
      "Select at least one destination."
    );
  }

  if (
    (startDate && !isPlausibleDateString(startDate)) ||
    (endDate && !isPlausibleDateString(endDate))
  ) {
    throw new Error(
      "The trip dates are not valid. Please re-enter them."
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
    // Legacy single-accommodation-for-the-whole-trip input. Still accepted
    // (and still written back out as `accommodation` for old readers) but
    // superseded by `destinationAccommodations` below.
    accommodation = null,
    // One entry per destination: { destinationId, accommodation, day, nights }.
    // Lets each stop on a multi-destination trip carry its own stay instead
    // of one accommodation for the entire itinerary.
    destinationAccommodations = null,
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
          typeof carried ===
            "object"
        ) {
          built.sustainability = {
            ...emptySustainability(),
            ...carried,
          };
        }

        return built;
      }
    );

  // One accommodation per destination, in route order. Falls back to the
  // legacy single `accommodation` (attached to the first destination) when a
  // caller hasn't been updated to send the per-destination form.
  const accommodations = Array.isArray(destinationAccommodations)
    ? destinationAccommodations
        .map((entry) =>
          buildAccommodation(entry?.accommodation, {
            destinationId: entry?.destinationId,
            day: entry?.day,
            nights: entry?.nights,
          })
        )
        .filter(Boolean)
    : [buildAccommodation(accommodation, { destinationId: destinations[0]?.destinationId })].filter(
        Boolean
      );

  // Destination-tagged activities, mirroring what Module 2's normaliser
  // already prefers. `activityIds` (below) is kept for existing Module 1
  // code that only ever needed the flat id list.
  const activities = Array.isArray(meta.activities)
    ? meta.activities.map(buildActivity).filter(Boolean)
    : [];

  return {
    title:
      title.trim(),

    dates: {
      startDate:
        toDateStringOrNull(startDate),

      endDate:
        toDateStringOrNull(endDate),
    },

    startLocation:
      buildStartLocation(
        startLocation
      ),

    destinations,

    // Legacy single field — kept in sync with the first destination's stay
    // so any code that hasn't moved to `accommodations` yet keeps working.
    accommodation:
      accommodations[0] ?? null,

    accommodations,

    activities,

    travellers:
      toTravellerCountOrNull(
        meta.travellers
      ),

    budget:
      meta.budget != null
        ? Number(meta.budget)
        : null,

    travellerStyle:
      meta.travellerStyle ??
      null,

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
 * SAVE ITINERARY
 * ============================================================
 */

export async function saveItinerary(
  input
) {
  const user =
    await getLoggedInUser();

  assertItineraryInput(input);

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

  /*
   * ----------------------------------------------------------
   * SAVE THE ITINERARY
   * ----------------------------------------------------------
   */

  await setDoc(
    ref,
    payload
  );

  /*
   * ----------------------------------------------------------
   * MIRROR INTO TRAVEL HISTORY
   * ----------------------------------------------------------
   *
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

  /*
   * ----------------------------------------------------------
   * CHECK "SAVE FIRST ITINERARY" ACHIEVEMENT
   * ----------------------------------------------------------
   *
   * IMPORTANT:
   *
   * This is checked AFTER the itinerary has been successfully
   * saved.
   *
   * The achievement is NOT stored inside the itinerary.
   *
   * It is stored separately under:
   *
   * users/{uid}/achievements/{achievementId}
   *
   * Therefore:
   *
   * Save itinerary
   *      ↓
   * Achievement unlocked
   *      ↓
   * Delete itinerary
   *      ↓
   * Achievement remains unlocked
   *
   * If the user saves another itinerary later,
   * awardAchievement() checks the existing user achievement
   * document and prevents the same achievement from being
   * awarded again.
   *
   * Achievement failure must NOT cause a successful itinerary
   * save to fail.
   */

  try {
    await checkItinerarySavedAchievement(
      user.uid
    );
  } catch (achievementError) {
    console.error(
      "Itinerary saved achievement check failed:",
      achievementError
    );
  }

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
    existing.userId !==
    user.uid
  ) {
    throw new Error(
      "You do not have permission to edit this itinerary."
    );
  }

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
 *
 * 1. itinerary status is updated
 * 2. Travel History is updated
 * 3. achievement checking is triggered automatically
 *
 * This means the user does NOT need to open the Achievements page
 * to unlock a trip-based achievement.
 *
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
    existing.userId !==
    user.uid
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
   *
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
    } catch (
      achievementError
    ) {
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
    data.userId !==
    user.uid
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
 * FIX:
 * This function was missing from itineraryService.js.
 *
 * Some page/component imports:
 *
 * getMyItineraryDateRanges
 *
 * so it MUST be exported from this file.
 *
 * It returns only the itinerary ID and its
 * start/end dates.
 * ============================================================
 */

export async function getMyItineraryDateRanges() {
  const itineraries =
    await getMyItineraries();

  return itineraries
    .map((itinerary) => ({
      id: itinerary.id,

      startDate:
        itinerary.dates?.startDate ||
        null,

      endDate:
        itinerary.dates?.endDate ||
        null,
    }))
    .filter(
      (itinerary) =>
        itinerary.startDate ||
        itinerary.endDate
    );
}

/*
 * ============================================================
 * DELETE ITINERARY
 * ============================================================
 *
 * IMPORTANT:
 *
 * Deleting an itinerary does NOT delete the user's achievement.
 *
 * We intentionally only delete:
 *
 * 1. itineraries/{itineraryId}
 * 2. travelHistory/{itineraryId}
 *
 * We DO NOT delete:
 *
 * users/{uid}/achievements/{achievementId}
 *
 * Therefore a previously unlocked "Save First Itinerary"
 * achievement stays permanently unlocked.
 *
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
    data.userId !==
    user.uid
  ) {
    throw new Error(
      "You do not have permission to delete this itinerary."
    );
  }

  /*
   * ----------------------------------------------------------
   * DELETE THE ITINERARY
   * ----------------------------------------------------------
   */

  await deleteDoc(
    itineraryRef
  );

  /*
   * ----------------------------------------------------------
   * ALSO REMOVE THE MIRRORED TRAVEL HISTORY RECORD
   * ----------------------------------------------------------
   */

  const historyRef =
    doc(
      db,
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

  /*
   * ----------------------------------------------------------
   * DO NOT DELETE ACHIEVEMENTS
   * ----------------------------------------------------------
   *
   * Nothing is deleted from:
   *
   * users/{uid}/achievements
   *
   * This guarantees that once an achievement has been
   * unlocked, deleting the itinerary cannot make the
   * achievement available again.
   */

  return true;
}
