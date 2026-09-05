import {
  ROUTES_ERROR_CODE,
  ROUTES_ERROR_MESSAGE,
  ROUTES_ERROR_STATUS,
  RoutesApiError,
  computeGoogleRoute,
} from "../services/googleRoutes/routesService.js";

const SUPPORTED_TRAVEL_MODES = new Set(["WALK", "DRIVE", "BICYCLE", "TRANSIT"]);

function sendRoutesError(res, code) {
  res.status(ROUTES_ERROR_STATUS[code]).json({
    error: {
      code,
      message: ROUTES_ERROR_MESSAGE[code],
    },
  });
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isValidLatitude(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= -180 &&
    value <= 180
  );
}

function isValidCoordinate(point) {
  return (
    isPlainObject(point) &&
    isValidLatitude(point.latitude) &&
    isValidLongitude(point.longitude)
  );
}

function parseTravelMode(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (!SUPPORTED_TRAVEL_MODES.has(normalized)) return null;
  return normalized;
}

function validateComputeBody(body) {
  if (!isPlainObject(body)) return false;
  if (!isValidCoordinate(body.origin)) return false;
  if (!isValidCoordinate(body.destination)) return false;
  if (!parseTravelMode(body.travelMode)) return false;
  return true;
}

export async function computeRoute(req, res) {
  try {
    if (!validateComputeBody(req.body)) {
      sendRoutesError(res, ROUTES_ERROR_CODE.INVALID_ROUTE_REQUEST);
      return;
    }

    const travelMode = parseTravelMode(req.body.travelMode);
    const route = await computeGoogleRoute({
      origin: {
        latitude: req.body.origin.latitude,
        longitude: req.body.origin.longitude,
      },
      destination: {
        latitude: req.body.destination.latitude,
        longitude: req.body.destination.longitude,
      },
      travelMode,
    });

    res.status(200).json({ route });
  } catch (error) {
    if (error instanceof RoutesApiError) {
      sendRoutesError(res, error.code);
      return;
    }
    sendRoutesError(res, ROUTES_ERROR_CODE.ROUTES_UPSTREAM_ERROR);
  }
}
