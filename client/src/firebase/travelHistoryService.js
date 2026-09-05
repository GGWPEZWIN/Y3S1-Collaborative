import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  serverTimestamp,
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
  const numericScore = Number(score) || 0;

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
  const data = docSnapshot.data();

  const startDate = data.startDate || null;
  const endDate = data.endDate || null;

  const ecoScore = Number(
    data.ecoScore ??
    data.eco_score ??
    0
  );

  const carbonKg = Number(
    data.carbonKg ??
    data.carbon_kg ??
    data.carbon ??
    0
  );

  const badgesEarned = Number(
    data.badgesEarned ??
    data.badges_earned ??
    data.badges ??
    0
  );

  const grade = data.grade || calculateGrade(ecoScore);

  return {
    id: docSnapshot.id,

    // Support both "name" and "title"
    name:
      data.name ||
      data.title ||
      "Untitled Trip",

    title:
      data.title ||
      data.name ||
      "Untitled Trip",

    dateRange: `${formatDate(startDate)} - ${formatDate(endDate)}`,

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
 * GET CURRENT USER PROFILE
 * ============================================================
 */

export async function getCurrentUser() {
  const firebaseUser = await getLoggedInUser();

  const userRef = doc(
    db,
    "users",
    firebaseUser.uid
  );

  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    return {
      name:
        firebaseUser.displayName ||
        "User",

      ecoScore: 0,

      profilePhotoUrl: "",
    };
  }

  const data = userSnapshot.data();

  return {
    name:
      data.name ||
      firebaseUser.displayName ||
      "User",

    ecoScore: Number(
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
  const firebaseUser = await getLoggedInUser();

  const travelHistoryRef = collection(
    db,
    "users",
    firebaseUser.uid,
    "travelHistory"
  );

  const travelQuery = query(
    travelHistoryRef,
    orderBy("startDate", "desc")
  );

  const snapshot = await getDocs(travelQuery);

  let trips = snapshot.docs.map(convertTrip);

  /*
   * STATUS FILTER
   */

  if (status !== "All Trips") {
    trips = trips.filter(
      (trip) => trip.status === status
    );
  }

  /*
   * SEARCH
   */

  if (queryText.trim() !== "") {
    const searchText =
      queryText.trim().toLowerCase();

    trips = trips.filter((trip) =>
      trip.name
        .toLowerCase()
        .includes(searchText)
    );
  }

  /*
   * SORT
   */

  if (sortBy === "Newest First") {
    trips.sort((a, b) => {
      const dateA =
        a.startDate?.toDate
          ? a.startDate.toDate().getTime()
          : 0;

      const dateB =
        b.startDate?.toDate
          ? b.startDate.toDate().getTime()
          : 0;

      return dateB - dateA;
    });
  }

  if (sortBy === "Oldest First") {
    trips.sort((a, b) => {
      const dateA =
        a.startDate?.toDate
          ? a.startDate.toDate().getTime()
          : 0;

      const dateB =
        b.startDate?.toDate
          ? b.startDate.toDate().getTime()
          : 0;

      return dateA - dateB;
    });
  }

  if (sortBy === "Highest Score") {
    trips.sort(
      (a, b) =>
        b.ecoScore - a.ecoScore
    );
  }

  return trips;
}

/*
 * ============================================================
 * TRAVEL HISTORY SUMMARY
 * ============================================================
 *
 * These metrics are calculated from ALL trips belonging
 * to the currently logged-in user.
 *
 * tripsCompleted:
 *     Number of trips with status "Completed"
 *
 * avgEcoScore:
 *     Average eco score across ALL trips
 *
 * totalCarbonKg:
 *     Sum of carbonKg across ALL trips
 *
 * badgesEarned:
 *     Sum of badgesEarned across ALL trips
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
    await getDocs(travelHistoryRef);

  const trips =
    snapshot.docs.map(convertTrip);

  const completedTrips =
    trips.filter(
      (trip) =>
        trip.status === "Completed"
    );

  const avgEcoScore =
    trips.length > 0
      ? Math.round(
          trips.reduce(
            (total, trip) =>
              total + trip.ecoScore,
            0
          ) / trips.length
        )
      : 0;

  const totalCarbonKg =
    trips.reduce(
      (total, trip) =>
        total + trip.carbonKg,
      0
    );

  const badgesEarned =
    trips.reduce(
      (total, trip) =>
        total + trip.badgesEarned,
      0
    );

  return {
    tripsCompleted:
      completedTrips.length,

    avgEcoScore,

    totalCarbonKg:
      Number(totalCarbonKg.toFixed(1)),

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
 *     calculate it from the trip,
 *     save it to Firebase,
 *     then return it.
 * ============================================================
 */

export async function getOrCreateEcoReport(tripId) {
  const firebaseUser =
    await getLoggedInUser();

  if (!tripId) {
    throw new Error(
      "Trip ID is required to generate the Eco-Report Card."
    );
  }

  const tripRef = doc(
    db,
    "users",
    firebaseUser.uid,
    "travelHistory",
    tripId
  );

  const tripSnapshot =
    await getDoc(tripRef);

  if (!tripSnapshot.exists()) {
    throw new Error(
      "Travel history record was not found."
    );
  }

  const trip = convertTrip(tripSnapshot);

  /*
   * Eco report document
   */

  const reportRef = doc(
    db,
    "users",
    firebaseUser.uid,
    "travelHistory",
    tripId,
    "ecoReport",
    "report"
  );

  const existingReport =
    await getDoc(reportRef);

  /*
   * If report already exists, return it.
   */

  if (existingReport.exists()) {
    return {
      id: existingReport.id,
      ...existingReport.data(),
    };
  }

  /*
   * Create report from trip data.
   */

  const reportData = {
    tripId: trip.id,

    tripName: trip.name,

    location: trip.location,

    startDate: trip.startDate,

    endDate: trip.endDate,

    status: trip.status,

    ecoScore: trip.ecoScore,

    grade: trip.grade,

    carbonKg: trip.carbonKg,

    badgesEarned: trip.badgesEarned,

    createdAt: serverTimestamp(),

    updatedAt: serverTimestamp(),
  };

  await setDoc(
    reportRef,
    reportData
  );

  return {
    id: "report",
    ...reportData,
  };
}