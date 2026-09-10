import { CALCULATION_VERSION } from "../sustainability/carbonCalculator.js";
import { estimateTripSustainability } from "../sustainability/carbonCalculator.js";
import {
  COMPLETED_SEGMENT_VERSION,
  completedSegmentDocumentId,
} from "./constants.js";

export const SEGMENT_COMPLETION_ERROR = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  UNAUTHORIZED: "UNAUTHORIZED",
  SESSION_MISMATCH: "SESSION_MISMATCH",
  TRIP_NOT_ACTIVE: "TRIP_NOT_ACTIVE",
  SEGMENT_NOT_CURRENT: "SEGMENT_NOT_CURRENT",
  SEGMENT_SKIP: "SEGMENT_SKIP",
  ALL_SEGMENTS_DONE: "ALL_SEGMENTS_DONE",
  INVALID_SNAPSHOT: "INVALID_SNAPSHOT",
  UNAVAILABLE: "UNAVAILABLE",
};

export const ALLOWED_ROUTE_SOURCE = "google_routes";

const TRAVEL_MODES = new Set(["WALK", "TRANSIT", "DRIVE"]);

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositiveFinite(value) {
  return isFiniteNumber(value) && value > 0;
}

function requiredName(value) {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function existingCompletionMatches({
  existingCompletion,
  user,
  session,
  expectedSegmentIndex,
}) {
  const expectedId = completedSegmentDocumentId(expectedSegmentIndex);
  return Boolean(
    existingCompletion &&
      user?.uid &&
      existingCompletion.userId === user.uid &&
      existingCompletion.sessionId === session.sessionId &&
      existingCompletion.itineraryId === session.itineraryId &&
      existingCompletion.segmentIndex === expectedSegmentIndex &&
      existingCompletion.segmentId === expectedId
  );
}

export function buildCompletedSegmentSnapshot({
  userId,
  itineraryId,
  sessionId,
  segmentIndex,
  originName,
  destinationName,
  route,
  rankingScore = null,
} = {}) {
  if (typeof userId !== "string" || userId.trim() === "") return null;
  if (typeof itineraryId !== "string" || itineraryId.trim() === "") return null;
  if (typeof sessionId !== "string" || sessionId.trim() === "") return null;
  if (!Number.isInteger(segmentIndex) || segmentIndex < 0) return null;
  if (!TRAVEL_MODES.has(route?.travelMode)) return null;
  if (route.source !== ALLOWED_ROUTE_SOURCE) return null;
  if (!isPositiveFinite(route.distanceMeters)) return null;
  if (!isPositiveFinite(route.durationSeconds)) return null;

  const segmentId = completedSegmentDocumentId(segmentIndex);
  if (!segmentId) return null;

  const origin = requiredName(originName);
  const destination = requiredName(destinationName);
  if (!origin || !destination) return null;

  const estimate = estimateTripSustainability({
    distanceMeters: route.distanceMeters,
    travelMode: route.travelMode,
  });
  if (!estimate || !isFiniteNumber(estimate.carbonKgCo2e)) return null;
  if (estimate.carbonKgCo2e < 0) return null;
  if (
    !isFiniteNumber(estimate.ecoScore) ||
    estimate.ecoScore < 0 ||
    estimate.ecoScore > 100
  ) {
    return null;
  }

  return {
    userId,
    itineraryId,
    sessionId,
    segmentId,
    segmentIndex,
    originName: origin,
    destinationName: destination,
    travelMode: route.travelMode,
    distanceMeters: route.distanceMeters,
    durationSeconds: route.durationSeconds,
    carbonKgCo2e: estimate.carbonKgCo2e,
    prototypeEcoScore: estimate.ecoScore,
    rankingScore:
      rankingScore == null || !isFiniteNumber(rankingScore) || rankingScore < 0 || rankingScore > 100
        ? null
        : rankingScore,
    source: ALLOWED_ROUTE_SOURCE,
    carbonVersion: CALCULATION_VERSION,
    version: COMPLETED_SEGMENT_VERSION,
  };
}

/**
 * Pure planner for the completion transaction. Does not write Firestore.
 * Existing sessions without latestCompletedSegmentId remain usable.
 */
export function planSegmentCompletion({
  user,
  lock,
  session,
  expectedSegmentIndex,
  existingCompletion = null,
  snapshot,
} = {}) {
  if (!user?.uid) {
    return { type: "reject", code: SEGMENT_COMPLETION_ERROR.AUTH_REQUIRED };
  }
  if (
    !lock ||
    lock.userId !== user.uid ||
    lock.sessionId !== session?.sessionId ||
    lock.itineraryId !== session?.itineraryId
  ) {
    return { type: "reject", code: SEGMENT_COMPLETION_ERROR.SESSION_MISMATCH };
  }
  if (!session || session.userId !== user.uid) {
    return { type: "reject", code: SEGMENT_COMPLETION_ERROR.UNAUTHORIZED };
  }
  if (session.status !== "active") {
    return { type: "reject", code: SEGMENT_COMPLETION_ERROR.TRIP_NOT_ACTIVE };
  }
  if (
    !Number.isInteger(session.currentSegmentIndex) ||
    !Number.isInteger(session.totalSegments) ||
    session.totalSegments < 1
  ) {
    return { type: "reject", code: SEGMENT_COMPLETION_ERROR.SESSION_MISMATCH };
  }
  if (session.currentSegmentIndex >= session.totalSegments) {
    return { type: "reject", code: SEGMENT_COMPLETION_ERROR.ALL_SEGMENTS_DONE };
  }
  if (!Number.isInteger(expectedSegmentIndex) || expectedSegmentIndex < 0) {
    return { type: "reject", code: SEGMENT_COMPLETION_ERROR.SEGMENT_NOT_CURRENT };
  }
  if (expectedSegmentIndex > session.currentSegmentIndex) {
    return { type: "reject", code: SEGMENT_COMPLETION_ERROR.SEGMENT_SKIP };
  }

  const matchingExisting = existingCompletionMatches({
    existingCompletion,
    user,
    session,
    expectedSegmentIndex,
  });

  if (existingCompletion && !matchingExisting) {
    return { type: "reject", code: SEGMENT_COMPLETION_ERROR.SESSION_MISMATCH };
  }

  if (expectedSegmentIndex !== session.currentSegmentIndex) {
    if (
      matchingExisting &&
      session.currentSegmentIndex >= expectedSegmentIndex + 1
    ) {
      return { type: "idempotent", session };
    }
    return { type: "reject", code: SEGMENT_COMPLETION_ERROR.SEGMENT_NOT_CURRENT };
  }

  if (matchingExisting) {
    return { type: "reject", code: SEGMENT_COMPLETION_ERROR.SESSION_MISMATCH };
  }

  if (
    !snapshot ||
    snapshot.userId !== user.uid ||
    snapshot.sessionId !== session.sessionId ||
    snapshot.itineraryId === undefined ||
    snapshot.itineraryId !== session.itineraryId ||
    snapshot.segmentIndex !== expectedSegmentIndex ||
    snapshot.segmentId !== completedSegmentDocumentId(expectedSegmentIndex) ||
    snapshot.source !== ALLOWED_ROUTE_SOURCE ||
    snapshot.carbonVersion !== CALCULATION_VERSION
  ) {
    return { type: "reject", code: SEGMENT_COMPLETION_ERROR.INVALID_SNAPSHOT };
  }

  const nextIndex = session.currentSegmentIndex + 1;
  if (nextIndex > session.totalSegments) {
    return { type: "reject", code: SEGMENT_COMPLETION_ERROR.ALL_SEGMENTS_DONE };
  }

  return {
    type: "commit",
    completion: snapshot,
    sessionUpdate: {
      currentSegmentIndex: nextIndex,
      latestCompletedSegmentId: snapshot.segmentId,
    },
  };
}

export function normalizeCompletedSegmentRecords(records) {
  if (!Array.isArray(records) || records.length === 0) return [];
  const unique = new Map();
  records.forEach((record) => {
    if (!Number.isInteger(record?.segmentIndex) || record.segmentIndex < 0) {
      return;
    }
    if (!unique.has(record.segmentIndex)) {
      unique.set(record.segmentIndex, record);
    }
  });
  return [...unique.keys()]
    .sort((left, right) => left - right)
    .map((index) => unique.get(index));
}

export function sumCompletedTransportCarbon(records) {
  const ordered = normalizeCompletedSegmentRecords(records);
  if (ordered.length === 0) {
    return { kg: 0, empty: true, hasConfirmedCarbon: false };
  }

  let sum = 0;
  let counted = false;
  ordered.forEach((record) => {
    if (isFiniteNumber(record?.carbonKgCo2e)) {
      sum += record.carbonKgCo2e;
      counted = true;
    }
  });

  return {
    kg: counted ? sum : 0,
    empty: false,
    hasConfirmedCarbon: counted,
  };
}
