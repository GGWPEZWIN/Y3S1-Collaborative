import assert from "node:assert/strict";
import test from "node:test";
import { leaveNavigationToTransport } from "./leaveNavigation.js";
import {
  buildSkippedSegmentSnapshot,
  planSegmentSkip,
  SEGMENT_SKIP_ERROR,
} from "./segmentSkip.js";
import { planSegmentCompletion, SEGMENT_COMPLETION_ERROR } from "./segmentCompletion.js";
import { skipDialogCopy, skipDialogDismissResult } from "./skipDialog.js";
import {
  createArrivalLatch,
  shouldStartArrivalSave,
} from "./arrivalLatch.js";

const destination = {
  destinationId: "dest-penang",
  name: "Penang",
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

function skipSnapshot(index, extras = {}) {
  return buildSkippedSegmentSnapshot({
    userId: "user-1",
    itineraryId: "itin-1",
    sessionId: "session-1",
    segmentIndex: index,
    destinationId: extras.destinationId || destination.destinationId,
    destinationName: extras.destinationName || destination.name,
  });
}

test("Back to Transport keeps destination and makes no request", () => {
  const result = leaveNavigationToTransport({
    currentSegmentIndex: 1,
    destination,
  });
  assert.equal(result.currentSegmentIndex, 1);
  assert.equal(result.destination, destination);
  assert.equal(result.requestsRoutes, false);
  assert.equal(result.completes, false);
  assert.equal(result.skips, false);
});

test("skip dialog dismiss makes no write or advance", () => {
  const result = skipDialogDismissResult();
  assert.equal(result.writes, false);
  assert.equal(result.advances, false);
  assert.equal(result.requestsRoutes, false);
  assert.equal(result.changesIndex, false);
  const copy = skipDialogCopy({ destinationName: "Penang", isFinalDestination: false });
  assert.equal(copy.title, "Skip this destination?");
  assert.match(copy.body, /haven’t reached Penang/);
  assert.match(skipDialogCopy({ destinationName: "Kuala Lumpur", isFinalDestination: true }).body, /trip summary/);
});

test("successful skip advances exactly one index", () => {
  const snapshot = skipSnapshot(0);
  const result = planSegmentSkip({
    user: { uid: "user-1" },
    lock: lockFor(),
    session: sessionAt(0),
    expectedSegmentIndex: 0,
    snapshot,
    currentDestination: destination,
  });
  assert.equal(result.type, "commit");
  assert.equal(result.sessionUpdate.currentSegmentIndex, 1);
  assert.equal(result.skip.outcome, "skipped");
  assert.equal(Object.prototype.hasOwnProperty.call(result.skip, "carbonKgCo2e"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result.skip, "encodedPolyline"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result.sessionUpdate, "status"), false);
});

test("duplicate skip is idempotent", () => {
  const snapshot = skipSnapshot(0);
  const first = planSegmentSkip({
    user: { uid: "user-1" },
    lock: lockFor(),
    session: sessionAt(0),
    expectedSegmentIndex: 0,
    snapshot,
    currentDestination: destination,
  });
  assert.equal(first.type, "commit");

  const second = planSegmentSkip({
    user: { uid: "user-1" },
    lock: lockFor(),
    session: sessionAt(1),
    expectedSegmentIndex: 0,
    existingSkip: snapshot,
    snapshot,
    currentDestination: destination,
  });
  assert.equal(second.type, "idempotent");
  assert.equal(second.session.currentSegmentIndex, 1);
});

test("opposite outcomes for one index are rejected", () => {
  const snapshot = skipSnapshot(0);
  const skipBlocked = planSegmentSkip({
    user: { uid: "user-1" },
    lock: lockFor(),
    session: sessionAt(0),
    expectedSegmentIndex: 0,
    existingCompletion: {
      userId: "user-1",
      itineraryId: "itin-1",
      sessionId: "session-1",
      segmentId: "segment-0",
      segmentIndex: 0,
    },
    snapshot,
    currentDestination: destination,
  });
  assert.equal(skipBlocked.type, "reject");
  assert.equal(skipBlocked.code, SEGMENT_SKIP_ERROR.OUTCOME_CONFLICT);

  const completeBlocked = planSegmentCompletion({
    user: { uid: "user-1" },
    lock: lockFor(),
    session: sessionAt(0),
    expectedSegmentIndex: 0,
    existingSkip: snapshot,
    snapshot: { userId: "user-1", sessionId: "session-1", itineraryId: "itin-1", segmentIndex: 0, segmentId: "segment-0", source: "google_routes", carbonVersion: "prototype-uk-ghg-2026-v1" },
  });
  assert.equal(completeBlocked.type, "reject");
  assert.equal(completeBlocked.code, SEGMENT_COMPLETION_ERROR.OUTCOME_CONFLICT);
});

test("concurrent arrival and skip cannot both persist", () => {
  const snapshot = skipSnapshot(0);
  const skipWhileCompleteExists = planSegmentSkip({
    user: { uid: "user-1" },
    lock: lockFor(),
    session: sessionAt(0),
    expectedSegmentIndex: 0,
    existingCompletion: {
      userId: "user-1",
      itineraryId: "itin-1",
      sessionId: "session-1",
      segmentId: "segment-0",
      segmentIndex: 0,
    },
    snapshot,
    currentDestination: destination,
  });
  const completeWhileSkipExists = planSegmentCompletion({
    user: { uid: "user-1" },
    lock: lockFor(),
    session: sessionAt(0),
    expectedSegmentIndex: 0,
    existingSkip: snapshot,
    snapshot: { userId: "user-1", sessionId: "session-1", itineraryId: "itin-1", segmentIndex: 0, segmentId: "segment-0", source: "google_routes", carbonVersion: "prototype-uk-ghg-2026-v1" },
  });
  assert.equal(skipWhileCompleteExists.type, "reject");
  assert.equal(completeWhileSkipExists.type, "reject");
  assert.notEqual(skipWhileCompleteExists.type, "commit");
  assert.notEqual(completeWhileSkipExists.type, "commit");
});

test("wrong owner lock or index is rejected", () => {
  const snapshot = skipSnapshot(0);
  assert.equal(
    planSegmentSkip({
      user: { uid: "other" },
      lock: lockFor(),
      session: sessionAt(0),
      expectedSegmentIndex: 0,
      snapshot,
      currentDestination: destination,
    }).code,
    SEGMENT_SKIP_ERROR.SESSION_MISMATCH
  );
  assert.equal(
    planSegmentSkip({
      user: { uid: "user-1" },
      lock: { userId: "user-1", sessionId: "other", itineraryId: "itin-1" },
      session: sessionAt(0),
      expectedSegmentIndex: 0,
      snapshot,
      currentDestination: destination,
    }).code,
    SEGMENT_SKIP_ERROR.SESSION_MISMATCH
  );
  assert.equal(
    planSegmentSkip({
      user: { uid: "user-1" },
      lock: lockFor(),
      session: sessionAt(1),
      expectedSegmentIndex: 0,
      snapshot,
      currentDestination: destination,
    }).code,
    SEGMENT_SKIP_ERROR.SEGMENT_NOT_CURRENT
  );
});

test("failed save plan has no session update", () => {
  const result = planSegmentSkip({
    user: { uid: "user-1" },
    lock: lockFor(),
    session: sessionAt(0),
    expectedSegmentIndex: 0,
    snapshot: skipSnapshot(0),
    currentDestination: { destinationId: "other", name: "Cameron Highlands" },
  });
  assert.equal(result.type, "reject");
  assert.equal(result.code, SEGMENT_SKIP_ERROR.DESTINATION_MISMATCH);
  assert.equal(Object.prototype.hasOwnProperty.call(result, "sessionUpdate"), false);
});

test("GPS arrival latch saves once and ignores a second start", () => {
  const latch = createArrivalLatch({
    sessionId: "session-1",
    segmentIndex: 0,
    destinationId: "dest-penang",
    route: { source: "google_routes", travelMode: "WALK" },
  });
  const guard = {
    sessionId: "session-1",
    currentSegmentIndex: 0,
    destinationId: "dest-penang",
  };
  assert.equal(
    shouldStartArrivalSave({ latch, guard, alreadySaving: false, alreadySaved: false }),
    true
  );
  assert.equal(
    shouldStartArrivalSave({ latch, guard, alreadySaving: true, alreadySaved: false }),
    false
  );
  assert.equal(
    shouldStartArrivalSave({ latch, guard, alreadySaving: false, alreadySaved: true }),
    false
  );
  assert.equal(
    shouldStartArrivalSave({
      latch,
      guard,
      alreadySaving: false,
      alreadySaved: false,
      skipDialogOpen: true,
    }),
    false
  );
  assert.equal(
    shouldStartArrivalSave({
      latch,
      guard,
      alreadySaving: false,
      alreadySaved: false,
      skipInFlight: true,
    }),
    false
  );
});

test("final skip does not finish the trip", () => {
  const result = planSegmentSkip({
    user: { uid: "user-1" },
    lock: lockFor(),
    session: sessionAt(2),
    expectedSegmentIndex: 2,
    snapshot: skipSnapshot(2, { destinationId: "dest-kl", destinationName: "Kuala Lumpur" }),
    currentDestination: { destinationId: "dest-kl", name: "Kuala Lumpur" },
  });
  assert.equal(result.type, "commit");
  assert.equal(result.sessionUpdate.currentSegmentIndex, 3);
  assert.equal(Object.prototype.hasOwnProperty.call(result.sessionUpdate, "status"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result.sessionUpdate, "completedAt"), false);
});
