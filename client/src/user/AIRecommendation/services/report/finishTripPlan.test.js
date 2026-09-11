import assert from "node:assert/strict";
import test from "node:test";
import { REPORT_SOURCE } from "./constants.js";
import { FINISH_TRIP_ERROR, planFinishTrip } from "./finishTripPlan.js";

function completion(index, extras = {}) {
  return {
    userId: "user-1",
    itineraryId: "itin-1",
    sessionId: "session-1",
    segmentId: `segment-${index}`,
    segmentIndex: index,
    originName: index === 0 ? "Start" : `Stop ${index}`,
    destinationName: `Stop ${index + 1}`,
    travelMode: index === 1 ? "WALK" : "TRANSIT",
    distanceMeters: 1000,
    durationSeconds: 600,
    carbonKgCo2e: index === 1 ? 0 : 0.2,
    prototypeEcoScore: index === 0 ? 72 : 100,
    ...extras,
  };
}

function session(status = "active", extras = {}) {
  return {
    sessionId: "session-1",
    userId: "user-1",
    itineraryId: "itin-1",
    itineraryTitle: "Green Weekend",
    status,
    currentSegmentIndex: 2,
    totalSegments: 2,
    ...extras,
  };
}

function skip(index, extras = {}) {
  return {
    userId: "user-1",
    itineraryId: "itin-1",
    sessionId: "session-1",
    segmentId: `segment-${index}`,
    segmentIndex: index,
    destinationId: `dest-${index}`,
    destinationName: `Stop ${index + 1}`,
    outcome: "skipped",
    reason: "user_confirmed",
    ...extras,
  };
}

function itinerary(extras = {}) {
  return {
    id: "itin-1",
    itineraryId: "itin-1",
    userId: "user-1",
    title: "Green Weekend",
    module1Complete: true,
    module2Complete: false,
    ecoScore: 89,
    destinations: [
      { destinationId: "dest-0", name: "Stop 1" },
      { destinationId: "dest-1", name: "Stop 2" },
    ],
    startLocation: { name: "Start" },
    ...extras,
  };
}

function lock() {
  return { userId: "user-1", sessionId: "session-1", itineraryId: "itin-1" };
}

function module2Report(extras = {}) {
  return {
    id: "report",
    source: REPORT_SOURCE,
    userId: "user-1",
    sessionId: "session-1",
    itineraryId: "itin-1",
    tripId: "itin-1",
    ecoScore: 82,
    ...extras,
  };
}

test("complete valid session is a commit and does not mutate completions", () => {
  const completions = [completion(0), completion(1)];
  Object.freeze(completions);
  const result = planFinishTrip({
    user: { uid: "user-1" },
    lock: lock(),
    session: session(),
    itinerary: itinerary(),
    completions,
    existingReport: { breakdown: [1], carbonSplit: [1], source: "legacy" },
  });
  assert.equal(result.type, "commit");
  assert.equal(result.scores.finalEcoScore, Math.round((89 + (72 + 100) / 2) / 2));
  assert.equal(result.carbon.confirmedTransportationCarbonKg, 0.2);
  assert.equal(completions.length, 2);
});

test("incomplete session is rejected", () => {
  const result = planFinishTrip({
    user: { uid: "user-1" },
    lock: lock(),
    session: session("active", { currentSegmentIndex: 1 }),
    itinerary: itinerary(),
    completions: [completion(0), completion(1)],
  });
  assert.equal(result.type, "reject");
  assert.equal(result.code, FINISH_TRIP_ERROR.SEGMENTS_INCOMPLETE);
});

test("skipped or missing segment is rejected", () => {
  const skipped = planFinishTrip({
    user: { uid: "user-1" },
    lock: lock(),
    session: session(),
    itinerary: itinerary(),
    completions: [completion(0), completion(2)],
  });
  assert.equal(skipped.type, "reject");
  assert.equal(skipped.code, FINISH_TRIP_ERROR.SEGMENTS_INCOMPLETE);

  const missing = planFinishTrip({
    user: { uid: "user-1" },
    lock: lock(),
    session: session(),
    itinerary: itinerary(),
    completions: [completion(0), null],
  });
  assert.equal(missing.type, "reject");
});

