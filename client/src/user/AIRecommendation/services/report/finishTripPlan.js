import { completedSegmentDocumentId } from "../navigation/constants.js";
import { aggregateConfirmedTransportationCarbon } from "./confirmedCarbon.js";
import { REPORT_SOURCE } from "./constants.js";
import { calculateFinishScores, isValidScore } from "./finalScore.js";

export const FINISH_TRIP_ERROR = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  UNAUTHORIZED: "UNAUTHORIZED",
  SESSION_MISMATCH: "SESSION_MISMATCH",
  TRIP_NOT_ACTIVE: "TRIP_NOT_ACTIVE",
  ITINERARY_NOT_FOUND: "ITINERARY_NOT_FOUND",
  MODULE1_INCOMPLETE: "MODULE1_INCOMPLETE",
  MODULE2_ALREADY_COMPLETE: "MODULE2_ALREADY_COMPLETE",
  SEGMENTS_INCOMPLETE: "SEGMENTS_INCOMPLETE",
  INVALID_SNAPSHOT: "INVALID_SNAPSHOT",
  REPORT_CONFLICT: "REPORT_CONFLICT",
  REPORT_INCONSISTENT: "REPORT_INCONSISTENT",
};

const TRAVEL_MODES = new Set(["WALK", "TRANSIT", "DRIVE"]);

function reject(code) {
  return { type: "reject", code };
}

