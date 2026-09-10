import { isValidLatitude, isValidLongitude } from "./coordinates.js";

/**
 * Decodes a Google encoded polyline into { latitude, longitude } points.
 * Returns null for malformed input. Does not mutate the encoded string.
 */
export function decodeGooglePolyline(encoded) {
  if (typeof encoded !== "string" || encoded.length === 0) return null;

  const points = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    const latResult = decodeChunk(encoded, index);
    if (!latResult) return null;
    index = latResult.nextIndex;
    latitude += latResult.value;

    const lngResult = decodeChunk(encoded, index);
    if (!lngResult) return null;
    index = lngResult.nextIndex;
    longitude += lngResult.value;

    const point = {
      latitude: latitude / 1e5,
      longitude: longitude / 1e5,
    };
    if (!isValidLatitude(point.latitude) || !isValidLongitude(point.longitude)) {
      return null;
    }
    points.push(point);
  }

  return points.length > 0 ? points : null;
}

function decodeChunk(encoded, startIndex) {
  let result = 0;
  let shift = 0;
  let index = startIndex;

  while (index < encoded.length) {
    const byte = encoded.charCodeAt(index) - 63;
    index += 1;
    if (byte < 0 || byte > 95) return null;
    result |= (byte & 0x1f) << shift;
    shift += 5;
    if (byte < 0x20) {
      const value = result & 1 ? ~(result >> 1) : result >> 1;
      return { value, nextIndex: index };
    }
  }

  return null;
}
