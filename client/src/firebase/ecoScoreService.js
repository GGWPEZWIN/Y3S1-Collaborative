import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./config";

function isCompletedTrip(data) {
  const status = String(data?.status || "").toLowerCase();
  return (
    status === "completed" ||
    status === "complete" ||
    data?.completed === true ||
    data?.isCompleted === true
  );
}

function calculateCumulativeEcoScore(snapshot) {
  return snapshot.docs.reduce((total, snap) => {
    const trip = snap.data() || {};
    if (!isCompletedTrip(trip)) return total;

    const score = Number(
      trip.finalEcoScore ?? trip.ecoScore ?? trip.planEcoScore ?? 0
    );

    return total + (Number.isFinite(score) ? score : 0);
  }, 0);
}

export function listenToCumulativeEcoScore(uid, callback, onError) {
  if (!uid) {
    callback(0);
    return () => {};
  }

  const historyQuery = query(
    collection(db, "travelHistory"),
    where("userId", "==", uid)
  );

  return onSnapshot(
    historyQuery,
    (snapshot) => callback(calculateCumulativeEcoScore(snapshot)),
    (error) => {
      console.error("Failed to listen to cumulative Eco Score:", error);
      callback(0);
      onError?.(error);
    }
  );
}
