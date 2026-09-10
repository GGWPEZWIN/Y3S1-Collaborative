import { firstRouteableSegment } from "../itinerary/buildRouteSegments.js";
import { isRouteableCoordinate } from "../itinerary/normalizeItinerary.js";

export function liveDestinationForSegment(segments, segmentIndex) {
  if (!Array.isArray(segments)) return null;
  if (!Number.isInteger(segmentIndex) || segmentIndex < 0) return null;
  if (segmentIndex >= segments.length) return null;

  const segment = segments[segmentIndex];
  if (segment?.routeable) {
    return {
      destinationId: segment.destination.id,
      name: segment.destination.name,
      latitude: segment.destination.latitude,
      longitude: segment.destination.longitude,
    };
  }

  if (segmentIndex === 0) {
    const first = firstRouteableSegment(segments);
    if (!first) return null;
    return {
      destinationId: first.destination.id,
      name: first.destination.name,
      latitude: first.destination.latitude,
      longitude: first.destination.longitude,
    };
  }

  return null;
}

export function savedOriginForSegment(itinerary, segments, segmentIndex) {
  if (Array.isArray(segments) && Number.isInteger(segmentIndex) && segmentIndex >= 0) {
    const segment = segments[segmentIndex];
    if (
      segment?.origin &&
      isRouteableCoordinate(segment.origin.latitude, segment.origin.longitude)
    ) {
      return {
        latitude: segment.origin.latitude,
        longitude: segment.origin.longitude,
        source: "itinerary",
        label: segment.origin.name || "Saved origin",
      };
    }
  }

  const start = itinerary?.startLocation;
  if (isRouteableCoordinate(start?.latitude, start?.longitude)) {
    return {
      latitude: start.latitude,
      longitude: start.longitude,
      source: "itinerary",
      label: start.name || "Saved origin",
    };
  }

  return {
    latitude: null,
    longitude: null,
    source: "itinerary",
    label: "Starting location not provided",
  };
}

export function routeStopKind({ stopIndex, currentSegmentIndex, totalSegments, isStart }) {
  if (currentSegmentIndex >= totalSegments) {
    return isStart ? "START" : "COMPLETED";
  }
  if (isStart) {
    return currentSegmentIndex === 0 ? "CURRENT" : "START";
  }
  const destinationIndex = stopIndex - 1;
  if (destinationIndex < currentSegmentIndex) return "COMPLETED";
  if (destinationIndex === currentSegmentIndex) return "NEXT DESTINATION";
  return "UPCOMING";
}