test("wrong owner, lock, or itinerary is rejected", () => {
  const completions = [completion(0), completion(1)];
  assert.equal(
    planFinishTrip({
      user: { uid: "other" },
      lock: lock(),
      session: session(),
      itinerary: itinerary(),
      completions,
    }).code,
    FINISH_TRIP_ERROR.UNAUTHORIZED
  );
  assert.equal(
    planFinishTrip({
      user: { uid: "user-1" },
      lock: { userId: "user-1", sessionId: "other", itineraryId: "itin-1" },
      session: session(),
      itinerary: itinerary(),
      completions,
    }).code,
    FINISH_TRIP_ERROR.SESSION_MISMATCH
  );
  assert.equal(
    planFinishTrip({
      user: { uid: "user-1" },
      lock: lock(),
      session: session(),
      itinerary: itinerary({ id: "other", itineraryId: "other" }),
      completions,
    }).code,
    FINISH_TRIP_ERROR.SESSION_MISMATCH
  );
});

test("already completed matching report is idempotent", () => {
  const report = module2Report();
  const result = planFinishTrip({
    user: { uid: "user-1" },
    lock: null,
    session: session("completed"),
    itinerary: itinerary({ module2Complete: true }),
    completions: [],
    existingReport: report,
  });
  assert.equal(result.type, "idempotent");
  assert.equal(result.report, report);
});

test("completed session with missing or mismatched report is inconsistent", () => {
  assert.equal(
    planFinishTrip({
      user: { uid: "user-1" },
      session: session("completed"),
      existingReport: null,
    }).code,
    FINISH_TRIP_ERROR.REPORT_INCONSISTENT
  );
  assert.equal(
    planFinishTrip({
      user: { uid: "user-1" },
      session: session("completed"),
      existingReport: module2Report({ sessionId: "other-session" }),
    }).code,
    FINISH_TRIP_ERROR.REPORT_INCONSISTENT
  );
});

test("legacy stub on an active valid session may be replaced", () => {
  const result = planFinishTrip({
    user: { uid: "user-1" },
    lock: lock(),
    session: session(),
    itinerary: itinerary(),
    completions: [completion(0), completion(1)],
    existingReport: {
      source: undefined,
      breakdown: [{ label: "Waste", value: 80 }],
      carbonSplit: [{ name: "Hotel", value: 1 }],
    },
  });
  assert.equal(result.type, "commit");
});

test("mixed reached and skipped outcomes allow Finish", () => {
  const result = planFinishTrip({
    user: { uid: "user-1" },
    lock: lock(),
    session: session(),
    itinerary: itinerary(),
    completions: [completion(0)],
    skips: [skip(1)],
  });
  assert.equal(result.type, "commit");
  assert.equal(result.completions.length, 1);
  assert.equal(result.skips.length, 1);
  assert.equal(result.scores.transportationEcoScore, 72);
  assert.equal(result.carbon.confirmedTransportationCarbonKg, 0.2);
});

test("all-skipped trip can Finish with null transport and carbon", () => {
  const result = planFinishTrip({
    user: { uid: "user-1" },
    lock: lock(),
    session: session(),
    itinerary: itinerary(),
    completions: [],
    skips: [skip(0), skip(1)],
  });
  assert.equal(result.type, "commit");
  assert.equal(result.scores.planEcoScore, 89);
  assert.equal(result.scores.transportationEcoScore, null);
  assert.equal(result.scores.finalEcoScore, null);
  assert.equal(result.carbon.confirmedTransportationCarbonKg, null);
});

test("corrupted actual completion metrics are rejected", () => {
  const result = planFinishTrip({
    user: { uid: "user-1" },
    lock: lock(),
    session: session(),
    itinerary: itinerary(),
    completions: [completion(0, { carbonKgCo2e: Number.NaN })],
    skips: [skip(1)],
  });
  assert.equal(result.type, "reject");
  assert.equal(result.code, FINISH_TRIP_ERROR.INVALID_SNAPSHOT);
});

test("conflicting outcomes for one index are rejected", () => {
  const result = planFinishTrip({
    user: { uid: "user-1" },
    lock: lock(),
    session: session(),
    itinerary: itinerary(),
    completions: [completion(0), completion(1)],
    skips: [skip(1)],
  });
  assert.equal(result.type, "reject");
  assert.equal(result.code, FINISH_TRIP_ERROR.OUTCOME_CONFLICT);
});

test("conflicting Module 2 report for another session is not overwritten", () => {
  const result = planFinishTrip({
    user: { uid: "user-1" },
    lock: lock(),
    session: session(),
    itinerary: itinerary(),
    completions: [completion(0), completion(1)],
    existingReport: module2Report({ sessionId: "session-old" }),
  });
  assert.equal(result.type, "reject");
  assert.equal(result.code, FINISH_TRIP_ERROR.REPORT_CONFLICT);
});
