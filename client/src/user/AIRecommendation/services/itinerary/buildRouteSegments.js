import { isRouteableCoordinate } from "./normalizeItinerary.js";

function asStop(id, name, latitude, longitude, day) {
  return {
    id,
    name,
    latitude: isRouteableCoordinate(latitude, longitude) ? latitude : null,
    longitude: isRouteableCoordinate(latitude, longitude) ? longitude : null,
    day: day ?? null,
    routeable: isRouteableCoordinate(latitude, longitude),
  };
}

/**
 * Builds the complete ordered first-to-last segment list without reordering
 * destinations. Invalid hops stay in the list but are not routeable.
 */
export function buildOrderedSegments(itinerary) {
  if (!itinerary?.startLocation || !Array.isArray(itinerary.destinations)) {
    return [];
  }

  const start = asStop(
    itinerary.startLocation.locationId,
    itinerary.startLocation.name,
    itinerary.startLocation.latitude,
    itinerary.startLocation.longitude,
    null
  );

  const stops = [
    start,
    ...itinerary.destinations.map((destination) =>
      asStop(
        destination.destinationId,
        destination.name,
        destination.latitude,
        destination.longitude,
        destination.day
      )
    ),
  ];

  const segments = [];
  for (let index = 0; index < stops.length - 1; index += 1) {
    const origin = stops[index];
    const destination = stops[index + 1];
    const routeable = origin.routeable && destination.routeable;
    segments.push({
      segmentId: `seg-${index + 1}`,
      segmentIndex: index + 1,
      day: destination.day ?? origin.day ?? 1,
      origin: {
        id: origin.id,
        name: origin.name,
        latitude: origin.latitude,
        longitude: origin.longitude,
      },
      destination: {
        id: destination.id,
        name: destination.name,
        latitude: destination.latitude,
        longitude: destination.longitude,
      },
      routeable,
    });
  }

  return segments;
}

export function firstRouteableSegment(segments) {
  if (!Array.isArray(segments)) return null;
  return segments.find((segment) => segment.routeable) || null;
}