function requiredName(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function isPositiveFinite(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonNegativeFinite(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isModule2Report(report) {
  return Boolean(report && report.source === REPORT_SOURCE);
}

function itineraryKey(itinerary) {
  return requiredName(itinerary?.id) || requiredName(itinerary?.itineraryId);
}

function reportMatchesSession(report, user, session) {
  return Boolean(
    report &&
      report.userId === user.uid &&
      report.sessionId === session.sessionId &&
      report.itineraryId === session.itineraryId &&
      report.tripId === session.itineraryId
  );
}

export function alignExpectedCompletions(records, totalSegments) {
  if (!Number.isInteger(totalSegments) || totalSegments < 1) return null;
  if (!Array.isArray(records)) return null;

  const byIndex = new Map();
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (!record || !Number.isInteger(record.segmentIndex) || record.segmentIndex < 0) {
      return null;
    }
    if (byIndex.has(record.segmentIndex)) return null;
    byIndex.set(record.segmentIndex, record);
  }

  if (byIndex.size !== totalSegments) return null;

  const ordered = [];
  for (let segmentIndex = 0; segmentIndex < totalSegments; segmentIndex += 1) {
    if (!byIndex.has(segmentIndex)) return null;
    ordered.push(byIndex.get(segmentIndex));
  }
  return ordered;
}

export function validateCompletionRecord(record, { user, session, expectedIndex }) {
  const expectedId = completedSegmentDocumentId(expectedIndex);
  if (!record || !user?.uid || !session || !expectedId) return false;
  if (record.userId !== user.uid) return false;
  if (record.sessionId !== session.sessionId) return false;
  if (record.itineraryId !== session.itineraryId) return false;
  if (record.segmentIndex !== expectedIndex) return false;
  if (record.segmentId !== expectedId) return false;
  if (!requiredName(record.originName) || !requiredName(record.destinationName)) return false;
  if (!TRAVEL_MODES.has(record.travelMode)) return false;
  if (!isPositiveFinite(record.distanceMeters) || !isPositiveFinite(record.durationSeconds)) {
    return false;
  }
  if (!isNonNegativeFinite(record.carbonKgCo2e)) return false;
  if (!isValidScore(record.prototypeEcoScore)) return false;
  return true;
}

function validateAlignedCompletions(records, { user, session }) {
  const ordered = alignExpectedCompletions(records, session.totalSegments);
  if (!ordered) return { ok: false, code: FINISH_TRIP_ERROR.SEGMENTS_INCOMPLETE };
  for (let index = 0; index < ordered.length; index += 1) {
    if (!validateCompletionRecord(ordered[index], { user, session, expectedIndex: index })) {
      return { ok: false, code: FINISH_TRIP_ERROR.INVALID_SNAPSHOT };
    }
  }
  return { ok: true, records: ordered };
}

export function planFinishTrip({
  user,
  lock = null,
  session,
  itinerary = null,
  completions = [],
  existingReport = null,
} = {}) {
  if (!user?.uid) return reject(FINISH_TRIP_ERROR.AUTH_REQUIRED);
  if (!session || session.userId !== user.uid) {
    return reject(FINISH_TRIP_ERROR.UNAUTHORIZED);
  }

  if (session.status === "completed") {
    if (!isModule2Report(existingReport) || !reportMatchesSession(existingReport, user, session)) {
      return reject(FINISH_TRIP_ERROR.REPORT_INCONSISTENT);
    }
    return { type: "idempotent", report: existingReport };
  }

  if (session.status !== "active") {
    return reject(FINISH_TRIP_ERROR.TRIP_NOT_ACTIVE);
  }

  if (
    !lock ||
    lock.userId !== user.uid ||
    lock.sessionId !== session.sessionId ||
    lock.itineraryId !== session.itineraryId
  ) {
    return reject(FINISH_TRIP_ERROR.SESSION_MISMATCH);
  }

  if (!itinerary) return reject(FINISH_TRIP_ERROR.ITINERARY_NOT_FOUND);
  if (itinerary.userId !== user.uid) return reject(FINISH_TRIP_ERROR.UNAUTHORIZED);
  if (itineraryKey(itinerary) !== session.itineraryId) {
    return reject(FINISH_TRIP_ERROR.SESSION_MISMATCH);
  }
  if (itinerary.module1Complete !== true) {
    return reject(FINISH_TRIP_ERROR.MODULE1_INCOMPLETE);
  }
  if (itinerary.module2Complete === true) {
    return reject(FINISH_TRIP_ERROR.MODULE2_ALREADY_COMPLETE);
  }

  if (
    !Number.isInteger(session.currentSegmentIndex) ||
    !Number.isInteger(session.totalSegments) ||
    session.totalSegments < 1
  ) {
    return reject(FINISH_TRIP_ERROR.SESSION_MISMATCH);
  }
  if (session.currentSegmentIndex !== session.totalSegments) {
    return reject(FINISH_TRIP_ERROR.SEGMENTS_INCOMPLETE);
  }

  const aligned = validateAlignedCompletions(completions, { user, session });
  if (!aligned.ok) return reject(aligned.code);

  const scores = calculateFinishScores({
    planEcoScore: itinerary.ecoScore,
    completions: aligned.records,
  });
  if (!scores.ok) return reject(FINISH_TRIP_ERROR.INVALID_SNAPSHOT);

  const carbon = aggregateConfirmedTransportationCarbon(
    aligned.records,
    session.totalSegments
  );
  if (!carbon.ok) return reject(FINISH_TRIP_ERROR.INVALID_SNAPSHOT);

  if (isModule2Report(existingReport)) {
    if (!reportMatchesSession(existingReport, user, session)) {
      return reject(FINISH_TRIP_ERROR.REPORT_CONFLICT);
    }
    return reject(FINISH_TRIP_ERROR.REPORT_INCONSISTENT);
  }

  return {
    type: "commit",
    scores,
    carbon,
    completions: aligned.records,
    historyUpdate: {
      status: "Completed",
      completed: true,
      isCompleted: true,
      planEcoScore: scores.planEcoScore,
      transportationEcoScore: scores.transportationEcoScore,
      finalEcoScore: scores.finalEcoScore,
      confirmedTransportationCarbonKg: carbon.confirmedTransportationCarbonKg,
      carbonScope: carbon.carbonScope,
    },
    snapshotInput: {
      userId: user.uid,
      itineraryId: session.itineraryId,
      sessionId: session.sessionId,
      tripName: requiredName(session.itineraryTitle) || requiredName(itinerary.title),
      itinerary,
      completions: aligned.records,
      scores,
      carbon,
    },
  };
}
