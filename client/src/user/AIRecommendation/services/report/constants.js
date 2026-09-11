export const SCORE_FORMULA_VERSION = "plan-transport-mean-v1";
export const CARBON_SCOPE = "completed_segments_only";
export const CARBON_VERSION = "prototype-uk-ghg-2026-v1";
export const REPORT_SOURCE = "module2_finish_trip";
export const REPORT_DOCUMENT_ID = "report";
export const REPORT_VERSION = 1;
export const REPORT_STATUS = "Completed";
export const VISIBILITY_PRIVATE = "private";
export const VISIBILITY_PUBLIC = "public";

export const SCORE_COMPLETENESS = {
  PLAN_AND_TRANSPORT: "plan_and_transport",
  TRANSPORT_ONLY: "transport_only",
  NO_COMPLETED_TRANSPORT: "no_completed_transport",
};

// Only completedSegments transportation records enter T, F, and carbon.
// Skipped destinations are excluded from numerator, denominator, and carbon.
export const SCORE_COVERAGE_POLICY = "completed_transport_only";

export const REPORT_FIELD_KEYS = [
  "userId",
  "itineraryId",
  "tripId",
  "sessionId",
  "tripName",
  "originName",
  "destinationNames",
  "startDate",
  "endDate",
  "location",
  "planEcoScore",
  "transportationEcoScore",
  "finalEcoScore",
  "ecoScore",
  "scoreCompleteness",
  "scoreCoveragePolicy",
  "scoreFormulaVersion",
  "confirmedTransportationCarbonKg",
  "carbonScope",
  "carbonVersion",
  "reachedCount",
  "skippedCount",
  "destinationOutcomes",
  "segments",
  "status",
  "visibility",
  "publishedAt",
  "source",
  "version",
  "createdAt",
  "updatedAt",
  "completedAt",
];

export const DESTINATION_OUTCOME_KEYS = [
  "segmentIndex",
  "destinationId",
  "destinationName",
  "outcome",
];

export const SEGMENT_SNAPSHOT_KEYS = [
  "segmentIndex",
  "originName",
  "destinationName",
  "travelMode",
  "distanceMeters",
  "durationSeconds",
  "carbonKgCo2e",
  "prototypeEcoScore",
];
