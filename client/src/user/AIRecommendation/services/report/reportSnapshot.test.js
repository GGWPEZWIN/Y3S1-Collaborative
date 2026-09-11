import assert from "node:assert/strict";
import test from "node:test";
import { CARBON_SCOPE, REPORT_SOURCE, SCORE_FORMULA_VERSION } from "./constants.js";
import { calculateFinishScores } from "./finalScore.js";
import { aggregateConfirmedTransportationCarbon } from "./confirmedCarbon.js";
import { buildEcoReportSnapshot } from "./reportSnapshot.js";

function completions() {
  return [
    {
      segmentIndex: 0,
      originName: "KL Sentral",
      destinationName: "Batu Caves",
      travelMode: "TRANSIT",
      distanceMeters: 13000,
      durationSeconds: 1800,
      carbonKgCo2e: 1.32,
      prototypeEcoScore: 72,
      encodedPolyline: "should-not-copy",
      latitude: 3.14,
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

test("report snapshot keeps route order and allow-listed fields only", () => {
  const records = completions();
  const itinerary = {
    title: "Green Weekend",
    dates: { startDate: "2026-09-01", endDate: "2026-09-03" },
    startLocation: { name: "KL Sentral" },
    destinations: [{ name: "Batu Caves" }, { name: "Penang" }],
    foodWaste: 9,
  };
  const scores = calculateFinishScores({ planEcoScore: 89, completions: records });
  const carbon = aggregateConfirmedTransportationCarbon(records, 2);
  const snapshot = buildEcoReportSnapshot({
    userId: "user-1",
    itineraryId: "itin-1",
    sessionId: "session-1",
    tripName: "Green Weekend",
    itinerary,
    completions: records,
    scores,
    carbon,
    createdAt: "ts-created",
    updatedAt: "ts-updated",
    completedAt: "ts-completed",
  });

  assert.equal(snapshot.originName, "KL Sentral");
  assert.deepEqual(snapshot.destinationNames, ["Batu Caves", "Penang"]);
  assert.equal(snapshot.segments[0].destinationName, "Batu Caves");
  assert.equal(snapshot.segments[1].travelMode, "WALK");
  assert.equal(snapshot.tripId, "itin-1");
  assert.equal(snapshot.sessionId, "session-1");
  assert.equal(snapshot.ecoScore, snapshot.finalEcoScore);
  assert.equal(snapshot.visibility, "private");
  assert.equal(snapshot.publishedAt, null);
  assert.equal(snapshot.source, REPORT_SOURCE);
  assert.equal(snapshot.scoreFormulaVersion, SCORE_FORMULA_VERSION);
  assert.equal(snapshot.carbonScope, CARBON_SCOPE);
  assert.equal(snapshot.confirmedTransportationCarbonKg, 1.32);
  assert.equal(Object.prototype.hasOwnProperty.call(snapshot, "foodWaste"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(snapshot, "breakdown"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(snapshot, "carbonSplit"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(snapshot, "badgesEarned"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(snapshot.segments[0], "encodedPolyline"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(snapshot.segments[0], "latitude"), false);
  assert.equal(snapshot.reachedCount, 2);
  assert.equal(snapshot.skippedCount, 0);
  assert.equal(snapshot.scoreCoveragePolicy, "completed_transport_only");
});

test("legacy fabricated fields are not inherited", () => {
  const records = completions();
  const scores = calculateFinishScores({ planEcoScore: 80, completions: records });
  const carbon = aggregateConfirmedTransportationCarbon(records, 2);
  const snapshot = buildEcoReportSnapshot({
    userId: "user-1",
    itineraryId: "itin-1",
    sessionId: "session-1",
    tripName: "Trip",
    itinerary: { title: "Trip" },
    completions: records,
    scores,
    carbon,
  });
  assert.equal(snapshot.impact, undefined);
  assert.equal(snapshot.carbonKg, undefined);
  assert.equal(snapshot.wasteScore, undefined);
});

test("report builder does not mutate completions or itinerary", () => {
  const records = completions();
  const itinerary = {
    title: "Green Weekend",
    destinations: [{ name: "Batu Caves" }],
  };
  const frozenRecords = records.map((item) => Object.freeze({ ...item }));
  Object.freeze(frozenRecords);
  Object.freeze(itinerary);
  const beforeRecords = JSON.stringify(frozenRecords);
  const beforeItinerary = JSON.stringify(itinerary);
  buildEcoReportSnapshot({
    userId: "user-1",
    itineraryId: "itin-1",
    sessionId: "session-1",
    tripName: "Green Weekend",
    itinerary,
    completions: frozenRecords,
    scores: calculateFinishScores({ planEcoScore: 89, completions: frozenRecords }),
    carbon: aggregateConfirmedTransportationCarbon(frozenRecords, 2),
  });
  assert.equal(JSON.stringify(frozenRecords), beforeRecords);
  assert.equal(JSON.stringify(itinerary), beforeItinerary);
});

test("all-skipped snapshot keeps plan score and null transport values", () => {
  const itinerary = {
    title: "Green Weekend",
    startLocation: { name: "Airport" },
    destinations: [{ name: "Penang" }, { name: "Cameron Highlands" }],
  };
  const scores = calculateFinishScores({ planEcoScore: 89, completions: [] });
  const carbon = aggregateConfirmedTransportationCarbon([], 0);
  const snapshot = buildEcoReportSnapshot({
    userId: "user-1",
    itineraryId: "itin-1",
    sessionId: "session-1",
    tripName: "Green Weekend",
    itinerary,
    completions: [],
    destinationOutcomes: [
      { segmentIndex: 0, destinationId: "d1", destinationName: "Penang", outcome: "skipped" },
      { segmentIndex: 1, destinationId: "d2", destinationName: "Cameron Highlands", outcome: "skipped" },
    ],
    scores,
    carbon,
  });
  assert.equal(snapshot.planEcoScore, 89);
  assert.equal(snapshot.transportationEcoScore, null);
  assert.equal(snapshot.finalEcoScore, null);
  assert.equal(snapshot.confirmedTransportationCarbonKg, null);
  assert.equal(snapshot.reachedCount, 0);
  assert.equal(snapshot.skippedCount, 2);
  assert.equal(snapshot.segments.length, 0);
});
