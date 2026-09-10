import {
  CARBON_VERSION,
  REPORT_FIELD_KEYS,
  REPORT_SOURCE,
  REPORT_STATUS,
  REPORT_VERSION,
  SEGMENT_SNAPSHOT_KEYS,
  VISIBILITY_PRIVATE,
} from "./constants.js";

const TRAVEL_MODES = new Set(["WALK", "TRANSIT", "DRIVE"]);

function requiredName(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function cloneDateValue(value) {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  return value;
}

function locationFromItinerary(itinerary) {
  const destinations = Array.isArray(itinerary?.destinations)
    ? itinerary.destinations.map((destination) => requiredName(destination?.name)).filter(Boolean)
    : [];
  if (destinations.length > 0) return destinations.join(" → ");
  return requiredName(itinerary?.startLocation?.name) || "";
}

function datesFromItinerary(itinerary) {
  const nested = itinerary?.dates && typeof itinerary.dates === "object" ? itinerary.dates : null;
  return {
    startDate: cloneDateValue(nested?.startDate ?? itinerary?.startDate),
    endDate: cloneDateValue(nested?.endDate ?? itinerary?.endDate),
  };
}

export function cloneReportSegment(record) {
  if (!record || typeof record !== "object") return null;
  return {
    segmentIndex: record.segmentIndex,
    originName: record.originName,
    destinationName: record.destinationName,
    travelMode: record.travelMode,
    distanceMeters: record.distanceMeters,
    durationSeconds: record.durationSeconds,
    carbonKgCo2e: record.carbonKgCo2e,
    prototypeEcoScore: record.prototypeEcoScore,
  };
}

export function buildEcoReportSnapshot({
  userId,
  itineraryId,
  sessionId,
  tripName,
  itinerary,
  completions,
  scores,
  carbon,
  createdAt = null,
  updatedAt = null,
  completedAt = null,
} = {}) {
  const uid = requiredName(userId);
  const itineraryKey = requiredName(itineraryId);
  const sessionKey = requiredName(sessionId);
  const name = requiredName(tripName) || requiredName(itinerary?.title);
  if (!uid || !itineraryKey || !sessionKey || !name) return null;
  if (!Array.isArray(completions) || completions.length < 1) return null;
  if (!scores?.ok || !carbon?.ok) return null;

  const segments = completions.map((record) => cloneReportSegment(record));
  if (segments.some((segment) => segment == null)) return null;
  if (segments.some((segment) => !TRAVEL_MODES.has(segment.travelMode))) return null;
  if (segments.some((segment) => !requiredName(segment.originName) || !requiredName(segment.destinationName))) {
    return null;
  }

  const originName = requiredName(segments[0].originName);
  const destinationNames = segments.map((segment) => requiredName(segment.destinationName));
  if (!originName || destinationNames.some((destination) => !destination)) return null;

  const dates = datesFromItinerary(itinerary);
  const snapshot = {
    userId: uid,
    itineraryId: itineraryKey,
    tripId: itineraryKey,
    sessionId: sessionKey,
    tripName: name,
    originName,
    destinationNames,
    startDate: dates.startDate,
    endDate: dates.endDate,
    location: locationFromItinerary(itinerary),
    planEcoScore: scores.planEcoScore,
    transportationEcoScore: scores.transportationEcoScore,
    finalEcoScore: scores.finalEcoScore,
    ecoScore: scores.finalEcoScore,
    scoreCompleteness: scores.scoreCompleteness,
    scoreFormulaVersion: scores.scoreFormulaVersion,
    confirmedTransportationCarbonKg: carbon.confirmedTransportationCarbonKg,
    carbonScope: carbon.carbonScope,
    carbonVersion: CARBON_VERSION,
    segments,
    status: REPORT_STATUS,
    visibility: VISIBILITY_PRIVATE,
    publishedAt: null,
    source: REPORT_SOURCE,
    version: REPORT_VERSION,
    createdAt,
    updatedAt,
    completedAt,
  };

  const extraKey = Object.keys(snapshot).find((key) => !REPORT_FIELD_KEYS.includes(key));
  if (extraKey) return null;
  const missingKey = REPORT_FIELD_KEYS.find((key) => !Object.prototype.hasOwnProperty.call(snapshot, key));
  if (missingKey) return null;
  if (segments.some((segment) => Object.keys(segment).some((key) => !SEGMENT_SNAPSHOT_KEYS.includes(key)))) {
    return null;
  }

  return snapshot;
}
