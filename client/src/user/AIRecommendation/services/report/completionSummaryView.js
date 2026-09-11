import { aggregateConfirmedTransportationCarbon } from "./confirmedCarbon.js";
import { SCORE_COMPLETENESS } from "./constants.js";
import { calculateFinishScores } from "./finalScore.js";
import { DESTINATION_OUTCOME } from "../navigation/progressOutcomes.js";

export const EQUAL_FORMULA_COPY =
  "Final Eco-Score combines the itinerary planning score and completed transportation score equally.";

export const TRANSPORT_ONLY_FORMULA_COPY =
  "A planning Eco-Score was not available, so the Final Eco-Score uses the completed transportation score.";

export const NO_COMPLETED_TRANSPORT_COPY =
  "No completed travel recorded. Skipped travel is not included in transportation carbon or Eco-Score.";

export const SKIPPED_TRAVEL_CARBON_COPY =
  "Carbon is recorded completed transportation only. Skipped travel is excluded.";

export function formulaExplanationFor(scoreCompleteness) {
  if (scoreCompleteness === SCORE_COMPLETENESS.NO_COMPLETED_TRANSPORT) {
    return NO_COMPLETED_TRANSPORT_COPY;
  }
  if (scoreCompleteness === SCORE_COMPLETENESS.TRANSPORT_ONLY) {
    return TRANSPORT_ONLY_FORMULA_COPY;
  }
  return EQUAL_FORMULA_COPY;
}

export function summaryHeading({ reachedCount, skippedCount, plannedCount }) {
  if (plannedCount > 0 && reachedCount === 0) {
    return {
      chip: "Trip summary",
      title: "Trip summary",
      subtitle: "No destinations were reached",
    };
  }
  if (skippedCount > 0) {
    return {
      chip: "Trip summary",
      title: "Trip ready to finish",
      subtitle: `${reachedCount} reached · ${skippedCount} skipped · ${plannedCount} planned`,
    };
  }
  return {
    chip: "Trip complete",
    title: "All destinations reached",
    subtitle: `${plannedCount} saved destinations completed`,
  };
}

export function buildRouteStops(itinerary, outcomesByIndex = null) {
  const stops = [];
  const startName =
    typeof itinerary?.startLocation?.name === "string"
      ? itinerary.startLocation.name
      : null;
  if (startName) {
    stops.push({
      id: itinerary.startLocation.locationId || "start",
      name: startName,
      kind: "START",
    });
  }
  const destinations = Array.isArray(itinerary?.destinations)
    ? itinerary.destinations
    : [];
  destinations.forEach((destination, index) => {
    const name = typeof destination?.name === "string" ? destination.name : null;
    if (!name) return;
    const outcome = outcomesByIndex?.[index] || null;
    let kind = "REACHED";
    if (outcome === DESTINATION_OUTCOME.SKIPPED) kind = "SKIPPED";
    else if (outcome === DESTINATION_OUTCOME.REACHED) kind = "REACHED";
    stops.push({
      id: destination.destinationId || `destination-${index}`,
      name,
      kind,
    });
  });
  return stops;
}

export function buildCompletionSummary({
  itinerary = null,
  session = null,
  lock = null,
  completions = [],
  skips = [],
  finishing = false,
} = {}) {
  const title =
    (typeof itinerary?.title === "string" && itinerary.title.trim()) ||
    session?.itineraryTitle ||
    "Green trip";
  const destinations = Array.isArray(itinerary?.destinations)
    ? itinerary.destinations
    : [];
  const completedRecords = Array.isArray(completions)
    ? completions.filter(Boolean)
    : [];
  const skipRecords = Array.isArray(skips) ? skips.filter(Boolean) : [];
  const outcomesByIndex = {};
  completedRecords.forEach((record) => {
    if (Number.isInteger(record.segmentIndex)) {
      outcomesByIndex[record.segmentIndex] = DESTINATION_OUTCOME.REACHED;
    }
  });
  skipRecords.forEach((record) => {
    if (Number.isInteger(record.segmentIndex)) {
      outcomesByIndex[record.segmentIndex] = DESTINATION_OUTCOME.SKIPPED;
    }
  });
  const stops = buildRouteStops(itinerary, outcomesByIndex);
  const scores = calculateFinishScores({
    planEcoScore: itinerary?.ecoScore,
    completions: completedRecords,
  });
  const carbon = aggregateConfirmedTransportationCarbon(
    completedRecords,
    completedRecords.length
  );
  const sessionActive = session?.status === "active";
  const lockMatches = Boolean(
    lock &&
      session &&
      lock.sessionId === session.sessionId &&
      lock.itineraryId === session.itineraryId
  );
  const progressComplete = Boolean(
    session &&
      Number.isInteger(session.currentSegmentIndex) &&
      Number.isInteger(session.totalSegments) &&
      session.totalSegments > 0 &&
      session.currentSegmentIndex === session.totalSegments
  );
  const plannedCount = destinations.length || session?.totalSegments || 0;
  const reachedCount = completedRecords.length;
  const skippedCount = skipRecords.length;
  const heading = summaryHeading({ reachedCount, skippedCount, plannedCount });

  return {
    title,
    headingTitle: heading.title,
    headingChip: heading.chip,
    headingSubtitle: heading.subtitle,
    destinationCount: plannedCount,
    reachedCount,
    skippedCount,
    stops,
    planEcoScore: scores.planEcoScore,
    transportationEcoScore: scores.ok ? scores.transportationEcoScore : null,
    finalEcoScore: scores.ok ? scores.finalEcoScore : null,
    scoreCompleteness: scores.scoreCompleteness,
    formulaExplanation: formulaExplanationFor(scores.scoreCompleteness),
    carbonExplanation: SKIPPED_TRAVEL_CARBON_COPY,
    confirmedTransportationCarbonKg: carbon.ok
      ? carbon.confirmedTransportationCarbonKg
      : null,
    noCompletedTravel: scores.scoreCompleteness === SCORE_COMPLETENESS.NO_COMPLETED_TRANSPORT,
    scoresOk: scores.ok,
    carbonOk: carbon.ok,
    canFinish:
      !finishing &&
      sessionActive &&
      lockMatches &&
      progressComplete &&
      scores.ok &&
      carbon.ok,
  };
}
