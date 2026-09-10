import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
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

  return new Promise(
    (resolve, reject) => {

      if (auth.currentUser) {
        resolve(
          auth.currentUser
        );
        return;
      }

      const unsubscribe =
        onAuthStateChanged(
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
    }
  );
}


// ============================================================
// DATE FORMAT
// ============================================================

function formatDate(
  timestamp
) {

  if (!timestamp) {
    return "";
  }

  if (
    typeof timestamp.toDate ===
    "function"
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

  if (
    timestamp instanceof Date
  ) {

    return timestamp.toLocaleDateString(
      "en-GB",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  if (
    typeof timestamp ===
    "string"
  ) {

    const date =
      new Date(timestamp);

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {

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

function calculateGrade(
  score
) {

  const numericScore =
    Number(score) || 0;

  if (numericScore >= 90)
    return "A+";

  if (numericScore >= 80)
    return "A";

  if (numericScore >= 70)
    return "B";

  if (numericScore >= 60)
    return "C";

  return "D";
}


// ============================================================
// CONVERT TRIP
// ============================================================

function convertTrip(
  docSnapshot
) {

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


  const travelQuery =
    query(
      travelHistoryRef,
      orderBy(
        "startDate",
        "desc"
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


  // STATUS

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


  // SEARCH

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


  // SORT

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


export const ECO_REPORT_ERROR = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  NOT_FOUND: "REPORT_NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  NOT_MODULE2_REPORT: "NOT_MODULE2_REPORT",
  UNAVAILABLE: "UNAVAILABLE",
};

export class EcoReportError extends Error {
  constructor(code) {
    super(code);
    this.name = "EcoReportError";
    this.code = code;
  }
}

function reportDocRef(uid, tripId) {
  return doc(
    db,
    "users",
    uid,
    "travelHistory",
    tripId,
    "ecoReport",
    "report"
  );
}

function mapEcoReportFailure(error) {
  if (error instanceof EcoReportError) return error;
  const code = typeof error?.code === "string" ? error.code : "";
  if (code === "permission-denied" || code === "unauthenticated") {
    return new EcoReportError(ECO_REPORT_ERROR.UNAUTHORIZED);
  }
  return new EcoReportError(ECO_REPORT_ERROR.UNAVAILABLE);
}

export async function getEcoReport(tripId) {
  try {
    const firebaseUser = await getLoggedInUser();
    const id = typeof tripId === "string" ? tripId.trim() : "";
    if (!id) {
      throw new EcoReportError(ECO_REPORT_ERROR.NOT_FOUND);
    }

    const snapshot = await getDoc(reportDocRef(firebaseUser.uid, id));
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    if (data.userId && data.userId !== firebaseUser.uid) {
      throw new EcoReportError(ECO_REPORT_ERROR.UNAUTHORIZED);
    }
    return {
      id: snapshot.id,
      ...data,
    };
  } catch (error) {
    throw mapEcoReportFailure(error);
  }
}

export async function getOrCreateEcoReport(tripId) {
  return getEcoReport(tripId);
}

export async function publishEcoReport(tripId) {
  try {
    const firebaseUser = await getLoggedInUser();
    const id = typeof tripId === "string" ? tripId.trim() : "";
    if (!id) {
      throw new EcoReportError(ECO_REPORT_ERROR.NOT_FOUND);
    }
    return await runTransaction(db, async (transaction) => {
      const reportRef = reportDocRef(firebaseUser.uid, id);
      const snapshot = await transaction.get(reportRef);
      if (!snapshot.exists()) {
        throw new EcoReportError(ECO_REPORT_ERROR.NOT_FOUND);
      }

      const data = snapshot.data();
      if (data.userId !== firebaseUser.uid) {
        throw new EcoReportError(ECO_REPORT_ERROR.UNAUTHORIZED);
      }
      if (data.source !== "module2_finish_trip") {
        throw new EcoReportError(ECO_REPORT_ERROR.NOT_MODULE2_REPORT);
      }

      if (data.visibility === "public") {
        return {
          id: snapshot.id,
          ...data,
          alreadyPublic: true,
        };
      }

      const now = serverTimestamp();
      transaction.update(reportRef, {
        visibility: "public",
        publishedAt: now,
        updatedAt: now,
      });

      return {
        id: snapshot.id,
        ...data,
        visibility: "public",
        publishedAt: now,
        updatedAt: now,
        alreadyPublic: false,
      };
    });
  } catch (error) {
    throw mapEcoReportFailure(error);
  }
}