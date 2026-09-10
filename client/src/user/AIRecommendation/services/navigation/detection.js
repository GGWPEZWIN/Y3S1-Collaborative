import {
  ARRIVAL_RADIUS_METERS,
  CONSECUTIVE_FIXES_REQUIRED,
  DEVIATION_BASE_METERS,
} from "./constants.js";
import {
  isUsableGpsAccuracy,
  isValidCoordinate,
  isValidGpsFix,
} from "./coordinates.js";
import { haversineDistanceMeters } from "./haversine.js";
import { minDistanceToPolylineMeters } from "./routeProximity.js";

export function emptyNavigationStreaks() {
  return {
    arrivalCount: 0,
    deviationCount: 0,
  };
}

export function effectiveDeviationThresholdMeters(accuracyMeters) {
  if (!isUsableGpsAccuracy(accuracyMeters)) return null;
  const threshold = DEVIATION_BASE_METERS + accuracyMeters;
  return Number.isFinite(threshold) ? threshold : null;
}

function freezeCopy(value) {
  if (value == null || typeof value !== "object") return value;
  return { ...value };
}

/**
 * Evaluates one GPS fix against the selected route and destination.
 * Poor-accuracy fixes never trigger arrival or deviation.
 * One qualifying fix is not enough; two consecutive fixes are required.
 * Does not mutate the input objects.
 */
export function evaluateNavigationFix({
  fix,
  destination,
  polylinePoints,
  streaks,
} = {}) {
  const nextStreaks = {
    arrivalCount: 0,
    deviationCount: 0,
    ...freezeCopy(streaks),
  };

  const result = {
    arrived: false,
    deviated: false,
    distanceToDestinationMeters: null,
    distanceToRouteMeters: null,
    deviationThresholdMeters: null,
    streaks: nextStreaks,
  };

  if (!isValidGpsFix(fix) || !isUsableGpsAccuracy(fix.accuracyMeters)) {
    nextStreaks.arrivalCount = 0;
    nextStreaks.deviationCount = 0;
    return result;
  }

  if (isValidCoordinate(destination)) {
    const distanceToDestination = haversineDistanceMeters(fix, destination);
    result.distanceToDestinationMeters = distanceToDestination;
    if (
      distanceToDestination != null &&
      distanceToDestination <= ARRIVAL_RADIUS_METERS
    ) {
      nextStreaks.arrivalCount += 1;
    } else {
      nextStreaks.arrivalCount = 0;
    }
    result.arrived = nextStreaks.arrivalCount >= CONSECUTIVE_FIXES_REQUIRED;
  }

  if (Array.isArray(polylinePoints) && polylinePoints.length > 0) {
    const distanceToRoute = minDistanceToPolylineMeters(fix, polylinePoints);
    const threshold = effectiveDeviationThresholdMeters(fix.accuracyMeters);
    result.distanceToRouteMeters = distanceToRoute;
    result.deviationThresholdMeters = threshold;
    if (
      distanceToRoute != null &&
      threshold != null &&
      distanceToRoute > threshold
    ) {
      nextStreaks.deviationCount += 1;
    } else {
      nextStreaks.deviationCount = 0;
    }
    result.deviated = nextStreaks.deviationCount >= CONSECUTIVE_FIXES_REQUIRED;
  }

  if (result.arrived) {
    nextStreaks.deviationCount = 0;
    result.deviated = false;
  }

  return result;
}
