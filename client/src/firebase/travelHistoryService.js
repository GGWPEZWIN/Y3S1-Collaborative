import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  db,
  auth,
} from "./config";

// ============================================================
// GET CURRENT FIREBASE USER
// ============================================================

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

// ============================================================
// DATE FORMAT
// ============================================================

function formatDate(timestamp) {
  if (!timestamp) {
    return "";
  }

  if (
    typeof timestamp.toDate === "function"
  ) {
    return timestamp
      .toDate()
      .toLocaleDateString(
        "en-GB",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      );
  }

  if (timestamp instanceof Date) {
    return timestamp.toLocaleDateString(
      "en-GB",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  if (typeof timestamp === "string") {
    const date = new Date(timestamp);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString(
        "en-GB",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      );
    }
  }

  return "";
}

// ============================================================
// CALCULATE GRADE
// ============================================================

function calculateGrade(score) {
  const numericScore = Number(score) || 0;

  if (numericScore >= 90) return "A+";
  if (numericScore >= 80) return "A";
  if (numericScore >= 70) return "A-";
  if (numericScore >= 65) return "B+";
  if (numericScore >= 60) return "B";
  if (numericScore >= 55) return "C+";
  if (numericScore >= 50) return "C";
  if (numericScore >= 45) return "D";
  if (numericScore >= 40) return "E";
  return "G";
}

// ============================================================
// CONVERT TRIP
// ============================================================

function convertTrip(docSnapshot) {
  const data =
    docSnapshot.data();

  const startDate =
    data.startDate || null;

  const endDate =
    data.endDate || null;

  // Travel History stores the completed-trip score as finalEcoScore.
  // Fall back to older fields for compatibility.
  const ecoScore =
    Number(
      data.finalEcoScore ??
      data.final_eco_score ??
      data.ecoScore ??
      data.eco_score ??
      data.planEcoScore ??
      data.plan_eco_score ??
      0
    );

  // Completed trips store actual confirmed transport carbon here.
  const carbonKg =
    Number(
      data.confirmedTransportationCarbonKg ??
      data.confirmed_transportation_carbon_kg ??
      data.carbonKg ??
      data.carbon_kg ??
      data.carbon ??
      0
    );

  const grade =
    data.grade ||
    calculateGrade(
      ecoScore
    );

  return {
    id:
      docSnapshot.id,

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

    grade,

    status:
      data.status ||
      "Upcoming",

    reportUrl:
      data.reportUrl ||
      "",
  };
}

// ============================================================
// CURRENT USER
// ============================================================

export async function getCurrentUser() {
  const firebaseUser =
    await getLoggedInUser();

  const userRef =
    doc(
      db,
      "users",
      firebaseUser.uid
    );

  const snapshot =
    await getDoc(
      userRef
    );

  if (!snapshot.exists()) {
    return {
      name:
        firebaseUser.displayName ||
        "User",

      ecoScore: 0,

      profilePhotoUrl: "",
    };
  }

  const data =
    snapshot.data();

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

// ============================================================
// TRAVEL HISTORY
// ============================================================
//
// NEW FIRESTORE STRUCTURE:
//
// travelHistory/{itineraryId}
//
// NOT:
//
// users/{uid}/travelHistory/{itineraryId}
// ============================================================

export async function getTravelHistory({
  status = "All Trips",
  sortBy = "Newest First",
  queryText = "",
} = {}) {
  const firebaseUser =
    await getLoggedInUser();

  if (!firebaseUser) {
    throw new Error(
      "No user is currently logged in."
    );
  }

  const travelHistoryRef =
    collection(
      db,
      "travelHistory"
    );

  // IMPORTANT:
  // Firestore rules only allow users to read their own
  // travel history. Therefore the query MUST include
  // userId == current user's UID.
  //
  // We do NOT use orderBy here because we already sort
  // the results below in JavaScript. This also avoids
  // requiring a composite Firestore index.
  const travelQuery =
    query(
      travelHistoryRef,
      where(
        "userId",
        "==",
        firebaseUser.uid
      )
    );

  const snapshot =
    await getDocs(
      travelQuery
    );

  let trips =
    snapshot.docs.map(
      convertTrip
    );

  // ==========================================================
  // STATUS FILTER
  // ==========================================================

  if (
    status !==
    "All Trips"
  ) {
    trips =
      trips.filter(
        (trip) =>
          trip.status ===
          status
      );
  }

  // ==========================================================
  // SEARCH FILTER
  // ==========================================================

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
          trip.title
            .toLowerCase()
            .includes(searchText)
      );
  }

  // ==========================================================
  // SORT - NEWEST FIRST
  // ==========================================================

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

        return dateB - dateA;
      }
    );
  }

  // ==========================================================
  // SORT - OLDEST FIRST
  // ==========================================================

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

        return dateA - dateB;
      }
    );
  }

  // ==========================================================
  // SORT - HIGHEST ECO SCORE
  // ==========================================================

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

