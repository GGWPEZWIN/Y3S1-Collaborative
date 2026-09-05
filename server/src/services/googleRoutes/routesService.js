const COMPUTE_ROUTES_URL =
  "https://routes.googleapis.com/directions/v2:computeRoutes";
const REQUEST_TIMEOUT_MS = 10000;
const FIELD_MASK =
  "routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline.encodedPolyline";
const SUPPORTED_TRAVEL_MODES = new Set(["WALK", "DRIVE", "BICYCLE", "TRANSIT"]);

export const ROUTES_ERROR_CODE = {
  INVALID_ROUTE_REQUEST: "INVALID_ROUTE_REQUEST",
  ROUTES_NOT_CONFIGURED: "ROUTES_NOT_CONFIGURED",
  ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND",
  ROUTES_TIMEOUT: "ROUTES_TIMEOUT",
  ROUTES_UPSTREAM_ERROR: "ROUTES_UPSTREAM_ERROR",
};

export const ROUTES_ERROR_STATUS = {
  INVALID_ROUTE_REQUEST: 400,
  ROUTES_NOT_CONFIGURED: 503,
  ROUTE_NOT_FOUND: 404,
  ROUTES_TIMEOUT: 504,
  ROUTES_UPSTREAM_ERROR: 502,
};

export const ROUTES_ERROR_MESSAGE = {
  INVALID_ROUTE_REQUEST: "The route request is invalid.",
  ROUTES_NOT_CONFIGURED: "Google Routes is not configured on this server.",
  ROUTE_NOT_FOUND: "No route was found between the origin and destination.",
  ROUTES_TIMEOUT: "The route request timed out.",
  ROUTES_UPSTREAM_ERROR: "The route service is temporarily unavailable.",
};

export class RoutesApiError extends Error {
  constructor(code) {
    super(code);
    this.name = "RoutesApiError";
    this.code = code;
  }
}

function readConfiguredApiKey() {
  const value = process.env.GOOGLE_ROUTES_API_KEY;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseDurationSeconds(value) {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)s$/i);
  if (!match) return null;
  return Number(match[1]);
}

function logRoutesError(code, upstreamStatus) {
  if (Number.isFinite(upstreamStatus)) {
    console.error(code, upstreamStatus);
    return;
  }
  console.error(code);
}

function buildGoogleRequestBody(origin, destination, travelMode) {
  const body = {
    origin: {
      location: {
        latLng: {
          latitude: origin.latitude,
          longitude: origin.longitude,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: destination.latitude,
          longitude: destination.longitude,
        },
      },
    },
    travelMode,
    computeAlternativeRoutes: false,
    polylineQuality: "OVERVIEW",
    polylineEncoding: "ENCODED_POLYLINE",
    languageCode: "en",
    units: "METRIC",
  };

  if (travelMode === "DRIVE") {
    body.routingPreference = "TRAFFIC_AWARE";
  }

  return body;
}

function normalizeRoute(googleRoute, travelMode) {
  const encodedPolyline = googleRoute?.polyline?.encodedPolyline;
  const durationSeconds = parseDurationSeconds(googleRoute?.duration);
  const staticDurationSeconds = parseDurationSeconds(
    googleRoute?.staticDuration
  );
  const distanceMeters = googleRoute?.distanceMeters;

  if (typeof encodedPolyline !== "string" || encodedPolyline.length === 0) {
    throw new RoutesApiError(ROUTES_ERROR_CODE.ROUTE_NOT_FOUND);
  }
  if (!Number.isFinite(durationSeconds)) {
    throw new RoutesApiError(ROUTES_ERROR_CODE.ROUTES_UPSTREAM_ERROR);
  }
  if (!Number.isFinite(distanceMeters)) {
    throw new RoutesApiError(ROUTES_ERROR_CODE.ROUTES_UPSTREAM_ERROR);
  }

  return {
    distanceMeters,
    durationSeconds,
    staticDurationSeconds: Number.isFinite(staticDurationSeconds)
      ? staticDurationSeconds
      : null,
    encodedPolyline,
    travelMode,
    trafficAware: travelMode === "DRIVE",
    source: "google_routes",
  };
}

/**
 * Computes one route between one origin and one destination.
 * Does not log or return the API key, headers, or raw upstream body.
 */
export async function computeGoogleRoute({ origin, destination, travelMode }) {
  if (!SUPPORTED_TRAVEL_MODES.has(travelMode)) {
    throw new RoutesApiError(ROUTES_ERROR_CODE.INVALID_ROUTE_REQUEST);
  }

  const apiKey = readConfiguredApiKey();
  if (!apiKey) {
    throw new RoutesApiError(ROUTES_ERROR_CODE.ROUTES_NOT_CONFIGURED);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(COMPUTE_ROUTES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(
        buildGoogleRequestBody(origin, destination, travelMode)
      ),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError" || error?.name === "TimeoutError") {
      logRoutesError(ROUTES_ERROR_CODE.ROUTES_TIMEOUT);
      throw new RoutesApiError(ROUTES_ERROR_CODE.ROUTES_TIMEOUT);
    }
    logRoutesError(ROUTES_ERROR_CODE.ROUTES_UPSTREAM_ERROR);
    throw new RoutesApiError(ROUTES_ERROR_CODE.ROUTES_UPSTREAM_ERROR);
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 404) {
    logRoutesError(ROUTES_ERROR_CODE.ROUTE_NOT_FOUND, response.status);
    throw new RoutesApiError(ROUTES_ERROR_CODE.ROUTE_NOT_FOUND);
  }

  if (!response.ok) {
    logRoutesError(ROUTES_ERROR_CODE.ROUTES_UPSTREAM_ERROR, response.status);
    throw new RoutesApiError(ROUTES_ERROR_CODE.ROUTES_UPSTREAM_ERROR);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    logRoutesError(ROUTES_ERROR_CODE.ROUTES_UPSTREAM_ERROR, response.status);
    throw new RoutesApiError(ROUTES_ERROR_CODE.ROUTES_UPSTREAM_ERROR);
  }

  const googleRoute = Array.isArray(payload?.routes) ? payload.routes[0] : null;
  if (!googleRoute) {
    throw new RoutesApiError(ROUTES_ERROR_CODE.ROUTE_NOT_FOUND);
  }

  return normalizeRoute(googleRoute, travelMode);
}
