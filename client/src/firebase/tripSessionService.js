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
import { completedSegmentDocumentId } from "../user/AIRecommendation/services/navigation/constants.js";
import {
  ALLOWED_ROUTE_SOURCE,
  buildCompletedSegmentSnapshot,
  normalizeCompletedSegmentRecords,
  planSegmentCompletion,
  SEGMENT_COMPLETION_ERROR,
} from "../user/AIRecommendation/services/navigation/segmentCompletion.js";
import { REPORT_DOCUMENT_ID } from "../user/AIRecommendation/services/report/constants.js";
import { FINISH_TRIP_ERROR, planFinishTrip } from "../user/AIRecommendation/services/report/finishTripPlan.js";
import { buildEcoReportSnapshot } from "../user/AIRecommendation/services/report/reportSnapshot.js";

/*
 * ============================================================
 * TRIP SESSION SERVICE  —  Module 2 (Phase A)
 * ============================================================
 *
 * Reuses the shared Firebase app from ./config (no new app).
 *
 * Module 1 still owns itinerary planning fields (title, order, destinations,
 * Plan Eco-Score). Finish Trip writes only itinerary completion flags.
 *
 * Module 2 owns:
 *   tripSessions/{sessionId}     — activation history (kept on cancel/complete)
 *   tripSessions/{sessionId}/completedSegments/{segmentId}
 *   activeTripLocks/{uid}        — deterministic one-active-trip lock
 *   users/{uid}/travelHistory/{itineraryId}/ecoReport/report
 * ============================================================
 */

const ITINERARIES = "itineraries";
const TRIP_SESSIONS = "tripSessions";
const ACTIVE_LOCKS = "activeTripLocks";
const COMPLETED_SEGMENTS = "completedSegments";
const USERS = "users";
const TRAVEL_HISTORY = "travelHistory";
const ECO_REPORT = "ecoReport";

export const TRIP_SESSION_ERROR = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  ITINERARY_NOT_FOUND: "ITINERARY_NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  MODULE1_INCOMPLETE: "MODULE1_INCOMPLETE",
  MODULE2_ALREADY_COMPLETE: "MODULE2_ALREADY_COMPLETE",
  TRIP_ALREADY_COMPLETED: "TRIP_ALREADY_COMPLETED",
  NOT_ROUTEABLE: "NOT_ROUTEABLE",
  ACTIVE_TRIP_EXISTS: "ACTIVE_TRIP_EXISTS",
  SESSION_MISMATCH: "SESSION_MISMATCH",
  TRIP_NOT_ACTIVE: "TRIP_NOT_ACTIVE",
  SEGMENT_NOT_CURRENT: "SEGMENT_NOT_CURRENT",
  SEGMENT_SKIP: "SEGMENT_SKIP",
  ALL_SEGMENTS_DONE: "ALL_SEGMENTS_DONE",
  SEGMENTS_INCOMPLETE: "SEGMENTS_INCOMPLETE",
  INVALID_SNAPSHOT: "INVALID_SNAPSHOT",
  REPORT_CONFLICT: "REPORT_CONFLICT",
  REPORT_INCONSISTENT: "REPORT_INCONSISTENT",
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
  if (raw.module2Complete === true) {
    throw new TripSessionError(TRIP_SESSION_ERROR.MODULE2_ALREADY_COMPLETE);
  }
  if (raw.status === "Completed") {
    throw new TripSessionError(TRIP_SESSION_ERROR.TRIP_ALREADY_COMPLETED);
  }

  const { itinerary } = normalizeModule1Itinerary(raw);
  if (!itinerary) {
    throw new TripSessionError(TRIP_SESSION_ERROR.NOT_ROUTEABLE);
  }

  const segments = buildOrderedSegments(itinerary);
  if (segments.length < 1 || !segments.every((segment) => segment.routeable)) {
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
    latestCompletedSegmentId: data.latestCompletedSegmentId ?? null,
  };
}

