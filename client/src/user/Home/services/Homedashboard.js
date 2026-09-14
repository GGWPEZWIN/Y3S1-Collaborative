// ============================================================
// homeDashboardService.js
// REAL DATA SERVICE FOR MAIN DASHBOARD
// ============================================================
//
// No hardcoded/mock trips are used here.
//
// Real data comes from:
// - itineraries
// - travelHistory
//
// Eco Score itself is handled by MainDashboard using
// listenToCumulativeEcoScore().
//
// ============================================================

import {
  getMyItineraries,
} from "../../../firebase/itineraryService";

import {
  getTravelHistory,
} from "../../../firebase/travelHistoryService";

import {
  getAvailableChallenges,
} from "../../../firebase/challengeTeamService";


// ============================================================
// HELPERS
// ============================================================

function toMillis(value) {
  if (!value) {
    return 0;
  }

  // Firebase Timestamp
  if (
    typeof value?.toMillis === "function"
  ) {
    return value.toMillis();
  }

  // JavaScript Date
  if (value instanceof Date) {
    return value.getTime();
  }

  // Firestore Timestamp-like object
  if (
    typeof value === "object" &&
    typeof value.seconds === "number"
  ) {
    return value.seconds * 1000;
  }

  // String / number date
  const parsed =
    new Date(value).getTime();

  return Number.isNaN(parsed)
    ? 0
    : parsed;
}


// ============================================================
// TRIP HELPERS
// ============================================================

function getTripTitle(trip) {
  return (
    trip?.title ||
    trip?.name ||
    trip?.tripName ||
    "Untitled Trip"
  );
}


function getStartDate(trip) {
  return (
    trip?.startDate ||
    trip?.dates?.startDate ||
    trip?.dateRange?.startDate ||
    trip?.fromDate ||
    null
  );
}


function getEndDate(trip) {
  return (
    trip?.endDate ||
    trip?.dates?.endDate ||
    trip?.dateRange?.endDate ||
    trip?.toDate ||
    null
  );
}


function formatDate(value) {
  if (!value) {
    return "";
  }

  // Firebase Timestamp
  if (
    typeof value?.toDate === "function"
  ) {
    return value
      .toDate()
      .toLocaleDateString();
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return String(value);
  }

  return date.toLocaleDateString();
}


function getDateRange(trip) {
  const start =
    getStartDate(trip);

  const end =
    getEndDate(trip);

  if (start && end) {
    return `${formatDate(start)} - ${formatDate(end)}`;
  }

  if (start) {
    return formatDate(start);
  }

  if (end) {
    return formatDate(end);
  }

  return "Date unavailable";
}


function getTripScore(trip) {
  const score =
    trip?.finalEcoScore ??
    trip?.ecoScore ??
    trip?.planEcoScore ??
    trip?.score;

  const numericScore =
    Number(score);

  return Number.isFinite(
    numericScore
  )
    ? numericScore
    : 0;
}


function getTripCarbon(trip) {
  const carbon =
    trip?.confirmedTransportationCarbonKg ??
    trip?.carbonKg ??
    trip?.transportationCarbonKg ??
    trip?.carbonSaved ??
    trip?.carbon_saved;

  const numericCarbon =
    Number(carbon);

  return Number.isFinite(
    numericCarbon
  )
    ? numericCarbon
    : 0;
}


function getDestinationCount(trip) {
  const destinations =
    trip?.destinations ??
    trip?.destinationNames ??
    trip?.locations ??
    trip?.destinationList;

  if (
    Array.isArray(destinations)
  ) {
    return destinations.length;
  }

  if (
    typeof destinations === "number"
  ) {
    return destinations;
  }

  return 0;
}


function isCompletedTrip(trip) {
  const status =
    String(
      trip?.status || ""
    ).toLowerCase();

  return (
    status === "completed" ||
    status === "complete" ||
    trip?.completed === true ||
    trip?.isCompleted === true
  );
}


// ============================================================
// GET USER
// ============================================================
//
// Kept for compatibility with older components.
//
// There is NO hardcoded user name or Eco Score here.
// MainDashboard / useCurrentUser should handle user data.
//
// ============================================================

export async function getUser() {
  return {
    name: "",
    ecoScore: 0,
  };
}


// ============================================================
// GET SUMMARY STATS
// ============================================================
//
// Real data:
//
// - Eco Score is handled by MainDashboard's
//   listenToCumulativeEcoScore()
//
// - Trips Completed comes from real itineraries
//
// - Carbon Saved comes from real travel history
//
// - Badges are handled separately by achievementService
//
// ============================================================

