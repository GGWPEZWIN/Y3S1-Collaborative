import assert from "node:assert/strict";
import test from "node:test";
import { formatCarbonKg, formatCompletionDate, formatScore } from "./reportDisplay.js";
import { buildCompletionSummary } from "./completionSummaryView.js";
import {
  buildCompletedReportView,
  isStaleReport,
  viewContainsFoodWaste,
} from "./completedReportView.js";
import { REPORT_SOURCE } from "./constants.js";
import {
  canBeginFinish,
  nextFinishStatus,
  RECOMMENDATION_SURFACE,
  resolveRecommendationSurface,
} from "./finishFlowState.js";

function itinerary() {
  return {
    title: "Green Weekend",
    ecoScore: 89,
    startLocation: { locationId: "start", name: "KL Sentral" },
    destinations: [{ destinationId: "d1", name: "Batu Caves" }, { destinationId: "d2", name: "Penang" }],
  };
}

function completions() {
  return [
    {
      segmentIndex: 0,
      originName: "KL Sentral",
      destinationName: "Batu Caves",
      travelMode: "TRANSIT",
      distanceMeters: 12000,
      durationSeconds: 1800,
      carbonKgCo2e: 1.32,
      prototypeEcoScore: 72,
    },
    {
      segmentIndex: 1,
      originName: "Batu Caves",
      destinationName: "Penang",
      travelMode: "WALK",
      distanceMeters: 800,
      durationSeconds: 600,
      carbonKgCo2e: 0,
      prototypeEcoScore: 100,
    },
  ];
}

function session() {
  return {
    sessionId: "session-1",
    itineraryId: "itin-1",
    itineraryTitle: "Green Weekend",
    status: "active",
    currentSegmentIndex: 2,
    totalSegments: 2,
  };
}

function module2Report(extras = {}) {
  return {
    source: REPORT_SOURCE,
    itineraryId: "itin-1",
    tripId: "itin-1",
    tripName: "Green Weekend",
    visibility: "private",
    planEcoScore: 89,
    transportationEcoScore: 86,
    finalEcoScore: 88,
    ecoScore: 88,
    confirmedTransportationCarbonKg: 1.32,
    originName: "KL Sentral",
    destinationNames: ["Batu Caves", "Penang"],
    segments: completions(),
    completedAt: "2026-09-10T04:00:00.000Z",
    scoreCompleteness: "plan_and_transport",
    ...extras,
  };
}

test("formatters keep walking carbon 0 and do not coerce malformed values", () => {
  assert.equal(formatCarbonKg(0), "0 kg CO₂e");
  assert.equal(formatCarbonKg(1.32), "1.32 kg CO₂e");
  assert.equal(formatCarbonKg(null), "Unavailable");
  assert.equal(formatCarbonKg("1.32"), "Unavailable");
  assert.equal(formatCarbonKg(Number.NaN), "Unavailable");
  assert.equal(formatCarbonKg(Infinity), "Unavailable");
  assert.equal(formatScore(88), "88");
  assert.equal(formatScore(undefined), "Unavailable");
  assert.equal(formatCompletionDate("not-a-date"), "Unavailable");
});

test("completion summary keeps Module 1 route order and missing plan score", () => {
  const withPlan = buildCompletionSummary({
    itinerary: itinerary(),
    session: session(),
    lock: { sessionId: "session-1", itineraryId: "itin-1" },
    completions: completions(),
  });
  assert.deepEqual(
    withPlan.stops.map((stop) => stop.name),
    ["KL Sentral", "Batu Caves", "Penang"]
  );
  assert.equal(withPlan.finalEcoScore, 88);
  assert.equal(withPlan.confirmedTransportationCarbonKg, 1.32);
  assert.equal(withPlan.canFinish, true);
  assert.equal(withPlan.headingTitle, "All destinations reached");
  assert.equal(Object.prototype.hasOwnProperty.call(withPlan, "foodWaste"), false);
  assert.equal(
    buildCompletionSummary({
      itinerary: itinerary(),
      session: session(),
      lock: { sessionId: "session-1", itineraryId: "itin-1" },
      completions: completions(),
      finishing: true,
    }).canFinish,
    false
  );

  const missingPlan = buildCompletionSummary({
    itinerary: { ...itinerary(), ecoScore: null },
    session: session(),
    lock: { sessionId: "session-1", itineraryId: "itin-1" },
    completions: completions(),
  });
  assert.equal(missingPlan.planEcoScore, null);
  assert.equal(missingPlan.scoreCompleteness, "transport_only");
  assert.match(missingPlan.formulaExplanation, /planning Eco-Score was not available/i);
});

