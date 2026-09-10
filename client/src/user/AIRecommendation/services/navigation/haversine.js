import { isValidCoordinate } from "./coordinates.js";

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Great-circle distance in metres. Returns null for invalid coordinates.
 * Does not coerce invalid measurements to zero.
 */
export function haversineDistanceMeters(a, b) {
  if (!isValidCoordinate(a) || !isValidCoordinate(b)) return null;

  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLng = toRadians(b.longitude - a.longitude);
  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
  const distance = EARTH_RADIUS_METERS * c;
  return Number.isFinite(distance) ? distance : null;
}
