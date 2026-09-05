export const ROUTES_CLIENT_ERROR = {
  INVALID_ROUTE_REQUEST: "INVALID_ROUTE_REQUEST",
  ROUTES_NOT_CONFIGURED: "ROUTES_NOT_CONFIGURED",
  ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND",
  ROUTES_TIMEOUT: "ROUTES_TIMEOUT",
  ROUTES_UPSTREAM_ERROR: "ROUTES_UPSTREAM_ERROR",
  UNAVAILABLE: "UNAVAILABLE",
  ABORTED: "ABORTED",
};

const KNOWN_BACKEND_CODES = new Set([
  ROUTES_CLIENT_ERROR.INVALID_ROUTE_REQUEST,
  ROUTES_CLIENT_ERROR.ROUTES_NOT_CONFIGURED,
  ROUTES_CLIENT_ERROR.ROUTE_NOT_FOUND,
  ROUTES_CLIENT_ERROR.ROUTES_TIMEOUT,
  ROUTES_CLIENT_ERROR.ROUTES_UPSTREAM_ERROR,
]);

export class RoutesClientError extends Error {
  constructor(code) {
    super(code);
    this.name = "RoutesClientError";
    this.code = code;
  }
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidCoordinate(point) {
  return (
    point != null &&
    isFiniteNumber(point.latitude) &&
    isFiniteNumber(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}

function isValidRoute(route) {
  return (
    route != null &&
    typeof route === "object" &&
    isFiniteNumber(route.distanceMeters) &&
    isFiniteNumber(route.durationSeconds) &&
    typeof route.encodedPolyline === "string" &&
    route.encodedPolyline.length > 0 &&
    typeof route.travelMode === "string" &&
    route.source === "google_routes"
  );
}

/**
 * Calls the local backend Compute Routes boundary.
 * Does not read API keys or contact Google from the browser.
 */
export async function computeRoute({
  origin,
  destination,
  travelMode,
  signal,
}) {
  if (!isValidCoordinate(origin) || !isValidCoordinate(destination)) {
    throw new RoutesClientError(ROUTES_CLIENT_ERROR.INVALID_ROUTE_REQUEST);
  }
  if (typeof travelMode !== "string" || travelMode.trim() === "") {
    throw new RoutesClientError(ROUTES_CLIENT_ERROR.INVALID_ROUTE_REQUEST);
  }

  let response;
  try {
    response = await fetch("/api/routes/compute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        origin: {
          latitude: origin.latitude,
          longitude: origin.longitude,
        },
        destination: {
          latitude: destination.latitude,
          longitude: destination.longitude,
        },
        travelMode,
      }),
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new RoutesClientError(ROUTES_CLIENT_ERROR.ABORTED);
    }
    throw new RoutesClientError(ROUTES_CLIENT_ERROR.UNAVAILABLE);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new RoutesClientError(ROUTES_CLIENT_ERROR.UNAVAILABLE);
  }

  if (!response.ok) {
    const code = payload?.error?.code;
    if (KNOWN_BACKEND_CODES.has(code)) {
      throw new RoutesClientError(code);
    }
    throw new RoutesClientError(ROUTES_CLIENT_ERROR.UNAVAILABLE);
  }

  if (!isValidRoute(payload?.route)) {
    throw new RoutesClientError(ROUTES_CLIENT_ERROR.UNAVAILABLE);
  }

  return payload.route;
}
