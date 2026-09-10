import { useEffect, useState } from "react";
import {
  subscribeActiveTripLock,
  subscribeTripSession,
} from "../../../firebase/tripSessionService";

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

function readSegmentIndex(session) {
  const value = session?.currentSegmentIndex;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }
  return 0;
}

export default function useActiveTripSession(currentItineraryId = null) {
  const [lock, setLock] = useState(undefined);
  const [warning, setWarning] = useState(null);
  const [session, setSession] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeActiveTripLock((nextLock, nextWarning) => {
      setLock(nextLock);
      setWarning(nextWarning || null);
    });
    return unsubscribe;
  }, []);

  const sessionId = lock?.sessionId || null;

  useEffect(() => {
    if (!sessionId) return undefined;
    return subscribeTripSession(sessionId, (nextSession) => {
      setSession(nextSession);
    });
  }, [sessionId]);

  if (lock === undefined) {
    return {
      status: ACTIVE_TRIP_STATUS.LOADING,
      lock: null,
      session: null,
      currentSegmentIndex: 0,
      warning: null,
    };
  }

  const visibleSession = sessionId ? session : null;

  return {
    status: classify(lock, currentItineraryId),
    lock,
    session: visibleSession,
    currentSegmentIndex: readSegmentIndex(visibleSession),
    warning,
  };
}
