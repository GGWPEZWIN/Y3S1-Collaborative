import { REPORT_SOURCE, SCORE_COMPLETENESS, VISIBILITY_PUBLIC } from "./constants.js";
import { formulaExplanationFor, SKIPPED_TRAVEL_CARBON_COPY } from "./completionSummaryView.js";

export function isModule2Report(report) {
  return Boolean(report && report.source === REPORT_SOURCE);
}

export function isStaleReport(report, itineraryId) {
  const expected = typeof itineraryId === "string" ? itineraryId.trim() : "";
  if (!report || !expected) return true;
  return report.itineraryId !== expected && report.tripId !== expected;
}

function cloneNames(names) {
  if (!Array.isArray(names)) return [];
  return names
    .map((name) => (typeof name === "string" ? name : null))
    .filter(Boolean);
}

function cloneSegments(segments) {
  if (!Array.isArray(segments)) return [];
  return segments.map((segment) => ({
    segmentIndex: segment?.segmentIndex,
    originName: segment?.originName,
    destinationName: segment?.destinationName,
    travelMode: segment?.travelMode,
    distanceMeters: segment?.distanceMeters,
    durationSeconds: segment?.durationSeconds,
    carbonKgCo2e: segment?.carbonKgCo2e,
    prototypeEcoScore: segment?.prototypeEcoScore,
  }));
}

function cloneOutcomes(outcomes, destinationNames) {
  if (Array.isArray(outcomes) && outcomes.length > 0) {
    return outcomes.map((entry) => ({
      segmentIndex: entry?.segmentIndex,
      destinationId: entry?.destinationId || null,
      destinationName: entry?.destinationName || null,
      outcome: entry?.outcome || "reached",
    }));
  }
  return destinationNames.map((name, index) => ({
    segmentIndex: index,
    destinationId: null,
    destinationName: name,
    outcome: "reached",
  }));
}

export function buildCompletedReportView(report, itineraryId) {
  if (!isModule2Report(report) || isStaleReport(report, itineraryId)) {
    return null;
  }

  const destinationNames = cloneNames(report.destinationNames);
  const segments = cloneSegments(report.segments);
  const destinationOutcomes = cloneOutcomes(report.destinationOutcomes, destinationNames);
  const isPublic = report.visibility === VISIBILITY_PUBLIC;
  const reachedCount = Number.isInteger(report.reachedCount)
    ? report.reachedCount
    : segments.length;
  const skippedCount = Number.isInteger(report.skippedCount)
    ? report.skippedCount
    : Math.max(0, destinationOutcomes.filter((entry) => entry.outcome === "skipped").length);
  const noCompletedTravel =
    report.scoreCompleteness === SCORE_COMPLETENESS.NO_COMPLETED_TRANSPORT ||
    (segments.length === 0 &&
      report.transportationEcoScore == null &&
      report.finalEcoScore == null);

  return {
    title:
      (typeof report.tripName === "string" && report.tripName.trim()) ||
      "Green trip",
    visibility: isPublic ? "public" : "private",
    isPublic,
    planEcoScore: report.planEcoScore ?? null,
    transportationEcoScore: report.transportationEcoScore ?? null,
    finalEcoScore: report.finalEcoScore ?? report.ecoScore ?? null,
    confirmedTransportationCarbonKg: report.confirmedTransportationCarbonKg,
    originName: typeof report.originName === "string" ? report.originName : null,
    destinationNames,
    destinationCount: destinationNames.length,
    reachedCount,
    skippedCount,
    destinationOutcomes,
    segments,
    completedAt: report.completedAt ?? null,
    scoreCompleteness: report.scoreCompleteness,
    scoreCoveragePolicy: report.scoreCoveragePolicy || null,
    formulaExplanation: formulaExplanationFor(report.scoreCompleteness),
    carbonExplanation: SKIPPED_TRAVEL_CARBON_COPY,
    noCompletedTravel,
  };
}

export function viewContainsFoodWaste(view) {
  if (!view || typeof view !== "object") return false;
  return Object.keys(view).some((key) =>
    key.toLowerCase().includes("foodwaste") || key.toLowerCase().includes("food_waste")
  );
}
