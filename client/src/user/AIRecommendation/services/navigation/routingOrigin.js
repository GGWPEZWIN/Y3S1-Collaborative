import { isRouteableCoordinate } from "../itinerary/normalizeItinerary.js";
import { isUsableGpsAccuracy, isValidGpsFix } from "./coordinates.js";
import { originFromGpsFix } from "./leaveNavigation.js";
import { normalizeCompletedSegmentRecords } from "./segmentCompletion.js";

export function savedStartOrigin(itinerary) {
  const start = itinerary?.startLocation;
  if (isRouteableCoordinate(start?.latitude, start?.longitude)) {
    return {
      latitude: start.latitude,
      longitude: start.longitude,
      source: "itinerary",
      label: start.name || "Saved starting location",
      fallback: true,
    };
  }

  return {
    latitude: null,
    longitude: null,
    source: "itinerary",
    label: "Starting location not provided",
    fallback: true,
  };
}

export function lastReachedDestination({
  segments,
  completions,
  beforeIndex,
} = {}) {
  const ordered = normalizeCompletedSegmentRecords(completions);
  const previous = ordered.filter(
    (record) =>
      Number.isInteger(record.segmentIndex) &&
      Number.isInteger(beforeIndex) &&
      record.segmentIndex < beforeIndex
  );
  if (previous.length === 0) return null;

  const last = previous[previous.length - 1];
  const segment = Array.isArray(segments) ? segments[last.segmentIndex] : null;
  const destination = segment?.destination;
  if (!isRouteableCoordinate(destination?.latitude, destination?.longitude)) {
    return null;
  }

  return {
    latitude: destination.latitude,
    longitude: destination.longitude,
    source: "reached",
    label: destination.name || last.destinationName || "Last reached destination",
    fallback: false,
    segmentIndex: last.segmentIndex,
  };
}

/**
 * Reconstruct the effective routing origin after reload or skip.
 * Never uses a skipped destination as origin just because it is previous in the saved array.
 */
export function reconstructRoutingOrigin({
  itinerary,
  segments,
  completions,
  currentSegmentIndex,
} = {}) {
  const reached = lastReachedDestination({
    segments,
    completions,
    beforeIndex: currentSegmentIndex,
  });
  if (reached) return reached;
  return savedStartOrigin(itinerary);
}

export function usableGpsOrigin(fix) {
  if (!isValidGpsFix(fix) || !isUsableGpsAccuracy(fix.accuracyMeters)) {
    return null;
  }
  return originFromGpsFix(fix);
}

/**
 * After a skip: prefer a valid recent GPS fix, else last reached, else saved start.
 * Does not persist GPS history.
 */
export function originAfterSkip({ lastValidFix = null, reconstructedOrigin = null } = {}) {
  const gpsOrigin = usableGpsOrigin(lastValidFix);
  if (gpsOrigin) {
    return {
      origin: gpsOrigin,
      usedGps: true,
      fallback: false,
    };
  }
  return {
    origin: reconstructedOrigin,
    usedGps: false,
    fallback: Boolean(reconstructedOrigin?.fallback),
  };
}

export function liveDestinationAfterSkip(segments, nextSegmentIndex) {
  if (!Array.isArray(segments)) return null;
  if (!Number.isInteger(nextSegmentIndex) || nextSegmentIndex < 0) return null;
  const segment = segments[nextSegmentIndex];
  if (!segment?.destination) return null;
  return {
    destinationId: segment.destination.id,
    name: segment.destination.name,
    latitude: segment.destination.latitude,
    longitude: segment.destination.longitude,
  };
}
