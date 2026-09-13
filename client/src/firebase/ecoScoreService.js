import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { db } from "./config";


// ============================================================
// COMPLETED TRIP CHECK
// ============================================================

function isCompletedTrip(data) {
  const status =
    String(data?.status || "")
      .trim()
      .toLowerCase();

  return (
    status === "completed" ||
    status === "complete" ||
    data?.completed === true ||
    data?.isCompleted === true
  );
}


// ============================================================
// CALCULATE CUMULATIVE ECO SCORE
// ============================================================
//
// Reads all top-level travelHistory records belonging to the
// current user and adds their completed-trip Eco Scores.
//
// Score priority:
// 1. finalEcoScore
// 2. final_eco_score
// 3. ecoScore
// 4. eco_score
// 5. planEcoScore
// 6. plan_eco_score
//
// ============================================================

function calculateCumulativeEcoScore(snapshot) {
  return snapshot.docs.reduce(
    (total, snap) => {
      const trip =
        snap.data() || {};

      const score =
        Number(
          trip.finalEcoScore ??
          trip.final_eco_score ??
          trip.ecoScore ??
          trip.eco_score ??
          trip.planEcoScore ??
          trip.plan_eco_score ??
          0
        );

      if (
        !Number.isFinite(score)
      ) {
        return total;
      }

      // If the document explicitly has a status,
      // only include completed trips.
      const hasExplicitStatus =
        trip?.status !== undefined &&
        trip?.status !== null &&
        String(trip.status).trim() !== "";

      if (
        hasExplicitStatus &&
        !isCompletedTrip(trip)
      ) {
        return total;
      }

      return total + score;
    },
    0
  );
}


// ============================================================
// LISTEN TO CURRENT USER'S CUMULATIVE ECO SCORE
// ============================================================
//
// Usage:
//
// listenToCumulativeEcoScore(
//   uid,
//   (score) => {
//     console.log(score);
//   }
// );
//
// ============================================================

export function listenToCumulativeEcoScore(
  uid,
  callback,
  onError
) {
  // No logged-in user
  if (!uid) {
    callback(0);

    return () => {};
  }


  // ==========================================================
  // TOP-LEVEL TRAVEL HISTORY
  // ==========================================================
  //
  // travelHistory/{itineraryId}
  //
  // We filter by userId so the score only belongs
  // to the currently logged-in user.
  //
  // ==========================================================

  const historyQuery =
    query(
      collection(
        db,
        "travelHistory"
      ),
      where(
        "userId",
        "==",
        uid
      )
    );


  // ==========================================================
  // REALTIME LISTENER
  // ==========================================================

  return onSnapshot(
    historyQuery,

    (snapshot) => {
      const cumulativeScore =
        calculateCumulativeEcoScore(
          snapshot
        );

      callback(
        cumulativeScore
      );
    },

    (error) => {
      console.error(
        "Failed to listen to cumulative Eco Score:",
        error
      );

      callback(0);

      if (onError) {
        onError(error);
      }
    }
  );
}