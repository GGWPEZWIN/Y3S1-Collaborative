import assert from "node:assert/strict";
import test from "node:test";
import { leaveNavigationPreview } from "./leaveNavigation.js";
import {
  buildCompletedSegmentSnapshot,
  planSegmentCompletion,
  SEGMENT_COMPLETION_ERROR,
  sumCompletedTransportCarbon,
} from "./segmentCompletion.js";

const destination = {
  destinationId: "dest-1",
  name: "Penang",
  latitude: 5.4141,
  longitude: 100.3288,
};

const previousOrigin = {
  latitude: 3.139,
  longitude: 101.6869,
  source: "itinerary",
  label: "KL Sentral",
};

const route = {
  distanceMeters: 1200,
  durationSeconds: 900,
  encodedPolyline: "abc",
  travelMode: "WALK",
  source: "google_routes",
};

function sessionAt(index, extras = {}) {
  return {
    sessionId: "session-1",
    userId: "user-1",
    itineraryId: "itin-1",
    status: "active",
    currentSegmentIndex: index,
    totalSegments: 3,
    ...extras,
  };
}

function lockFor() {
  return { userId: "user-1", sessionId: "session-1", itineraryId: "itin-1" };
}

function snapshotFor(index) {
  return buildCompletedSegmentSnapshot({
    userId: "user-1",
    itineraryId: "itin-1",
    sessionId: "session-1",
    segmentIndex: index,
    originName: "KL Sentral",
    destinationName: "Penang",
    route,
    rankingScore: 82,
  });
}

test("Back/X keeps the same currentSegmentIndex and destination", () => {
  const result = leaveNavigationPreview({
    currentSegmentIndex: 1,
    destination,
    lastValidFix: {
      latitude: 3.15,
      longitude: 101.69,
      accuracyMeters: 20,
    },
    previousOrigin,
  });
  assert.equal(result.currentSegmentIndex, 1);
  assert.equal(result.destination, destination);
  assert.equal(result.originChanged, true);
  assert.equal(result.nextOrigin.source, "device");
});

test("Back/X without a coordinate change keeps the previous origin reusable", () => {
  const result = leaveNavigationPreview({
    currentSegmentIndex: 0,
    destination,
    lastValidFix: {
      latitude: previousOrigin.latitude,
      longitude: previousOrigin.longitude,
      accuracyMeters: 15,
    },
    previousOrigin,
  });
  assert.equal(result.originChanged, false);
  assert.equal(result.currentSegmentIndex, 0);
  assert.equal(result.destination, destination);
});

test("Back/X without GPS keeps the previous origin", () => {
  const result = leaveNavigationPreview({
    currentSegmentIndex: 0,
    destination,
    lastValidFix: null,
    previousOrigin,
  });
  assert.equal(result.currentSegmentIndex, 0);
  assert.equal(result.nextOrigin, previousOrigin);
  assert.equal(result.usedGpsOrigin, false);
});

test("recalculate snapshot keeps mode and destination", () => {
  const snapshot = buildCompletedSegmentSnapshot({
    userId: "user-1",
    itineraryId: "itin-1",
    sessionId: "session-1",
    segmentIndex: 0,
    originName: "Current device location",
    destinationName: destination.name,
    route: { ...route, travelMode: "TRANSIT", distanceMeters: 3400 },
    rankingScore: null,
  });
  assert.equal(snapshot.travelMode, "TRANSIT");
  assert.equal(snapshot.destinationName, "Penang");
  assert.equal(snapshot.rankingScore, null);
  assert.equal(Object.prototype.hasOwnProperty.call(snapshot, "encodedPolyline"), false);
});

test("walking carbon may be confirmed numeric zero and malformed distance is rejected", () => {
  const walking = buildCompletedSegmentSnapshot({
    userId: "user-1",
    itineraryId: "itin-1",
    sessionId: "session-1",
    segmentIndex: 0,
    originName: "KL Sentral",
    destinationName: "Penang",
    route,
    rankingScore: null,
  });
  assert.equal(walking.carbonKgCo2e, 0);
  assert.equal(walking.rankingScore, null);

  const malformed = buildCompletedSegmentSnapshot({
    userId: "user-1",
    itineraryId: "itin-1",
    sessionId: "session-1",
    segmentIndex: 0,
    originName: "KL Sentral",
    destinationName: "Penang",
    route: { ...route, distanceMeters: Number.NaN },
    rankingScore: Number.NaN,
  });
  assert.equal(malformed, null);
});

