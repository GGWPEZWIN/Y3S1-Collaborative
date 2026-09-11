export function createArrivalLatch({
  sessionId,
  segmentIndex,
  destinationId,
  route,
  rankingScore = null,
} = {}) {
  if (typeof sessionId !== "string" || sessionId.trim() === "") return null;
  if (!Number.isInteger(segmentIndex) || segmentIndex < 0) return null;
  if (typeof destinationId !== "string" || destinationId.trim() === "") return null;
  if (!route || route.source !== "google_routes") return null;
  return {
    sessionId,
    segmentIndex,
    destinationId,
    route,
    rankingScore,
  };
}

export function arrivalLatchMatches(latch, guard) {
  if (!latch || !guard) return false;
  return (
    latch.sessionId === guard.sessionId &&
    latch.segmentIndex === guard.currentSegmentIndex &&
    latch.destinationId === guard.destinationId
  );
}

export function shouldStartArrivalSave({
  latch,
  guard,
  alreadySaving = false,
  alreadySaved = false,
  skipInFlight = false,
  skipDialogOpen = false,
} = {}) {
  if (!latch || alreadySaving || alreadySaved || skipInFlight) return false;
  if (skipDialogOpen) return false;
  return arrivalLatchMatches(latch, guard);
}

export function invalidateArrivalLatch(latch, { sessionId, segmentIndex, destinationId } = {}) {
  if (!latch) return null;
  if (
    latch.sessionId !== sessionId ||
    latch.segmentIndex !== segmentIndex ||
    latch.destinationId !== destinationId
  ) {
    return null;
  }
  return latch;
}
