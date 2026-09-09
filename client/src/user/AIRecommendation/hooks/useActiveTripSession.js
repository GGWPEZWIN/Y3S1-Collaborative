import { useEffect, useState } from "react";
import { subscribeActiveTripLock } from "../../../firebase/tripSessionService";

export const ACTIVE_TRIP_STATUS = {
  LOADING: "loading",
  NONE: "no_active_trip",
  ACTIVE_CURRENT: "active_current_itinerary",
  ACTIVE_DIFFERENT: "active_different_itinerary",
};

function classify(lock, currentItineraryId) {
  if (!lock) return ACTIVE_TRIP_STATUS.NONE;
  const currentId =
    typeof currentItineraryId === "string" ? currentItineraryId.trim() : "";
  if (currentId && lock.itineraryId === currentId) {
    return ACTIVE_TRIP_STATUS.ACTIVE_CURRENT;
  }
  return ACTIVE_TRIP_STATUS.ACTIVE_DIFFERENT;
}

export default function useActiveTripSession(currentItineraryId = null) {
  const [lock, setLock] = useState(undefined);
  const [warning, setWarning] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeActiveTripLock((nextLock, nextWarning) => {
      setLock(nextLock);
      setWarning(nextWarning || null);
    });
    return unsubscribe;
  }, []);

  if (lock === undefined) {
    return {
      status: ACTIVE_TRIP_STATUS.LOADING,
      lock: null,
      warning: null,
    };
  }

  return {
    status: classify(lock, currentItineraryId),
    lock,
    warning,
  };
}
