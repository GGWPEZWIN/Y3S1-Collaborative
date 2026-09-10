import { USABLE_GPS_ACCURACY_METERS } from "./constants.js";

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function isValidLatitude(value) {
  return isFiniteNumber(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value) {
  return isFiniteNumber(value) && value >= -180 && value <= 180;
}

export function isValidAccuracyMeters(value) {
  return isFiniteNumber(value) && value >= 0;
}

export function isValidCoordinate(point) {
  if (point == null || typeof point !== "object") return false;
  return isValidLatitude(point.latitude) && isValidLongitude(point.longitude);
}

export function isValidGpsFix(fix) {
  return isValidCoordinate(fix) && isValidAccuracyMeters(fix.accuracyMeters);
}

export function isUsableGpsAccuracy(accuracyMeters) {
  return (
    isValidAccuracyMeters(accuracyMeters) &&
    accuracyMeters <= USABLE_GPS_ACCURACY_METERS
  );
}

export function readGpsFix(position) {
  const coords = position?.coords;
  if (!coords) return null;
  const fix = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracyMeters: coords.accuracy,
  };
  return isValidGpsFix(fix) ? fix : null;
}

export function coordinatesEqual(a, b) {
  return (
    isValidCoordinate(a) &&
    isValidCoordinate(b) &&
    a.latitude === b.latitude &&
    a.longitude === b.longitude
  );
}
