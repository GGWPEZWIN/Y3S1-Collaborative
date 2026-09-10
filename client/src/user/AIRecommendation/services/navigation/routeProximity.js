import { isValidCoordinate } from "./coordinates.js";
import { haversineDistanceMeters } from "./haversine.js";
import { decodeGooglePolyline } from "./decodePolyline.js";

const METERS_PER_DEGREE_LAT = 111320;

function toLocalMeters(point, origin) {
  const latRad = (origin.latitude * Math.PI) / 180;
  return {
    x: (point.longitude - origin.longitude) * METERS_PER_DEGREE_LAT * Math.cos(latRad),
    y: (point.latitude - origin.latitude) * METERS_PER_DEGREE_LAT,
  };
}

function distancePointToSegmentMeters(point, start, end) {
  const origin = start;
  const p = toLocalMeters(point, origin);
  const a = toLocalMeters(start, origin);
  const b = toLocalMeters(end, origin);
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;

  if (!Number.isFinite(lengthSq)) return null;
  if (lengthSq === 0) return haversineDistanceMeters(point, start);

  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / lengthSq;
  if (!Number.isFinite(t)) return null;
  t = Math.max(0, Math.min(1, t));
  const closest = {
    latitude: start.latitude + (end.latitude - start.latitude) * t,
    longitude: start.longitude + (end.longitude - start.longitude) * t,
  };
  return haversineDistanceMeters(point, closest);
}

export function minDistanceToPolylineMeters(point, polylinePoints) {
  if (!isValidCoordinate(point) || !Array.isArray(polylinePoints) || polylinePoints.length === 0) {
    return null;
  }

  if (polylinePoints.length === 1) {
    return haversineDistanceMeters(point, polylinePoints[0]);
  }

  let minDistance = null;
  for (let index = 0; index < polylinePoints.length - 1; index += 1) {
    const start = polylinePoints[index];
    const end = polylinePoints[index + 1];
    if (!isValidCoordinate(start) || !isValidCoordinate(end)) {
      return null;
    }
    const distance = distancePointToSegmentMeters(point, start, end);
    if (distance == null) return null;
    if (minDistance == null || distance < minDistance) {
      minDistance = distance;
    }
  }
  return minDistance;
}

export function minDistanceToEncodedRouteMeters(point, encodedPolyline) {
  const points = decodeGooglePolyline(encodedPolyline);
  if (!points) return null;
  return minDistanceToPolylineMeters(point, points);
}