// ============================================================
// TRAVEL HISTORY SUMMARY
// ============================================================

export async function getTravelHistorySummary() {
  const firebaseUser =
    await getLoggedInUser();

  if (!firebaseUser) {
    throw new Error(
      "No user is currently logged in."
    );
  }

  const travelHistoryRef =
    collection(
      db,
      "travelHistory"
    );

  // IMPORTANT:
  // Only read the current user's travel history.
  const summaryQuery =
    query(
      travelHistoryRef,
      where(
        "userId",
        "==",
        firebaseUser.uid
      )
    );

  const snapshot =
    await getDocs(
      summaryQuery
    );

  const trips =
    snapshot.docs.map(
      convertTrip
    );

  const completedTrips =
    trips.filter(
      (trip) =>
        trip.status ===
        "Completed"
    );

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

  };
}

// ============================================================
// SYNC ITINERARY -> TRAVEL HISTORY
// ============================================================
//
// IMPORTANT:
//
// itineraryService.js imports this function:
//
// syncTravelHistoryFromItinerary
//
// We KEEP the function so itineraryService.js does not
// produce an import/export error.
//
// HOWEVER:
//
// We DO NOT create a travelHistory document here.
//
// Module 2 "Finish Trip" is responsible for creating:
//
// travelHistory/{itineraryId}
//
// and:
//
// travelHistory/{itineraryId}/ecoReport/report
//
// atomically inside its transaction.
//
// This prevents duplicate Travel History documents.
// ============================================================

export async function syncTravelHistoryFromItinerary(
  itinerary,
  status = "Planning"
) {
  const itineraryId =
    itinerary?.id ||
    itinerary?.itineraryId ||
    null;

  if (!itineraryId) {
    return null;
  }

  // ----------------------------------------------------------
  // Planning / Draft / other statuses:
  // Do nothing.
  // ----------------------------------------------------------

  if (
    status !==
    "Completed"
  ) {
    return itineraryId;
  }

  // ----------------------------------------------------------
  // Completed:
  //
  // Module 2 Finish Trip already creates the history
  // document atomically.
  //
  // Do not create it again here.
  // ----------------------------------------------------------

  return itineraryId;
}

// ============================================================
// ECO REPORT ERRORS
// ============================================================

export const ECO_REPORT_ERROR = {
  AUTH_REQUIRED:
    "AUTH_REQUIRED",

  NOT_FOUND:
    "REPORT_NOT_FOUND",

  UNAUTHORIZED:
    "UNAUTHORIZED",

  NOT_MODULE2_REPORT:
    "NOT_MODULE2_REPORT",

  UNAVAILABLE:
    "UNAVAILABLE",
};

// ============================================================
// ECO REPORT ERROR CLASS
// ============================================================

export class EcoReportError
  extends Error {
  constructor(code) {
    super(code);

    this.name =
      "EcoReportError";

    this.code =
      code;
  }
}

// ============================================================
// ECO REPORT REFERENCE
// ============================================================
//
// NEW STRUCTURE:
//
// travelHistory/{tripId}/ecoReport/report
//
// NOT:
//
// users/{uid}/travelHistory/{tripId}/ecoReport/report
// ============================================================

function reportDocRef(
  tripId
) {
  return doc(
    db,
    "travelHistory",
    tripId,
    "ecoReport",
    "report"
  );
}

