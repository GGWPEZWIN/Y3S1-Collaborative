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
// GRADE DESCRIPTION
// ============================================================

function getGradeLabel(
  grade
) {

  switch (grade) {

    case "A+":
      return "Outstanding";

    case "A":
      return "Excellent";

    case "B":
      return "Good";

    case "C":
      return "Fair";

    default:
      return "Needs Improvement";
  }
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


// ============================================================
// GET / CREATE ECO REPORT
// ============================================================
//
// Firebase path:
//
// users
//   └── UID
//       └── travelHistory
//           └── TRIP_ID
//               └── ecoReport
//                   └── report
//
// ============================================================

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


  // ----------------------------------------------------------
  // GET TRIP
  // ----------------------------------------------------------

  const tripRef =
    doc(
      db,
      "users",
      firebaseUser.uid,
      "travelHistory",
      tripId
    );


  const tripSnapshot =
    await getDoc(
      tripRef
    );


  if (
    !tripSnapshot.exists()
  ) {

    throw new Error(
      "Travel history record was not found."
    );
  }


  const trip =
    convertTrip(
      tripSnapshot
    );


  // ----------------------------------------------------------
  // REPORT LOCATION
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // CHECK EXISTING REPORT
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // CREATE BREAKDOWN
  // ----------------------------------------------------------

  const score =
    Number(
      trip.ecoScore
    ) || 0;


  const breakdown = [

    {
      label:
        "Transportation",

      value:
        Math.min(
          100,
          Math.max(
            0,
            Number(
              trip.transportationScore ??
              trip.transportScore ??
              Math.round(
                score * 0.96
              )
            )
          )
        ),
    },

    {
      label:
        "Accommodation",

      value:
        Math.min(
          100,
          Math.max(
            0,
            Number(
              trip.accommodationScore ??
              Math.round(
                score * 0.96
              )
            )
          )
        ),
    },

    {
      label:
        "Activities",

      value:
        Math.min(
          100,
          Math.max(
            0,
            Number(
              trip.activitiesScore ??
              Math.round(
                score * 0.94
              )
            )
          )
        ),
    },

    {
      label:
        "Waste & Resources",

      value:
        Math.min(
          100,
          Math.max(
            0,
            Number(
              trip.wasteScore ??
              Math.round(
                score * 0.87
              )
            )
          )
        ),
    },

  ];


  // ----------------------------------------------------------
  // CARBON BREAKDOWN
  // ----------------------------------------------------------

  const carbon =
    Number(
      trip.carbonKg
    ) || 0;


  let carbonSplit = [];


  if (trip.carbonSplit) {

    carbonSplit =
      trip.carbonSplit;

  } else {

    // If your trip document already
    // contains transportation/accommodation
    // carbon values, use them.

    const hotel =
      Number(
        trip.hotelCarbon ??
        trip.accommodationCarbon ??
        carbon * 0.25
      );

    const train =
      Number(
        trip.trainCarbon ??
        carbon * 0.45
      );

    const bus =
      Number(
        trip.busCarbon ??
        carbon * 0.30
      );


    carbonSplit = [

      {
        name: "Hotel",
        value:
          Number(
            hotel.toFixed(2)
          ),
        color:
          "#3b82f6",
      },

      {
        name: "Train",
        value:
          Number(
            train.toFixed(2)
          ),
        color:
          "#facc15",
      },

      {
        name: "Bus",
        value:
          Number(
            bus.toFixed(2)
          ),
        color:
          "#22c55e",
      },

    ];
  }


  // ----------------------------------------------------------
  // ENVIRONMENTAL IMPACT
  // ----------------------------------------------------------

  const impact = [

    {
      icon: "🌳",

      value:
        Number(
          carbon * 0.073
        ).toFixed(1),

      sub:
        "trees equivalent",

      label:
        "Trees Equivalent",
    },

    {
      icon: "♻️",

      value:
        Math.max(
          1,
          Math.round(
            carbon * 1.5
          )
        ),

      sub:
        "bottles",

      label:
        "Plastic Bottles Avoided",
    },

    {
      icon: "📉",

      value:
        `-${Math.max(
          1,
          Math.round(
            100 -
            score
          )
        )}%`,

      sub:
        "vs. Avg Tourist",

      label:
        "Carbon",
    },

    {
      icon: "🚌",

      value:
        "100%",

      sub:
        "of travel",

      label:
        "Public Transport",
    },

  ];


  // ----------------------------------------------------------
  // CREATE REPORT
  // ----------------------------------------------------------

  const reportData = {

    tripId:
      trip.id,

    tripName:
      trip.name,

    location:
      trip.location,

    startDate:
      trip.startDate,

    endDate:
      trip.endDate,

    status:
      trip.status,

    ecoScore:
      trip.ecoScore,

    grade:
      trip.grade,

    gradeLabel:
      getGradeLabel(
        trip.grade
      ),

    carbonKg:
      trip.carbonKg,

    badgesEarned:
      trip.badgesEarned,

    breakdown,

    carbonSplit,

    impact,

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp(),
  };


  // ----------------------------------------------------------
  // SAVE TO FIREBASE
  // ----------------------------------------------------------

  await setDoc(
    reportRef,
    reportData
  );


  return {

    id: "report",

    ...reportData,
  };
}