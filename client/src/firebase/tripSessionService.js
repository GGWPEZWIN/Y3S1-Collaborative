import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { auth, db } from "./config";
import { buildOrderedSegments } from "../user/AIRecommendation/services/itinerary/buildRouteSegments.js";
import { normalizeModule1Itinerary } from "../user/AIRecommendation/services/itinerary/normalizeItinerary.js";

/*
 * ============================================================
 * TRIP SESSION SERVICE  —  Module 2 (Phase A)
 * ============================================================
 *
 * Reuses the shared Firebase app from ./config (no new app).
 *
 * Module 1 still owns itineraries/{itineraryId}. This service never writes
 * itinerary status or destination order.
 *
 * Module 2 owns:
 *   tripSessions/{sessionId}     — activation history (kept on cancel)
 *   activeTripLocks/{uid}        — deterministic one-active-trip lock
 * ============================================================
 */

const ITINERARIES = "itineraries";
const TRIP_SESSIONS = "tripSessions";
const ACTIVE_LOCKS = "activeTripLocks";

export const TRIP_SESSION_ERROR = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  ITINERARY_NOT_FOUND: "ITINERARY_NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  MODULE1_INCOMPLETE: "MODULE1_INCOMPLETE",
  NOT_ROUTEABLE: "NOT_ROUTEABLE",
  ACTIVE_TRIP_EXISTS: "ACTIVE_TRIP_EXISTS",
  SESSION_MISMATCH: "SESSION_MISMATCH",
  UNAVAILABLE: "UNAVAILABLE",
};

export class TripSessionError extends Error {
  constructor(code, details = null) {
    super(code);
    this.name = "TripSessionError";
    this.code = code;
    this.details = details;
  }
}

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
        if (user) resolve(user);
        else reject(new TripSessionError(TRIP_SESSION_ERROR.AUTH_REQUIRED));
      },
      () => {
        unsubscribe();
        reject(new TripSessionError(TRIP_SESSION_ERROR.AUTH_REQUIRED));
      }
    );
  });
}

function mapFirebaseFailure(error) {
  if (error instanceof TripSessionError) return error;
  const code = typeof error?.code === "string" ? error.code : "";
  if (code === "permission-denied" || code === "unauthenticated") {
    return new TripSessionError(TRIP_SESSION_ERROR.UNAUTHORIZED);
  }
  if (code === "not-found") {
    return new TripSessionError(TRIP_SESSION_ERROR.ITINERARY_NOT_FOUND);
  }
  return new TripSessionError(TRIP_SESSION_ERROR.UNAVAILABLE);
}

function assertOwnedRouteableItinerary(itinerarySnap, uid) {
  if (!itinerarySnap.exists()) {
    throw new TripSessionError(TRIP_SESSION_ERROR.ITINERARY_NOT_FOUND);
  }

  const raw = { id: itinerarySnap.id, ...itinerarySnap.data() };
  if (raw.userId !== uid) {
    throw new TripSessionError(TRIP_SESSION_ERROR.UNAUTHORIZED);
  }
  if (raw.module1Complete !== true) {
    throw new TripSessionError(TRIP_SESSION_ERROR.MODULE1_INCOMPLETE);
  }

  const { itinerary } = normalizeModule1Itinerary(raw);
  if (!itinerary) {
    throw new TripSessionError(TRIP_SESSION_ERROR.NOT_ROUTEABLE);
  }

  const segments = buildOrderedSegments(itinerary);
  const routeableCount = segments.filter((segment) => segment.routeable).length;
  if (routeableCount < 1) {
    throw new TripSessionError(TRIP_SESSION_ERROR.NOT_ROUTEABLE);
  }

  return { itinerary, segments, raw };
}

function asSession(sessionId, data) {
  return {
    sessionId,
    userId: data.userId,
    itineraryId: data.itineraryId,
    itineraryTitle: data.itineraryTitle,
    status: data.status,
    currentSegmentIndex: data.currentSegmentIndex,
    totalSegments: data.totalSegments,
    startedAt: data.startedAt ?? null,
    updatedAt: data.updatedAt ?? null,
    completedAt: data.completedAt ?? null,
    cancelledAt: data.cancelledAt ?? null,
    cancellationReason: data.cancellationReason ?? null,
    version: data.version ?? 1,
  };
}