test("duplicate complete cannot increment twice", () => {
  const snapshot = snapshotFor(0);
  const first = planSegmentCompletion({
    user: { uid: "user-1" },
    lock: lockFor(),
    session: sessionAt(0),
    expectedSegmentIndex: 0,
    snapshot,
  });
  assert.equal(first.type, "commit");
  assert.equal(first.sessionUpdate.currentSegmentIndex, 1);

  const second = planSegmentCompletion({
    user: { uid: "user-1" },
    lock: lockFor(),
    session: sessionAt(1, { latestCompletedSegmentId: "segment-0" }),
    expectedSegmentIndex: 0,
    existingCompletion: snapshot,
    snapshot,
  });
  assert.equal(second.type, "idempotent");
  assert.equal(second.session.currentSegmentIndex, 1);
});

test("wrong segment index is rejected", () => {
  const result = planSegmentCompletion({
    user: { uid: "user-1" },
    lock: lockFor(),
    session: sessionAt(1),
    expectedSegmentIndex: 0,
    snapshot: snapshotFor(0),
  });
  assert.equal(result.type, "reject");
  assert.equal(result.code, SEGMENT_COMPLETION_ERROR.SEGMENT_NOT_CURRENT);
});

test("a segment cannot be skipped", () => {
  const result = planSegmentCompletion({
    user: { uid: "user-1" },
    lock: lockFor(),
    session: sessionAt(0),
    expectedSegmentIndex: 2,
    snapshot: snapshotFor(2),
  });
  assert.equal(result.type, "reject");
  assert.equal(result.code, SEGMENT_COMPLETION_ERROR.SEGMENT_SKIP);
});

test("completion record and session increment are planned together", () => {
  const snapshot = snapshotFor(0);
  const result = planSegmentCompletion({
    user: { uid: "user-1" },
    lock: lockFor(),
    session: sessionAt(0),
    expectedSegmentIndex: 0,
    snapshot,
  });
  assert.equal(result.type, "commit");
  assert.equal(result.completion.segmentId, "segment-0");
  assert.equal(result.sessionUpdate.currentSegmentIndex, 1);
  assert.equal(result.sessionUpdate.latestCompletedSegmentId, "segment-0");
  assert.equal(result.completion.segmentIndex, 0);
});

test("existing active session without a progress-link field remains usable", () => {
  const snapshot = snapshotFor(0);
  const session = sessionAt(0);
  assert.equal(session.latestCompletedSegmentId, undefined);
  const result = planSegmentCompletion({
    user: { uid: "user-1" },
    lock: lockFor(),
    session,
    expectedSegmentIndex: 0,
    snapshot,
  });
  assert.equal(result.type, "commit");
  assert.equal(result.sessionUpdate.latestCompletedSegmentId, "segment-0");
});

test("final segment produces all destinations reached without completing the trip", () => {
  const snapshot = snapshotFor(2);
  const result = planSegmentCompletion({
    user: { uid: "user-1" },
    lock: lockFor(),
    session: sessionAt(2),
    expectedSegmentIndex: 2,
    snapshot,
  });
  assert.equal(result.type, "commit");
  assert.equal(result.sessionUpdate.currentSegmentIndex, 3);
  assert.notEqual(result.sessionUpdate.status, "completed");
  assert.equal(Object.prototype.hasOwnProperty.call(result.sessionUpdate, "status"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result.sessionUpdate, "completedAt"), false);
});

test("lock itinerary mismatch is rejected", () => {
  const result = planSegmentCompletion({
    user: { uid: "user-1" },
    lock: { userId: "user-1", sessionId: "session-1", itineraryId: "other" },
    session: sessionAt(0),
    expectedSegmentIndex: 0,
    snapshot: snapshotFor(0),
  });
  assert.equal(result.type, "reject");
  assert.equal(result.code, SEGMENT_COMPLETION_ERROR.SESSION_MISMATCH);
});

test("existing completion for a different session is rejected", () => {
  const result = planSegmentCompletion({
    user: { uid: "user-1" },
    lock: lockFor(),
    session: sessionAt(0),
    expectedSegmentIndex: 0,
    existingCompletion: {
      ...snapshotFor(0),
      sessionId: "other-session",
    },
    snapshot: snapshotFor(0),
  });
  assert.equal(result.type, "reject");
  assert.equal(result.code, SEGMENT_COMPLETION_ERROR.SESSION_MISMATCH);
});

test("confirmed carbon sums walking zero, skips missing, and does not double-count", () => {
  const empty = sumCompletedTransportCarbon([]);
  assert.equal(empty.empty, true);
  assert.equal(empty.kg, 0);

  const summed = sumCompletedTransportCarbon([
    { segmentIndex: 1, segmentId: "segment-1", carbonKgCo2e: 0.4 },
    { segmentIndex: 0, segmentId: "segment-0", carbonKgCo2e: 0 },
    { segmentIndex: 0, segmentId: "segment-0", carbonKgCo2e: 0 },
    { segmentIndex: 2, segmentId: "segment-2", carbonKgCo2e: null },
  ]);
  assert.equal(summed.empty, false);
  assert.equal(summed.kg, 0.4);
  assert.equal(summed.hasConfirmedCarbon, true);
});