function asCompletedSegment(segmentId, data) {
  return {
    userId: data.userId,
    itineraryId: data.itineraryId,
    sessionId: data.sessionId,
    segmentId: data.segmentId || segmentId,
    segmentIndex: data.segmentIndex,
    originName: data.originName,
    destinationName: data.destinationName,
    travelMode: data.travelMode,
    distanceMeters: data.distanceMeters ?? null,
    durationSeconds: data.durationSeconds ?? null,
    carbonKgCo2e: data.carbonKgCo2e ?? null,
    prototypeEcoScore: data.prototypeEcoScore ?? null,
    rankingScore: data.rankingScore ?? null,
    source: data.source,
    carbonVersion: data.carbonVersion,
    completedAt: data.completedAt ?? null,
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

/**
 * Live session listener for progress fields such as currentSegmentIndex.
 * Missing or unreadable documents are treated as no session. Firebase error
 * objects are not forwarded to the UI.
 */
export function subscribeTripSession(sessionId, onNext) {
  const id = typeof sessionId === "string" ? sessionId.trim() : "";
  if (!id) {
    onNext(null);
    return () => {};
  }

  return onSnapshot(
    doc(db, TRIP_SESSIONS, id),
    (snap) => {
      if (!snap.exists()) {
        onNext(null);
        return;
      }
      onNext(asSession(snap.id, snap.data()));
    },
    () => {
      onNext(null);
    }
  );
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
 * Live completed-segment records for confirmed transportation carbon.
 * Missing or unreadable collections are treated as none completed.
 */
export function subscribeCompletedSegments(sessionId, onNext) {
  const id = typeof sessionId === "string" ? sessionId.trim() : "";
  if (!id) {
    onNext([]);
    return () => {};
  }

  return onSnapshot(
    collection(db, TRIP_SESSIONS, id, COMPLETED_SEGMENTS),
    (snap) => {
      onNext(
        normalizeCompletedSegmentRecords(
          snap.docs.map((docSnap) => asCompletedSegment(docSnap.id, docSnap.data()))
        )
      );
    },
    () => {
      onNext([]);
    }
  );
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

/**
 * Confirms arrival for the current unfinished segment.
 * Creates tripSessions/{sessionId}/completedSegments/{segmentId} and
 * increments currentSegmentIndex in one transaction.
 * Does not mark the trip completed or release the active lock.
 * Does not store encoded polylines, GPS coordinates, or tokens.
 */
export async function completeCurrentSegment({
  expectedSegmentIndex,
  originName,
  destinationName,
  route,
  rankingScore = null,
}) {
  const user = await getLoggedInUser();

  try {
    return await runTransaction(db, async (transaction) => {
      const lockRef = doc(db, ACTIVE_LOCKS, user.uid);
      const lockSnap = await transaction.get(lockRef);
      if (!lockSnap.exists()) {
        throw new TripSessionError(TRIP_SESSION_ERROR.SESSION_MISMATCH);
      }

      const lock = asLock(lockSnap.data());
      if (lock.userId !== user.uid) {
        throw new TripSessionError(TRIP_SESSION_ERROR.UNAUTHORIZED);
      }

      const sessionRef = doc(db, TRIP_SESSIONS, lock.sessionId);
      const sessionSnap = await transaction.get(sessionRef);
      if (!sessionSnap.exists()) {
        throw new TripSessionError(TRIP_SESSION_ERROR.SESSION_MISMATCH);
      }

      const session = asSession(sessionSnap.id, sessionSnap.data());
      if (lock.itineraryId !== session.itineraryId) {
        throw new TripSessionError(TRIP_SESSION_ERROR.SESSION_MISMATCH);
      }
      if (session.userId !== user.uid) {
        throw new TripSessionError(TRIP_SESSION_ERROR.UNAUTHORIZED);
      }
      const segmentId = completedSegmentDocumentId(expectedSegmentIndex);
      if (!segmentId) {
        throw new TripSessionError(TRIP_SESSION_ERROR.SEGMENT_NOT_CURRENT);
      }

      const completionRef = doc(
        db,
        TRIP_SESSIONS,
        session.sessionId,
        COMPLETED_SEGMENTS,
        segmentId
      );
      const existingSnap = await transaction.get(completionRef);
      const existingCompletion = existingSnap.exists()
        ? asCompletedSegment(existingSnap.id, existingSnap.data())
        : null;

      const snapshot = buildCompletedSegmentSnapshot({
        userId: user.uid,
        itineraryId: session.itineraryId,
        sessionId: session.sessionId,
        segmentIndex: expectedSegmentIndex,
        originName,
        destinationName,
        route,
        rankingScore,
      });

      const plan = planSegmentCompletion({
        user,
        lock,
        session,
        expectedSegmentIndex,
        existingCompletion,
        snapshot,
      });

      if (plan.type === "idempotent") {
        return {
          alreadyCompleted: true,
          sessionId: session.sessionId,
          currentSegmentIndex: plan.session.currentSegmentIndex,
          allDestinationsReached:
            plan.session.currentSegmentIndex >= plan.session.totalSegments,
        };
      }

      if (plan.type !== "commit") {
        const code =
          SEGMENT_COMPLETION_ERROR[plan.code] ||
          TRIP_SESSION_ERROR[plan.code] ||
          plan.code ||
          TRIP_SESSION_ERROR.UNAVAILABLE;
        throw new TripSessionError(code);
      }

      transaction.set(completionRef, {
        userId: plan.completion.userId,
        itineraryId: plan.completion.itineraryId,
        sessionId: plan.completion.sessionId,
        segmentId: plan.completion.segmentId,
        segmentIndex: plan.completion.segmentIndex,
        originName: plan.completion.originName,
        destinationName: plan.completion.destinationName,
        travelMode: plan.completion.travelMode,
        distanceMeters: plan.completion.distanceMeters,
        durationSeconds: plan.completion.durationSeconds,
        carbonKgCo2e: plan.completion.carbonKgCo2e,
        prototypeEcoScore: plan.completion.prototypeEcoScore,
        rankingScore: plan.completion.rankingScore,
        source: ALLOWED_ROUTE_SOURCE,
        carbonVersion: plan.completion.carbonVersion,
        completedAt: serverTimestamp(),
        version: plan.completion.version,
      });
      transaction.update(sessionRef, {
        currentSegmentIndex: plan.sessionUpdate.currentSegmentIndex,
        updatedAt: serverTimestamp(),
        latestCompletedSegmentId: plan.sessionUpdate.latestCompletedSegmentId,
      });

      return {
        alreadyCompleted: false,
        sessionId: session.sessionId,
        currentSegmentIndex: plan.sessionUpdate.currentSegmentIndex,
        allDestinationsReached:
          plan.sessionUpdate.currentSegmentIndex >= session.totalSegments,
      };
    });
  } catch (error) {
    throw mapFirebaseFailure(error);
  }
}

function reportRefFor(uid, itineraryId) {
  return doc(db, USERS, uid, TRAVEL_HISTORY, itineraryId, ECO_REPORT, REPORT_DOCUMENT_ID);
}

function historyRefFor(uid, itineraryId) {
  return doc(db, USERS, uid, TRAVEL_HISTORY, itineraryId);
}

function asExistingReport(snap) {
  if (!snap?.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

function throwFinishPlanError(plan) {
  const code =
    FINISH_TRIP_ERROR[plan.code] ||
    TRIP_SESSION_ERROR[plan.code] ||
    plan.code ||
    TRIP_SESSION_ERROR.UNAVAILABLE;
  throw new TripSessionError(code);
}

/**
 * Completes the signed-in user's trip after every saved hop has a completion
 * record. One transaction writes session completion, itinerary completion
 * flags, travel-history metadata, the private Eco Report, and lock deletion.
 * Does not call Google Routes or change rewards/achievements.
 */
export async function finishTripSession(sessionId) {
  const id = typeof sessionId === "string" ? sessionId.trim() : "";
  if (!id) {
    throw new TripSessionError(TRIP_SESSION_ERROR.SESSION_MISMATCH);
  }

  const user = await getLoggedInUser();

  try {
    return await runTransaction(db, async (transaction) => {
      const lockRef = doc(db, ACTIVE_LOCKS, user.uid);
      const sessionRef = doc(db, TRIP_SESSIONS, id);
      const lockSnap = await transaction.get(lockRef);
      const sessionSnap = await transaction.get(sessionRef);

      if (!sessionSnap.exists()) {
        throw new TripSessionError(TRIP_SESSION_ERROR.SESSION_MISMATCH);
      }

      const session = asSession(sessionSnap.id, sessionSnap.data());
      if (session.userId !== user.uid) {
        throw new TripSessionError(TRIP_SESSION_ERROR.UNAUTHORIZED);
      }

      const itineraryRef = doc(db, ITINERARIES, session.itineraryId);
      const historyRef = historyRefFor(user.uid, session.itineraryId);
      const reportRef = reportRefFor(user.uid, session.itineraryId);
      const itinerarySnap = await transaction.get(itineraryRef);
      const historySnap = await transaction.get(historyRef);
      const reportSnap = await transaction.get(reportRef);
      const lock = lockSnap.exists() ? asLock(lockSnap.data()) : null;
      const itinerary = itinerarySnap.exists()
        ? { id: itinerarySnap.id, ...itinerarySnap.data() }
        : null;
      const existingReport = asExistingReport(reportSnap);

      const completions = [];
      if (session.status === "active" && Number.isInteger(session.totalSegments) && session.totalSegments > 0) {
        for (let index = 0; index < session.totalSegments; index += 1) {
          const segmentId = completedSegmentDocumentId(index);
          if (!segmentId) {
            completions.push(null);
            continue;
          }
          const completionRef = doc(
            db,
            TRIP_SESSIONS,
            session.sessionId,
            COMPLETED_SEGMENTS,
            segmentId
          );
          const completionSnap = await transaction.get(completionRef);
          completions.push(
            completionSnap.exists()
              ? asCompletedSegment(completionSnap.id, completionSnap.data())
              : null
          );
        }
      }

      const plan = planFinishTrip({
        user,
        lock,
        session,
        itinerary,
        completions,
        existingReport,
      });

      if (plan.type === "idempotent") {
        return {
          idempotent: true,
          sessionId: session.sessionId,
          itineraryId: session.itineraryId,
          report: plan.report,
        };
      }

      if (plan.type !== "commit") {
        throwFinishPlanError(plan);
      }

      const snapshot = buildEcoReportSnapshot(plan.snapshotInput);
      if (!snapshot) {
        throw new TripSessionError(TRIP_SESSION_ERROR.INVALID_SNAPSHOT);
      }

      const now = serverTimestamp();
      const report = {
        ...snapshot,
        createdAt: now,
        updatedAt: now,
        completedAt: now,
      };

      transaction.update(sessionRef, {
        status: "completed",
        completedAt: now,
        updatedAt: now,
      });
      transaction.update(itineraryRef, {
        module2Complete: true,
        status: "Completed",
        isCompleted: true,
        completedAt: now,
        updatedAt: now,
      });

      const historyUpdate = {
        ...plan.historyUpdate,
        completedAt: now,
        updatedAt: now,
      };
      if (historySnap.exists()) {
        transaction.update(historyRef, historyUpdate);
      } else {
        transaction.set(historyRef, {
          itineraryId: session.itineraryId,
          title: session.itineraryTitle || itinerary?.title || "",
          name: session.itineraryTitle || itinerary?.title || "",
          ...historyUpdate,
          createdAt: now,
        });
      }

      transaction.set(reportRef, report);
      transaction.delete(lockRef);

      return {
        idempotent: false,
        sessionId: session.sessionId,
        itineraryId: session.itineraryId,
        report: { id: REPORT_DOCUMENT_ID, ...report },
      };
    });
  } catch (error) {
    throw mapFirebaseFailure(error);
  }
}