function asLock(data) {
  return {
    userId: data.userId,
    sessionId: data.sessionId,
    itineraryId: data.itineraryId,
    itineraryTitle: data.itineraryTitle,
    status: data.status,
    startedAt: data.startedAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

/**
 * Live lock listener. A missing document is "no active trip".
 * Permission-denied and unauthenticated are also treated as no active trip,
 * with a warning code as the second callback argument. Firebase error objects
 * are not forwarded to the UI.
 */
export function subscribeActiveTripLock(onNext) {
  let lockUnsub = null;

  const authUnsub = onAuthStateChanged(auth, (user) => {
    if (lockUnsub) {
      lockUnsub();
      lockUnsub = null;
    }

    if (!user) {
      onNext(null);
      return;
    }

    lockUnsub = onSnapshot(
      doc(db, ACTIVE_LOCKS, user.uid),
      (snap) => {
        if (!snap.exists()) {
          onNext(null);
          return;
        }
        onNext(asLock(snap.data()));
      },
      (error) => {
        const code = typeof error?.code === "string" ? error.code : "";
        if (
          code === "permission-denied" ||
          code === "unauthenticated" ||
          code === "not-found"
        ) {
          onNext(null, TRIP_SESSION_ERROR.UNAUTHORIZED);
          return;
        }
        onNext(null, TRIP_SESSION_ERROR.UNAVAILABLE);
      }
    );
  });

  return () => {
    authUnsub();
    if (lockUnsub) lockUnsub();
  };
}

export async function getTripSession(sessionId) {
  if (!sessionId) return null;
  const user = await getLoggedInUser();
  const snap = await getDoc(doc(db, TRIP_SESSIONS, sessionId));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (data.userId !== user.uid) {
    throw new TripSessionError(TRIP_SESSION_ERROR.UNAUTHORIZED);
  }
  return asSession(snap.id, data);
}

/**
 * Starts or resumes the caller's one active trip.
 * Start and cancel always use a single Firestore transaction.
 * Start writes tripSessions/{sessionId} and activeTripLocks/{uid} together.
 * Same-itinerary Start is a read-only resume when the lock and session are active.
 * Locks are never updated; a stale same-itinerary lock is not repaired by writes.
 * userId is taken only from Firebase Auth — never from UI arguments.
 */
export async function startTripSession(itineraryId) {
  const id = typeof itineraryId === "string" ? itineraryId.trim() : "";
  if (!id) {
    throw new TripSessionError(TRIP_SESSION_ERROR.ITINERARY_NOT_FOUND);
  }

  const user = await getLoggedInUser();

  try {
    return await runTransaction(db, async (transaction) => {
      const lockRef = doc(db, ACTIVE_LOCKS, user.uid);
      const itineraryRef = doc(db, ITINERARIES, id);

      const lockSnap = await transaction.get(lockRef);
      const itinerarySnap = await transaction.get(itineraryRef);
      const { itinerary, segments } = assertOwnedRouteableItinerary(
        itinerarySnap,
        user.uid
      );

      if (lockSnap.exists()) {
        const lock = lockSnap.data();
        if (lock.itineraryId !== id) {
          throw new TripSessionError(TRIP_SESSION_ERROR.ACTIVE_TRIP_EXISTS, {
            itineraryId: lock.itineraryId || null,
            itineraryTitle: lock.itineraryTitle || null,
            sessionId: lock.sessionId || null,
          });
        }

        const existingSessionRef = doc(db, TRIP_SESSIONS, lock.sessionId);
        const sessionSnap = await transaction.get(existingSessionRef);
        if (sessionSnap.exists() && sessionSnap.data().status === "active") {
          return {
            resumed: true,
            session: asSession(sessionSnap.id, sessionSnap.data()),
            lock: asLock(lock),
          };
        }

        throw new TripSessionError(TRIP_SESSION_ERROR.UNAVAILABLE);
      }

      const sessionRef = doc(collection(db, TRIP_SESSIONS));
      const now = serverTimestamp();
      const sessionPayload = {
        userId: user.uid,
        itineraryId: id,
        itineraryTitle: itinerary.title,
        status: "active",
        currentSegmentIndex: 0,
        totalSegments: segments.length,
        startedAt: now,
        updatedAt: now,
        completedAt: null,
        cancelledAt: null,
        cancellationReason: null,
        version: 1,
      };
      const lockPayload = {
        userId: user.uid,
        sessionId: sessionRef.id,
        itineraryId: id,
        itineraryTitle: itinerary.title,
        status: "active",
        startedAt: now,
        updatedAt: now,
      };

      transaction.set(sessionRef, sessionPayload);
      transaction.set(lockRef, lockPayload);

      return {
        resumed: false,
        session: asSession(sessionRef.id, sessionPayload),
        lock: asLock(lockPayload),
      };
    });
  } catch (error) {
    throw mapFirebaseFailure(error);
  }
}

/**
 * Cancels the signed-in user's active trip. Keeps the tripSessions document.
 */
export async function cancelActiveTripSession() {
  const user = await getLoggedInUser();

  try {
    return await runTransaction(db, async (transaction) => {
      const lockRef = doc(db, ACTIVE_LOCKS, user.uid);
      const lockSnap = await transaction.get(lockRef);

      if (!lockSnap.exists()) {
        return { alreadyCleared: true };
      }

      const lock = lockSnap.data();
      if (lock.userId !== user.uid) {
        throw new TripSessionError(TRIP_SESSION_ERROR.UNAUTHORIZED);
      }

      const sessionRef = doc(db, TRIP_SESSIONS, lock.sessionId);
      const sessionSnap = await transaction.get(sessionRef);

      if (!sessionSnap.exists()) {
        throw new TripSessionError(TRIP_SESSION_ERROR.SESSION_MISMATCH);
      }

      const session = sessionSnap.data();
      if (session.userId !== user.uid) {
        throw new TripSessionError(TRIP_SESSION_ERROR.UNAUTHORIZED);
      }
      if (session.itineraryId !== lock.itineraryId) {
        throw new TripSessionError(TRIP_SESSION_ERROR.SESSION_MISMATCH);
      }

      if (session.status === "active") {
        transaction.update(sessionRef, {
          status: "cancelled",
          cancelledAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          cancellationReason: "user_cancelled",
        });
        transaction.delete(lockRef);
        return { alreadyCleared: false, sessionId: lock.sessionId };
      }

      if (session.status === "cancelled") {
        transaction.delete(lockRef);
        return { alreadyCleared: false, sessionId: lock.sessionId };
      }

      throw new TripSessionError(TRIP_SESSION_ERROR.SESSION_MISMATCH);
    });
  } catch (error) {
    throw mapFirebaseFailure(error);
  }
}