export async function getSummaryStats() {
  try {
    const [
      itineraries,
      travelHistory,
    ] = await Promise.all([
      getMyItineraries(),
      getTravelHistory(),
    ]);

    const safeItineraries =
      Array.isArray(itineraries)
        ? itineraries
        : [];

    const safeTravelHistory =
      Array.isArray(travelHistory)
        ? travelHistory
        : [];


    // --------------------------------------------------------
    // COUNT COMPLETED TRIPS
    // --------------------------------------------------------

    const completedTrips =
      safeItineraries.filter(
        isCompletedTrip
      ).length;


    // --------------------------------------------------------
    // CARBON
    // --------------------------------------------------------

    const carbonSaved =
      safeTravelHistory.reduce(
        (total, trip) => {
          const carbon =
            Number(
              trip?.confirmedTransportationCarbonKg ??
              trip?.carbonKg ??
              trip?.transportationCarbonKg ??
              0
            );

          if (
            !Number.isFinite(carbon)
          ) {
            return total;
          }

          return total + carbon;
        },
        0
      );


    // --------------------------------------------------------
    // RETURN DASHBOARD STATS
    // --------------------------------------------------------

    return [
      {
        label: "Eco Score",

        // MainDashboard replaces this
        // with the real cumulative score.
        value: 0,

        note: "Cumulative Eco Score",

        progress: 0,

        sub: "Based on completed trips",
      },

      {
        label: "Carbon Saved",

        value:
          `${carbonSaved.toFixed(1)} kg`,

        sub:
          "From completed trips",

        subColor: "#16a34a",
      },

      {
        label: "Trips Completed",

        value:
          String(completedTrips),

        sub:
          completedTrips === 1
            ? "Completed journey"
            : "Completed journeys",
      },

      {
        label: "Achievements",

        // AchievementService handles
        // the real achievement data.
        value: "0",

        sub:
          "From your achievements",
      },
    ];

  } catch (error) {
    console.error(
      "Failed to load dashboard summary:",
      error
    );

    return [
      {
        label: "Eco Score",
        value: 0,
        note: "Cumulative Eco Score",
        progress: 0,
        sub: "Based on completed trips",
      },

      {
        label: "Carbon Saved",
        value: "0.0 kg",
        sub: "From completed trips",
        subColor: "#16a34a",
      },

      {
        label: "Trips Completed",
        value: "0",
        sub: "Completed journeys",
      },

      {
        label: "Achievements",
        value: "0",
        sub: "From your achievements",
      },
    ];
  }
}


// ============================================================
// GET RECENT TRIPS
// ============================================================
//
// IMPORTANT:
//
// This replaces the old hardcoded ACTIVE_TRIPS.
//
// It gets the CURRENT USER'S real itineraries from Firebase,
// sorts them newest first, and returns only the newest 4.
//
// ============================================================

export async function getRecentTrips() {
  try {
    const itineraries =
      await getMyItineraries();

    if (
      !Array.isArray(itineraries)
    ) {
      return [];
    }


    // --------------------------------------------------------
    // SORT NEWEST FIRST
    // --------------------------------------------------------

    const recentTrips =
      [...itineraries]
        .sort(
          (a, b) => {
            const dateA =
              toMillis(
                a?.createdAt ??
                a?.updatedAt ??
                getStartDate(a)
              );

            const dateB =
              toMillis(
                b?.createdAt ??
                b?.updatedAt ??
                getStartDate(b)
              );

            return dateB - dateA;
          }
        )
        .slice(0, 3);


    // --------------------------------------------------------
    // FORMAT FOR ActiveTripRow
    // --------------------------------------------------------

    return recentTrips.map(
      (trip) => ({
        id:
          trip?.id ||
          trip?.itineraryId ||
          "",

        itineraryId:
          trip?.itineraryId ||
          trip?.id ||
          "",

        title:
          getTripTitle(trip),

        dateRange:
          getDateRange(trip),

        score:
          getTripScore(trip),

        carbonKg:
          getTripCarbon(trip),

        destinations:
          getDestinationCount(trip),

        status:
          trip?.status ||
          "",

        completed:
          isCompletedTrip(trip),

        location:
          trip?.location ||
          trip?.originName ||
          "",

        rawTrip:
          trip,
      })
    );

  } catch (error) {
    console.error(
      "Failed to load recent dashboard trips:",
      error
    );

    return [];
  }
}


// ============================================================
// BACKWARD COMPATIBILITY
// ============================================================
//
// Some older components may still import:
//
// getActiveTrips()
//
// Keep it working while MainDashboard uses:
//
// getRecentTrips()
//
// ============================================================

export const getActiveTrips =
  getRecentTrips;


// ============================================================
// GET FEATURED CHALLENGES
// ============================================================
//
// No hardcoded/mock challenge data.
//
// Keep this function because MainDashboard still imports it.
// Connect it to Firestore later when your challenge collection
// is ready.
//
// ============================================================

export async function getFeaturedChallenges() {
  try {
    const challenges =
      await getAvailableChallenges();

    if (!Array.isArray(challenges)) {
      return [];
    }

    return [...challenges]
      .sort((a, b) => {
        const timeA = toMillis(
          a?.createdAt ??
          a?.startDate ??
          a?.endDate
        );

        const timeB = toMillis(
          b?.createdAt ??
          b?.startDate ??
          b?.endDate
        );

        return timeB - timeA;
      })
      .slice(0, 3);
  } catch (error) {
    console.error(
      "Failed to load featured challenges:",
      error
    );

    return [];
  }
}


// ============================================================
// GET RECENT ACHIEVEMENTS
// ============================================================
//
// No hardcoded/mock achievements.
//
// MainDashboard already listens to the real
// achievementService.
//
// ============================================================

export async function getRecentAchievements() {
  return [];
}