// ============================================================
// ECO REPORT ERROR MAPPING
// ============================================================

function mapEcoReportFailure(
  error
) {
  if (
    error instanceof
    EcoReportError
  ) {
    return error;
  }

  const code =
    typeof error?.code ===
    "string"
      ? error.code
      : "";

  if (
    code ===
      "permission-denied" ||
    code ===
      "unauthenticated"
  ) {
    return new EcoReportError(
      ECO_REPORT_ERROR.UNAUTHORIZED
    );
  }

  return new EcoReportError(
    ECO_REPORT_ERROR.UNAVAILABLE
  );
}

// ============================================================
// GET ECO REPORT
// ============================================================

export async function getEcoReport(
  tripId
) {
  try {
    const firebaseUser =
      await getLoggedInUser();

    const id =
      typeof tripId ===
      "string"
        ? tripId.trim()
        : "";

    if (!id) {
      throw new EcoReportError(
        ECO_REPORT_ERROR.NOT_FOUND
      );
    }

    const snapshot =
      await getDoc(
        reportDocRef(id)
      );

    if (
      !snapshot.exists()
    ) {
      return null;
    }

    const data =
      snapshot.data();

    // Security check on client side.
    if (
      data.userId &&
      data.userId !==
        firebaseUser.uid
    ) {
      throw new EcoReportError(
        ECO_REPORT_ERROR.UNAUTHORIZED
      );
    }

    return {
      id:
        snapshot.id,

      ...data,
    };
  } catch (error) {
    throw mapEcoReportFailure(
      error
    );
  }
}

// ============================================================
// GET OR CREATE ECO REPORT
// ============================================================
//
// IMPORTANT:
//
// This function is intentionally READ-ONLY.
//
// We do NOT automatically create reports here.
//
// Reports are created only when Module 2 Finish Trip
// successfully completes.
// ============================================================

export async function getOrCreateEcoReport(
  tripId
) {
  return getEcoReport(
    tripId
  );
}

// ============================================================
// PUBLISH ECO REPORT
// ============================================================

export async function publishEcoReport(
  tripId
) {
  try {
    const firebaseUser =
      await getLoggedInUser();

    const id =
      typeof tripId ===
      "string"
        ? tripId.trim()
        : "";

    if (!id) {
      throw new EcoReportError(
        ECO_REPORT_ERROR.NOT_FOUND
      );
    }

    return await runTransaction(
      db,
      async (transaction) => {
        const reportRef =
          reportDocRef(id);

        const snapshot =
          await transaction.get(
            reportRef
          );

        if (
          !snapshot.exists()
        ) {
          throw new EcoReportError(
            ECO_REPORT_ERROR.NOT_FOUND
          );
        }

        const data =
          snapshot.data();

        // ------------------------------------------------------
        // OWNER CHECK
        // ------------------------------------------------------

        if (
          data.userId !==
          firebaseUser.uid
        ) {
          throw new EcoReportError(
            ECO_REPORT_ERROR.UNAUTHORIZED
          );
        }

        // ------------------------------------------------------
        // ONLY MODULE 2 REPORTS CAN BE PUBLISHED
        // ------------------------------------------------------

        if (
          data.source !==
          "module2_finish_trip"
        ) {
          throw new EcoReportError(
            ECO_REPORT_ERROR.NOT_MODULE2_REPORT
          );
        }

        // ------------------------------------------------------
        // ALREADY PUBLIC
        // ------------------------------------------------------

        if (
          data.visibility ===
          "public"
        ) {
          return {
            id:
              snapshot.id,

            ...data,

            alreadyPublic:
              true,
          };
        }

        // ------------------------------------------------------
        // UPDATE VISIBILITY
        // ------------------------------------------------------

        const now =
          serverTimestamp();

        transaction.update(
          reportRef,
          {
            visibility:
              "public",

            publishedAt:
              now,

            updatedAt:
              now,
          }
        );

        return {
          id:
            snapshot.id,

          ...data,

          visibility:
            "public",

          publishedAt:
            now,

          updatedAt:
            now,

          alreadyPublic:
            false,
        };
      }
    );
  } catch (error) {
    throw mapEcoReportFailure(
      error
    );
  }
}