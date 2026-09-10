import { coordinatesEqual, isValidGpsFix } from "./coordinates.js";

export function originFromGpsFix(fix) {
  if (!isValidGpsFix(fix)) return null;
  return {
    latitude: fix.latitude,
    longitude: fix.longitude,
    source: "device",
    label: "Current device location",
  };
}

/**
 * Leaving Navigation Preview never completes a segment or calls Routes.
 * A valid latest GPS fix becomes the in-memory origin for the same unfinished segment.
 */
export function leaveNavigationPreview({
  currentSegmentIndex,
  destination,
  lastValidFix = null,
  previousOrigin = null,
} = {}) {
  const gpsOrigin = originFromGpsFix(lastValidFix);
  const originChanged = Boolean(
    gpsOrigin && previousOrigin && !coordinatesEqual(gpsOrigin, previousOrigin)
  );
  const usedGps = Boolean(gpsOrigin);

  return {
    currentSegmentIndex,
    destination,
    nextOrigin: gpsOrigin || previousOrigin,
    originChanged: usedGps ? originChanged || !previousOrigin : false,
    usedGpsOrigin: usedGps,
    message: usedGps
      ? "Your current location is now the origin for this unfinished segment."
      : "A GPS location was not available. The previous origin is still in use.",
  };
}