test("mixed and all-skipped summaries stay finishable with accurate copy", () => {
  const mixed = buildCompletionSummary({
    itinerary: itinerary(),
    session: session(),
    lock: { sessionId: "session-1", itineraryId: "itin-1" },
    completions: [completions()[0]],
    skips: [{
      segmentIndex: 1,
      destinationId: "d2",
      destinationName: "Penang",
      outcome: "skipped",
      reason: "user_confirmed",
    }],
  });
  assert.equal(mixed.canFinish, true);
  assert.equal(mixed.reachedCount, 1);
  assert.equal(mixed.skippedCount, 1);
  assert.equal(mixed.headingTitle, "Trip ready to finish");
  assert.notEqual(mixed.headingTitle, "All destinations reached");
  assert.equal(mixed.confirmedTransportationCarbonKg, 1.32);

  const allSkipped = buildCompletionSummary({
    itinerary: itinerary(),
    session: session(),
    lock: { sessionId: "session-1", itineraryId: "itin-1" },
    completions: [],
    skips: [
      { segmentIndex: 0, destinationName: "Batu Caves", outcome: "skipped" },
      { segmentIndex: 1, destinationName: "Penang", outcome: "skipped" },
    ],
  });
  assert.equal(allSkipped.canFinish, true);
  assert.equal(allSkipped.noCompletedTravel, true);
  assert.equal(allSkipped.finalEcoScore, null);
  assert.equal(allSkipped.headingTitle, "Trip summary");
  assert.notEqual(allSkipped.headingTitle, "All destinations reached");
  assert.match(allSkipped.headingSubtitle, /No destinations were reached/);
  assert.match(allSkipped.formulaExplanation, /No completed travel recorded/);
});

test("private and public report views and stale itinerary reports", () => {
  const privateView = buildCompletedReportView(module2Report(), "itin-1");
  assert.equal(privateView.visibility, "private");
  assert.equal(privateView.isPublic, false);
  assert.equal(privateView.destinationCount, 2);
  assert.equal(privateView.reachedCount, 2);
  assert.equal(privateView.skippedCount, 0);
  assert.equal(viewContainsFoodWaste(privateView), false);

  const publicView = buildCompletedReportView(
    module2Report({ visibility: "public" }),
    "itin-1"
  );
  assert.equal(publicView.visibility, "public");

  const missingPlanView = buildCompletedReportView(
    module2Report({
      planEcoScore: null,
      scoreCompleteness: "transport_only",
    }),
    "itin-1"
  );
  assert.match(missingPlanView.formulaExplanation, /planning Eco-Score was not available/i);

  assert.equal(isStaleReport(module2Report(), "itin-2"), true);
  assert.equal(buildCompletedReportView(module2Report(), "itin-2"), null);
  assert.equal(
    JSON.stringify(privateView).toLowerCase().includes("food waste"),
    false
  );
});

test("Finish double-click guard and report precedence over No Active Trip", () => {
  assert.equal(canBeginFinish("idle"), true);
  assert.equal(canBeginFinish("finishing"), false);
  assert.equal(nextFinishStatus("idle", "start"), "finishing");
  assert.equal(nextFinishStatus("finishing", "start"), "finishing");
  assert.equal(nextFinishStatus("finishing", "success"), "completed");

  assert.equal(
    resolveRecommendationSurface({
      finishing: false,
      hasCompletedReport: true,
      tripStatus: "no_active_trip",
      hasItineraryId: true,
    }),
    RECOMMENDATION_SURFACE.COMPLETED_REPORT
  );
  assert.equal(
    resolveRecommendationSurface({
      finishing: true,
      hasCompletedReport: false,
      tripStatus: "no_active_trip",
      hasItineraryId: true,
    }),
    RECOMMENDATION_SURFACE.FINISHING
  );
});

test("report loading takes precedence over Start, and unauthorized does not show Start", () => {
  assert.equal(
    resolveRecommendationSurface({
      finishing: false,
      hasCompletedReport: false,
      tripStatus: "no_active_trip",
      hasItineraryId: true,
      itineraryReady: true,
      reportLoading: true,
    }),
    RECOMMENDATION_SURFACE.LOADING
  );
  assert.equal(
    resolveRecommendationSurface({
      finishing: false,
      hasCompletedReport: false,
      tripStatus: "no_active_trip",
      hasItineraryId: false,
    }),
    RECOMMENDATION_SURFACE.NO_ACTIVE_TRIP
  );
  assert.equal(
    resolveRecommendationSurface({
      finishing: false,
      hasCompletedReport: false,
      tripStatus: "no_active_trip",
      hasItineraryId: true,
      itineraryReady: true,
      reportUnauthorized: true,
    }),
    RECOMMENDATION_SURFACE.REPORT_UNAUTHORIZED
  );
});
