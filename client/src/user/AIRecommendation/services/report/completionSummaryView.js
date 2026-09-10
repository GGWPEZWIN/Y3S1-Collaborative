import { aggregateConfirmedTransportationCarbon } from "./confirmedCarbon.js";
import { SCORE_COMPLETENESS } from "./constants.js";
import { calculateFinishScores } from "./finalScore.js";

export const EQUAL_FORMULA_COPY =
  "Final Eco-Score combines the itinerary planning score and completed transportation score equally.";

export const TRANSPORT_ONLY_FORMULA_COPY =
  "A planning Eco-Score was not available, so the Final Eco-Score uses the completed transportation score.";

export function buildRouteStops(itinerary) {
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
    stops.push({
      id: destination.destinationId || `destination-${index}`,
      name,
      kind: "COMPLETED",
    });
  });
  return stops;
}

export function buildCompletionSummary({
  itinerary = null,
  session = null,
  lock = null,
  completions = [],
  finishing = false,
} = {}) {
  const title =
    (typeof itinerary?.title === "string" && itinerary.title.trim()) ||
    session?.itineraryTitle ||
    "Green trip";
  const destinations = Array.isArray(itinerary?.destinations)
    ? itinerary.destinations
    : [];
  const stops = buildRouteStops(itinerary);
  const scores = calculateFinishScores({
    planEcoScore: itinerary?.ecoScore,
    completions,
  });
  const carbon = aggregateConfirmedTransportationCarbon(
    completions,
    session?.totalSegments
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

  return {
    title,
    destinationCount: destinations.length,
    stops,
    planEcoScore: scores.planEcoScore,
    transportationEcoScore: scores.ok ? scores.transportationEcoScore : null,
    finalEcoScore: scores.ok ? scores.finalEcoScore : null,
    scoreCompleteness: scores.scoreCompleteness,
    formulaExplanation:
      scores.scoreCompleteness === SCORE_COMPLETENESS.TRANSPORT_ONLY
        ? TRANSPORT_ONLY_FORMULA_COPY
        : EQUAL_FORMULA_COPY,
    confirmedTransportationCarbonKg: carbon.ok
      ? carbon.confirmedTransportationCarbonKg
      : null,
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
