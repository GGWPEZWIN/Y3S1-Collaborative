import { REPORT_SOURCE, SCORE_COMPLETENESS, VISIBILITY_PUBLIC } from "./constants.js";
import { EQUAL_FORMULA_COPY, TRANSPORT_ONLY_FORMULA_COPY } from "./completionSummaryView.js";

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

export function buildCompletedReportView(report, itineraryId) {
  if (!isModule2Report(report) || isStaleReport(report, itineraryId)) {
    return null;
  }

  const destinationNames = cloneNames(report.destinationNames);
  const segments = cloneSegments(report.segments);
  const isPublic = report.visibility === VISIBILITY_PUBLIC;

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
    segments,
    completedAt: report.completedAt ?? null,
    scoreCompleteness: report.scoreCompleteness,
    formulaExplanation:
      report.scoreCompleteness === SCORE_COMPLETENESS.TRANSPORT_ONLY
        ? TRANSPORT_ONLY_FORMULA_COPY
        : EQUAL_FORMULA_COPY,
  };
}

export function viewContainsFoodWaste(view) {
  if (!view || typeof view !== "object") return false;
  return Object.keys(view).some((key) =>
    key.toLowerCase().includes("foodwaste") || key.toLowerCase().includes("food_waste")
  );
}
