import { shouldStartArrivalSave } from "./arrivalLatch.js";

export function resolveGpsArrivalWithSkipDialog({
  arrived = false,
  skipInFlight = false,
  hasLatch = false,
} = {}) {
  if (!arrived || skipInFlight) {
    return {
      ignoreArrival: true,
      closeSkipDialog: false,
      createLatch: false,
      showReached: false,
      writes: false,
    };
  }
  return {
    ignoreArrival: false,
    closeSkipDialog: true,
    createLatch: !hasLatch,
    showReached: true,
    writes: false,
  };
}

export function resolveArrivalPersistenceStart({
  reachedScreen = false,
  latch = null,
  alreadySaving = false,
  alreadySaved = false,
  skipInFlight = false,
} = {}) {
  if (!reachedScreen) {
    return { startSave: false };
  }
  return {
    startSave: shouldStartArrivalSave({
      latch,
      guard: latch
        ? {
            sessionId: latch.sessionId,
            currentSegmentIndex: latch.segmentIndex,
            destinationId: latch.destinationId,
          }
        : null,
      alreadySaving,
      alreadySaved,
      skipInFlight,
      skipDialogOpen: false,
    }),
  };
}

export function resolveSkipConfirmAgainstArrival({
  skipInFlight = false,
  completing = false,
  arrivalLatch = null,
  arrivalSaved = false,
} = {}) {
  if (skipInFlight || completing) return { confirmSkip: false };
  if (arrivalLatch && !arrivalSaved) return { confirmSkip: false };
  return { confirmSkip: true };
}

export function resolveArrivalSaveOutcome({ persisted = false } = {}) {
  return {
    advancesProgress: persisted,
    retryable: !persisted,
    keepsLatch: !persisted,
    keepsCurrentDestination: true,
  };
}
