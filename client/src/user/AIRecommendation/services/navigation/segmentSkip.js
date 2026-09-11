import {
  SKIP_OUTCOME,
  SKIP_REASON_USER_CONFIRMED,
  SKIPPED_SEGMENT_VERSION,
  skippedSegmentDocumentId,
} from "./constants.js";
import { completedSegmentDocumentId } from "./constants.js";

export const SEGMENT_SKIP_ERROR = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  UNAUTHORIZED: "UNAUTHORIZED",
  SESSION_MISMATCH: "SESSION_MISMATCH",
  TRIP_NOT_ACTIVE: "TRIP_NOT_ACTIVE",
  SEGMENT_NOT_CURRENT: "SEGMENT_NOT_CURRENT",
  SEGMENT_SKIP: "SEGMENT_SKIP",
  ALL_SEGMENTS_DONE: "ALL_SEGMENTS_DONE",
  INVALID_SNAPSHOT: "INVALID_SNAPSHOT",
  OUTCOME_CONFLICT: "OUTCOME_CONFLICT",
  DESTINATION_MISMATCH: "DESTINATION_MISMATCH",
  UNAVAILABLE: "UNAVAILABLE",
};

function requiredName(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export function existingSkipMatches({
  existingSkip,
  user,
  session,
  expectedSegmentIndex,
}) {
  const expectedId = skippedSegmentDocumentId(expectedSegmentIndex);
  return Boolean(
    existingSkip &&
      user?.uid &&
      existingSkip.userId === user.uid &&
      existingSkip.sessionId === session.sessionId &&
      existingSkip.itineraryId === session.itineraryId &&
      existingSkip.segmentIndex === expectedSegmentIndex &&
      existingSkip.segmentId === expectedId &&
      existingSkip.outcome === SKIP_OUTCOME
  );
}

export function buildSkippedSegmentSnapshot({
  userId,
  itineraryId,
  sessionId,
  segmentIndex,
  destinationId,
  destinationName,
} = {}) {
  if (typeof userId !== "string" || userId.trim() === "") return null;
  if (typeof itineraryId !== "string" || itineraryId.trim() === "") return null;
  if (typeof sessionId !== "string" || sessionId.trim() === "") return null;
  if (!Number.isInteger(segmentIndex) || segmentIndex < 0) return null;

  const segmentId = skippedSegmentDocumentId(segmentIndex);
  if (!segmentId) return null;

  const destId = requiredName(destinationId);
  const destName = requiredName(destinationName);
  if (!destId || !destName) return null;

  return {
    userId,
    itineraryId,
    sessionId,
    segmentId,
    segmentIndex,
    destinationId: destId,
    destinationName: destName,
    outcome: SKIP_OUTCOME,
    reason: SKIP_REASON_USER_CONFIRMED,
    version: SKIPPED_SEGMENT_VERSION,
  };
}

/**
 * Pure planner for skipping the current unresolved destination.
 * Does not write Firestore, finish the trip, or change Module 1 destinations.
 */
export function planSegmentSkip({
  user,
  lock,
  session,
  expectedSegmentIndex,
  existingSkip = null,
  existingCompletion = null,
  snapshot,
  currentDestination = null,
} = {}) {
  if (!user?.uid) {
    return { type: "reject", code: SEGMENT_SKIP_ERROR.AUTH_REQUIRED };
  }
  if (
    !lock ||
    lock.userId !== user.uid ||
    lock.sessionId !== session?.sessionId ||
    lock.itineraryId !== session?.itineraryId
  ) {
    return { type: "reject", code: SEGMENT_SKIP_ERROR.SESSION_MISMATCH };
  }
  if (!session || session.userId !== user.uid) {
    return { type: "reject", code: SEGMENT_SKIP_ERROR.UNAUTHORIZED };
  }
  if (session.status !== "active") {
    return { type: "reject", code: SEGMENT_SKIP_ERROR.TRIP_NOT_ACTIVE };
  }
  if (
    !Number.isInteger(session.currentSegmentIndex) ||
    !Number.isInteger(session.totalSegments) ||
    session.totalSegments < 1
  ) {
    return { type: "reject", code: SEGMENT_SKIP_ERROR.SESSION_MISMATCH };
  }
  if (session.currentSegmentIndex >= session.totalSegments) {
    return { type: "reject", code: SEGMENT_SKIP_ERROR.ALL_SEGMENTS_DONE };
  }
  if (!Number.isInteger(expectedSegmentIndex) || expectedSegmentIndex < 0) {
    return { type: "reject", code: SEGMENT_SKIP_ERROR.SEGMENT_NOT_CURRENT };
  }
  if (expectedSegmentIndex > session.currentSegmentIndex) {
    return { type: "reject", code: SEGMENT_SKIP_ERROR.SEGMENT_SKIP };
  }

  const matchingSkip = existingSkipMatches({
    existingSkip,
    user,
    session,
    expectedSegmentIndex,
  });

  if (existingSkip && !matchingSkip) {
    return { type: "reject", code: SEGMENT_SKIP_ERROR.SESSION_MISMATCH };
  }

  if (existingCompletion) {
    const expectedCompletionId = completedSegmentDocumentId(expectedSegmentIndex);
    const matchingCompletion = Boolean(
      existingCompletion.userId === user.uid &&
        existingCompletion.sessionId === session.sessionId &&
        existingCompletion.itineraryId === session.itineraryId &&
        existingCompletion.segmentIndex === expectedSegmentIndex &&
        existingCompletion.segmentId === expectedCompletionId
    );
    if (matchingCompletion) {
      return { type: "reject", code: SEGMENT_SKIP_ERROR.OUTCOME_CONFLICT };
    }
    return { type: "reject", code: SEGMENT_SKIP_ERROR.SESSION_MISMATCH };
  }

  if (expectedSegmentIndex !== session.currentSegmentIndex) {
    if (
      matchingSkip &&
      session.currentSegmentIndex >= expectedSegmentIndex + 1
    ) {
      return { type: "idempotent", session };
    }
    return { type: "reject", code: SEGMENT_SKIP_ERROR.SEGMENT_NOT_CURRENT };
  }

  if (matchingSkip) {
    return { type: "reject", code: SEGMENT_SKIP_ERROR.SESSION_MISMATCH };
  }

  if (
    !snapshot ||
    snapshot.userId !== user.uid ||
    snapshot.sessionId !== session.sessionId ||
    snapshot.itineraryId !== session.itineraryId ||
    snapshot.segmentIndex !== expectedSegmentIndex ||
    snapshot.segmentId !== skippedSegmentDocumentId(expectedSegmentIndex) ||
    snapshot.outcome !== SKIP_OUTCOME ||
    snapshot.reason !== SKIP_REASON_USER_CONFIRMED ||
    snapshot.version !== SKIPPED_SEGMENT_VERSION
  ) {
    return { type: "reject", code: SEGMENT_SKIP_ERROR.INVALID_SNAPSHOT };
  }

  const savedDestId = requiredName(currentDestination?.destinationId);
  const savedDestName = requiredName(currentDestination?.name);
  if (
    !savedDestId ||
    !savedDestName ||
    snapshot.destinationId !== savedDestId ||
    snapshot.destinationName !== savedDestName
  ) {
    return { type: "reject", code: SEGMENT_SKIP_ERROR.DESTINATION_MISMATCH };
  }

  const nextIndex = session.currentSegmentIndex + 1;
  if (nextIndex > session.totalSegments) {
    return { type: "reject", code: SEGMENT_SKIP_ERROR.ALL_SEGMENTS_DONE };
  }

  return {
    type: "commit",
    skip: snapshot,
    sessionUpdate: {
      currentSegmentIndex: nextIndex,
    },
  };
}

export function normalizeSkippedSegmentRecords(records) {
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
