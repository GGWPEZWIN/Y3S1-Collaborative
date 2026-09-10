import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";

import { db, auth } from "./config";

/*
 * ============================================================
 * GET CURRENT FIREBASE USER
 * ============================================================
 */

function getLoggedInUser() {
  return new Promise((resolve, reject) => {
    // Firebase already knows the current user
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }

    // Wait for Firebase authentication to finish restoring
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();

        if (user) {
          resolve(user);
        } else {
          reject(
            new Error("No user is currently logged in.")
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
 * FORMAT FIRESTORE DATE
 * ============================================================
 */

function formatDate(timestamp) {
  if (!timestamp) {
    return "";
  }

  // Firestore Timestamp
  if (typeof timestamp.toDate === "function") {
    return timestamp.toDate().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // JavaScript Date
  if (timestamp instanceof Date) {
    return timestamp.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // String date
  if (typeof timestamp === "string") {
    const date = new Date(timestamp);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  }

  return "";
}

/*
 * ============================================================
 * CALCULATE ECO GRADE
 * ============================================================
 *
 * Score:
 * 90 - 100 = A+
 * 80 - 89  = A
 * 70 - 79  = B
 * 60 - 69  = C
 * below 60 = D
 */

function calculateGrade(score) {
  const numericScore =
    Number(score) || 0;

  if (numericScore >= 90) return "A+";
  if (numericScore >= 80) return "A";
  if (numericScore >= 70) return "B";
  if (numericScore >= 60) return "C";

  return "D";
}

/*
 * ============================================================
 * CONVERT TRIP DOCUMENT
 * ============================================================
 */

function convertTrip(docSnapshot) {
  const data =
    docSnapshot.data();

  const startDate =
    data.startDate || null;

  const endDate =
    data.endDate || null;

  const ecoScore =
    Number(
      data.ecoScore ??
      data.eco_score ??
      0
    );

  const carbonKg =
    Number(
      data.carbonKg ??
      data.carbon_kg ??
      data.carbon ??
      0
    );

  const badgesEarned =
    Number(
      data.badgesEarned ??
      data.badges_earned ??
      data.badges ??
      0
    );

  const grade =
    data.grade ||
    calculateGrade(ecoScore);

  return {
    id:
      docSnapshot.id,

    // Support both "name" and "title"
    name:
      data.name ||
      data.title ||
      "Untitled Trip",

    title:
      data.title ||
      data.name ||
      "Untitled Trip",

    dateRange:
      `${formatDate(startDate)} - ${formatDate(endDate)}`,

    startDate,

    endDate,

    location:
      data.location ||
      data.destination ||
      "",

    ecoScore,

    carbonKg,

    badgesEarned,

    grade,

    status:
      data.status ||
      "Upcoming",

    reportUrl:
      data.reportUrl ||
      "",
  };
}

/*
 * ============================================================
 * ITINERARY → TRAVEL HISTORY SYNC
 * ============================================================
 *
 * The itinerary collection is the source of truth.
 *
 * Travel History mirrors each user's itinerary at:
 *
 * users/{uid}/travelHistory/{itineraryId}
 *
 * The SAME itinerary ID is used as the Travel History ID.
 *
 * Therefore:
 *
 * Save itinerary
 *      ↓
 * Travel History created
 *
 * Edit itinerary
 *      ↓
 * Same Travel History document updated
 *
 * Change status
 *      ↓
 * Same Travel History document updated
 *
 * Completed
 *      ↓
 * Travel History becomes Completed
 *      ↓
 * Achievement checking can run automatically
 * ============================================================
 */

/*
 * ============================================================
 * CONVERT VALUE TO FIRESTORE TIMESTAMP
 * ============================================================
 */

function toFirestoreDate(value) {
  if (!value) {
    return null;
  }

  // Already a Firestore Timestamp
  if (value instanceof Timestamp) {
    return value;
  }

  // Firestore Timestamp-like object
  if (
    value?.toDate &&
    typeof value.toDate === "function"
  ) {
    return value;
  }

  // JavaScript Date
  if (value instanceof Date) {
    return Timestamp.fromDate(value);
  }

  // String such as:
  // 2026-09-09
  if (typeof value === "string") {
    const date =
      new Date(`${value}T00:00:00`);

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {
      return Timestamp.fromDate(
        date
      );
    }
  }

  return null;
}

/*
 * ============================================================
 * GET ITINERARY LOCATION
 * ============================================================
 *
 * Example:
 *
 * Kuala Lumpur
 * →
 * Melaka
 * →
 * Johor Bahru
 *
 * If no destinations exist, use the start location.
 * ============================================================
 */

function getItineraryLocation(
  itinerary
) {
  const destinations =
    Array.isArray(
      itinerary?.destinations
    )
      ? itinerary.destinations
          .map(
            (destination) =>
              destination?.name
          )
          .filter(Boolean)
      : [];

  if (
    destinations.length > 0
  ) {
    return destinations.join(
      " → "
    );
  }

  return (
    itinerary?.startLocation?.name ||
    ""
  );
}

/*
 * ============================================================
 * NUMBER HELPER
 * ============================================================
 */

function getNumber(...values) {
  for (
    const value of values
  ) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      const number =
        Number(value);

      if (
        Number.isFinite(number)
      ) {
        return number;
      }
    }
  }

  return 0;
}

/*
 * ============================================================
 * SYNC ITINERARY TO TRAVEL HISTORY
 * ============================================================
 */

export async function syncTravelHistoryFromItinerary(
  itinerary,
  statusOverride = null
) {
  const firebaseUser =
    await getLoggedInUser();

  const itineraryId =
    itinerary?.id ||
    itinerary?.itineraryId;

  if (!itineraryId) {
    throw new Error(
      "Itinerary ID is required to sync travel history."
    );
  }

  const status =
    statusOverride ||
    itinerary.status ||
    "Planning";

  /*
   * users/{uid}/travelHistory/{itineraryId}
   */

  const historyRef =
    doc(
      db,
      "users",
      firebaseUser.uid,
      "travelHistory",
      itineraryId
    );

  const existingSnapshot =
    await getDoc(
      historyRef
    );

  /*
   * IMPORTANT:
   *
   * Your itinerary stores Eco Score inside:
   *
   * itinerary.meta.ecoScore
   *
   * so we support BOTH:
   *
   * itinerary.ecoScore
   * itinerary.meta.ecoScore
   */

  const ecoScore =
    getNumber(
      itinerary.ecoScore,
      itinerary.eco_score,
      itinerary.meta?.ecoScore,
      itinerary.meta?.eco_score
    );

  /*
   * Support both direct dates and nested dates.
   */

  const startDate =
    toFirestoreDate(
      itinerary.startDate ??
      itinerary.dates?.startDate
    );

  const endDate =
    toFirestoreDate(
      itinerary.endDate ??
      itinerary.dates?.endDate
    );

  /*
   * Carbon may not exist during Module 1.
   *
   * Module 2 can later update this value.
   */

  const carbonKg =
    getNumber(
      itinerary.carbonKg,
      itinerary.carbon_kg,
      itinerary.carbon,
      itinerary.totalCarbonKg,
      itinerary.meta?.carbonKg,
      itinerary.meta?.carbon_kg
    );

  /*
   * Badges may also be populated later.
   */

  const badgesEarned =
    getNumber(
      itinerary.badgesEarned,
      itinerary.badges_earned,
      itinerary.badges,
      itinerary.meta?.badgesEarned,
      itinerary.meta?.badges_earned
    );

  /*
   * Build Travel History document.
   */

  const payload = {
    itineraryId,

    title:
      itinerary.title ||
      itinerary.name ||
      "Untitled Trip",

    name:
      itinerary.name ||
      itinerary.title ||
      "Untitled Trip",

    /*
     * Firestore Timestamp
     */
    startDate,

    /*
     * Firestore Timestamp
     */
    endDate,

    location:
      getItineraryLocation(
        itinerary
      ),

    ecoScore,

    carbonKg,

    badgesEarned,

    status,

    updatedAt:
      serverTimestamp(),
  };

  /*
   * Only create createdAt for a NEW history document.
   */

  if (
    !existingSnapshot.exists()
  ) {
    payload.createdAt =
      serverTimestamp();
  }

  /*
   * Completed status fields.
   */

  if (
    status === "Completed"
  ) {
    payload.completed =
      true;

    payload.isCompleted =
      true;

    payload.completedAt =
      serverTimestamp();
  } else {
    payload.completed =
      false;

    payload.isCompleted =
      false;
  }

  /*
   * merge:true means:
   *
   * existing Eco Report fields or Module 2 fields
   * are not unnecessarily deleted.
   */

  await setDoc(
    historyRef,
    payload,
    {
      merge: true,
    }
  );

  return {
    id:
      itineraryId,

    ...payload,
  };
}

/*
 * ============================================================
 * GET CURRENT USER PROFILE
 * ============================================================
 */

export async function getCurrentUser() {
  const firebaseUser =
    await getLoggedInUser();

  const userRef =
    doc(
      db,
      "users",
      firebaseUser.uid
    );

  const userSnapshot =
    await getDoc(
      userRef
    );

  if (
    !userSnapshot.exists()
  ) {
    return {
      name:
        firebaseUser.displayName ||
        "User",

      ecoScore:
        0,

      profilePhotoUrl:
        "",
    };
  }

  const data =
    userSnapshot.data();

  return {
    name:
      data.name ||
      firebaseUser.displayName ||
      "User",

    ecoScore:
      Number(
        data.eco_score ??
        data.ecoScore ??
        0
      ),

    profilePhotoUrl:
      data.profile_photo_url ||
      data.profilePhotoUrl ||
      "",
  };
}

/*
 * ============================================================
 * GET TRAVEL HISTORY
 * ============================================================
 */

export async function getTravelHistory({
  status = "All Trips",
  sortBy = "Newest First",
  queryText = "",
} = {}) {
  const firebaseUser =
    await getLoggedInUser();

  const travelHistoryRef =
    collection(
      db,
      "users",
      firebaseUser.uid,
      "travelHistory"
    );

  /*
   * Do NOT use:
   *
   * orderBy("startDate")
   *
   * here.
   *
   * If one old Firestore document does not have startDate,
   * Firestore can cause the query to exclude it.
   *
   * Instead:
   *
   * 1. Get all documents
   * 2. Sort in JavaScript
   */

  const snapshot =
    await getDocs(
      travelHistoryRef
    );

  let trips =
    snapshot.docs.map(
      convertTrip
    );

  /*
   * ==========================================================
   * STATUS FILTER
   * ==========================================================
   */

  if (
    status !== "All Trips"
  ) {
    trips =
      trips.filter(
        (trip) =>
          trip.status ===
          status
      );
  }

  /*
   * ==========================================================
   * SEARCH
   * ==========================================================
   */

  if (
    queryText.trim() !== ""
  ) {
    const searchText =
      queryText
        .trim()
        .toLowerCase();

    trips =
      trips.filter(
        (trip) =>
          trip.name
            .toLowerCase()
            .includes(
              searchText
            )
      );
  }

  /*
   * ==========================================================
   * SORT
   * ==========================================================
   */

  if (
    sortBy ===
    "Newest First"
  ) {
    trips.sort(
      (a, b) => {
        const dateA =
          a.startDate?.toDate
            ? a.startDate
                .toDate()
                .getTime()
            : 0;

        const dateB =
          b.startDate?.toDate
            ? b.startDate
                .toDate()
                .getTime()
            : 0;

        return (
          dateB - dateA
        );
      }
    );
  }

  if (
    sortBy ===
    "Oldest First"
  ) {
    trips.sort(
      (a, b) => {
        const dateA =
          a.startDate?.toDate
            ? a.startDate
                .toDate()
                .getTime()
            : 0;

        const dateB =
          b.startDate?.toDate
            ? b.startDate
                .toDate()
                .getTime()
            : 0;

        return (
          dateA - dateB
        );
      }
    );
  }

  if (
    sortBy ===
    "Highest Score"
  ) {
    trips.sort(
      (a, b) =>
        b.ecoScore -
        a.ecoScore
    );
  }

  return trips;
}

/*
 * ============================================================
 * GET TRAVEL HISTORY SUMMARY
 * ============================================================
 *
 * tripsCompleted:
 *     Number of completed trips
 *
 * avgEcoScore:
 *     Average eco score across all trips
 *
 * totalCarbonKg:
 *     Total carbon recorded
 *
 * badgesEarned:
 *     Total badges earned
 * ============================================================
 */

export async function getTravelHistorySummary() {
  const firebaseUser =
    await getLoggedInUser();

  const travelHistoryRef =
    collection(
      db,
      "users",
      firebaseUser.uid,
      "travelHistory"
    );

  const snapshot =
    await getDocs(
      travelHistoryRef
    );

  const trips =
    snapshot.docs.map(
      convertTrip
    );

  /*
   * Completed trips
   */

  const completedTrips =
    trips.filter(
      (trip) =>
        trip.status ===
        "Completed"
    );

  /*
   * Average Eco Score
   */

  const avgEcoScore =
    trips.length > 0
      ? Math.round(
          trips.reduce(
            (
              total,
              trip
            ) =>
              total +
              trip.ecoScore,
            0
          ) /
            trips.length
        )
      : 0;

  /*
   * Total carbon
   */

  const totalCarbonKg =
    trips.reduce(
      (
        total,
        trip
      ) =>
        total +
        trip.carbonKg,
      0
    );

  /*
   * Total badges
   */

  const badgesEarned =
    trips.reduce(
      (
        total,
        trip
      ) =>
        total +
        trip.badgesEarned,
      0
    );

  return {
    tripsCompleted:
      completedTrips.length,

    avgEcoScore,

    totalCarbonKg:
      Number(
        totalCarbonKg.toFixed(
          1
        )
      ),

    badgesEarned,
  };
}

/*
 * ============================================================
 * GET / CREATE ECO REPORT CARD
 * ============================================================
 *
 * Each trip gets its own report:
 *
 * users/{uid}/travelHistory/{tripId}/ecoReport/report
 *
 * If the report already exists:
 *     return it.
 *
 * If it does not exist:
 *     return null. Reports are created only by Module 2 Finish Trip.
 * ============================================================
 */

export async function getOrCreateEcoReport(
  tripId
) {
  const firebaseUser =
    await getLoggedInUser();

  if (!tripId) {
    throw new Error(
      "Trip ID is required to generate the Eco-Report Card."
    );
  }

  const reportRef =
    doc(
      db,
      "users",
      firebaseUser.uid,
      "travelHistory",
      tripId,
      "ecoReport",
      "report"
    );

  const existingReport =
    await getDoc(
      reportRef
    );

  if (
    existingReport.exists()
  ) {
    return {
      id:
        existingReport.id,

      ...existingReport.data(),
    };
  }

  return null;
}