import assert from "node:assert/strict";
import test from "node:test";
import { createArrivalLatch } from "./arrivalLatch.js";
import {
  resolveArrivalPersistenceStart,
  resolveArrivalSaveOutcome,
  resolveGpsArrivalWithSkipDialog,
  resolveSkipConfirmAgainstArrival,
} from "./arrivalSkipOrchestration.js";

const destinationId = "dest-penang";

function latchFor() {
  return createArrivalLatch({
    sessionId: "session-1",
    segmentIndex: 0,
    destinationId,
    route: { source: "google_routes", travelMode: "WALK" },
  });
}

test("unconfirmed Skip dialog is closed and one arrival save starts", () => {
  const openDialog = resolveGpsArrivalWithSkipDialog({
    arrived: true,
    skipInFlight: false,
    hasLatch: false,
  });
  assert.equal(openDialog.ignoreArrival, false);
  assert.equal(openDialog.closeSkipDialog, true);
  assert.equal(openDialog.createLatch, true);
  assert.equal(openDialog.showReached, true);
  assert.equal(openDialog.writes, false);

  const latch = latchFor();
  const firstSave = resolveArrivalPersistenceStart({
    reachedScreen: true,
    latch,
    alreadySaving: false,
    alreadySaved: false,
    skipInFlight: false,
  });
  const secondSave = resolveArrivalPersistenceStart({
    reachedScreen: true,
    latch,
    alreadySaving: true,
    alreadySaved: false,
    skipInFlight: false,
  });
  const afterSave = resolveArrivalPersistenceStart({
    reachedScreen: true,
    latch,
    alreadySaving: false,
    alreadySaved: true,
    skipInFlight: false,
  });
  assert.equal(firstSave.startSave, true);
  assert.equal(secondSave.startSave, false);
  assert.equal(afterSave.startSave, false);
});

test("progress advances only after arrival persistence succeeds", () => {
  assert.deepEqual(resolveArrivalSaveOutcome({ persisted: false }), {
    advancesProgress: false,
    retryable: true,
    keepsLatch: true,
    keepsCurrentDestination: true,
  });
  assert.deepEqual(resolveArrivalSaveOutcome({ persisted: true }), {
    advancesProgress: true,
    retryable: false,
    keepsLatch: false,
    keepsCurrentDestination: true,
  });
});

test("in-flight confirmed skip blocks arrival from creating a second outcome", () => {
  const duringSkip = resolveGpsArrivalWithSkipDialog({
    arrived: true,
    skipInFlight: true,
    hasLatch: false,
  });
  assert.equal(duringSkip.ignoreArrival, true);
  assert.equal(duringSkip.closeSkipDialog, false);
  assert.equal(duringSkip.createLatch, false);
  assert.equal(duringSkip.showReached, false);
  assert.equal(duringSkip.writes, false);

  const skipAlreadyRunning = resolveSkipConfirmAgainstArrival({
    skipInFlight: true,
    completing: false,
    arrivalLatch: null,
    arrivalSaved: false,
  });
  assert.equal(skipAlreadyRunning.confirmSkip, false);

  const arrivalOwnsTheIndex = resolveSkipConfirmAgainstArrival({
    skipInFlight: false,
    completing: false,
    arrivalLatch: latchFor(),
    arrivalSaved: false,
  });
  assert.equal(arrivalOwnsTheIndex.confirmSkip, false);

  const saveWhileSkipping = resolveArrivalPersistenceStart({
    reachedScreen: true,
    latch: latchFor(),
    alreadySaving: false,
    alreadySaved: false,
    skipInFlight: true,
  });
  assert.equal(saveWhileSkipping.startSave, false);
});

test("failed arrival save stays on the same destination and can retry", () => {
  const failed = resolveArrivalSaveOutcome({ persisted: false });
  assert.equal(failed.retryable, true);
  assert.equal(failed.keepsLatch, true);
  assert.equal(failed.keepsCurrentDestination, true);
  assert.equal(failed.advancesProgress, false);

  const retry = resolveArrivalPersistenceStart({
    reachedScreen: true,
    latch: latchFor(),
    alreadySaving: false,
    alreadySaved: false,
    skipInFlight: false,
  });
  assert.equal(retry.startSave, true);
});
