import { useEffect, useState } from "react";
import {
  subscribeActiveTripLock,
  subscribeCompletedSegments,
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
  const [completedSegments, setCompletedSegments] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeActiveTripLock((nextLock, nextWarning) => {
      setLock(nextLock);
      setWarning(nextWarning || null);
    });
    return unsubscribe;
  }, []);

  const sessionId = lock?.sessionId || null;

  useEffect(() => {
    if (!sessionId) {
      return undefined;
    }
    return subscribeTripSession(sessionId, (nextSession) => {
      setSession(nextSession);
    });
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      return undefined;
    }
    return subscribeCompletedSegments(sessionId, (records) => {
      setCompletedSegments(Array.isArray(records) ? records : []);
    });
  }, [sessionId]);

  if (lock === undefined) {
    return {
      status: ACTIVE_TRIP_STATUS.LOADING,
      lock: null,
      session: null,
      currentSegmentIndex: 0,
      completedSegments: [],
      warning: null,
    };
  }

  const visibleSession = sessionId ? session : null;

  return {
    status: classify(lock, currentItineraryId),
    lock,
    session: visibleSession,
    currentSegmentIndex: readSegmentIndex(visibleSession),
    completedSegments: sessionId ? completedSegments : [],
    warning,
  };
}
