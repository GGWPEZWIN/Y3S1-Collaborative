import assert from "node:assert/strict";
import test from "node:test";
import { isValidCoordinate, isValidGpsFix, isUsableGpsAccuracy } from "./coordinates.js";
import { decodeGooglePolyline } from "./decodePolyline.js";
import {
  evaluateNavigationFix,
  emptyNavigationStreaks,
} from "./detection.js";
import { haversineDistanceMeters } from "./haversine.js";
import { minDistanceToPolylineMeters } from "./routeProximity.js";

const origin = { latitude: 3.139, longitude: 101.6869 };
const destination = { latitude: 3.141, longitude: 101.6875 };

test("rejects invalid coordinates and accuracy", () => {
  assert.equal(isValidCoordinate(null), false);
  assert.equal(isValidCoordinate({ latitude: 91, longitude: 0 }), false);
  assert.equal(isValidCoordinate({ latitude: 0, longitude: 181 }), false);
  assert.equal(isValidCoordinate({ latitude: NaN, longitude: 0 }), false);
  assert.equal(isValidGpsFix({ latitude: 0, longitude: 0, accuracyMeters: -1 }), false);
  assert.equal(isValidGpsFix({ latitude: 0, longitude: 0, accuracyMeters: Infinity }), false);
  assert.equal(isValidGpsFix({ latitude: 3, longitude: 101, accuracyMeters: 12 }), true);
  assert.equal(isUsableGpsAccuracy(100), true);
  assert.equal(isUsableGpsAccuracy(100.1), false);
});

test("haversine same-point distance is 0", () => {
  assert.equal(haversineDistanceMeters(origin, { ...origin }), 0);
});

test("haversine known-distance sanity case", () => {
  const equator = { latitude: 0, longitude: 0 };
  const oneDegree = { latitude: 0, longitude: 1 };
  const distance = haversineDistanceMeters(equator, oneDegree);
  assert.ok(distance != null);
  assert.ok(distance > 111000 && distance < 112000);
});

test("haversine does not coerce invalid measurements to zero", () => {
  assert.equal(haversineDistanceMeters({ latitude: 91, longitude: 0 }, origin), null);
  assert.equal(haversineDistanceMeters(origin, { latitude: "3", longitude: 101 }), null);
});

test("decodes a known encoded polyline", () => {
  const points = decodeGooglePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
  assert.ok(Array.isArray(points));
  assert.equal(points.length, 3);
  assert.ok(Math.abs(points[0].latitude - 38.5) < 0.0001);
  assert.ok(Math.abs(points[0].longitude - -120.2) < 0.0001);
  assert.ok(Math.abs(points[2].latitude - 43.252) < 0.0001);
  assert.ok(Math.abs(points[2].longitude - -126.453) < 0.0001);
});

test("malformed encoded polyline returns null", () => {
  assert.equal(decodeGooglePolyline(""), null);
  assert.equal(decodeGooglePolyline(null), null);
  assert.equal(decodeGooglePolyline("_p~iF"), null);
});

test("point on route is within arrival-scale distance of the polyline", () => {
  const polyline = [origin, destination];
  const onRoute = {
    latitude: (origin.latitude + destination.latitude) / 2,
    longitude: (origin.longitude + destination.longitude) / 2,
  };
  const distance = minDistanceToPolylineMeters(onRoute, polyline);
  assert.ok(distance != null);
  assert.ok(distance < 5);
});

test("point outside the deviation threshold is far from the polyline", () => {
  const polyline = [origin, destination];
  const offRoute = { latitude: origin.latitude + 0.02, longitude: origin.longitude };
  const distance = minDistanceToPolylineMeters(offRoute, polyline);
  assert.ok(distance != null);
  assert.ok(distance > 150);
});

test("a non-qualifying fix resets consecutive counters", () => {
  const polyline = [origin, destination];
  const first = evaluateNavigationFix({
    fix: { ...destination, accuracyMeters: 20 },
    destination,
    polylinePoints: polyline,
    streaks: emptyNavigationStreaks(),
  });
  const interrupted = evaluateNavigationFix({
    fix: { ...destination, accuracyMeters: 250 },
    destination,
    polylinePoints: polyline,
    streaks: first.streaks,
  });
  const third = evaluateNavigationFix({
    fix: { ...destination, accuracyMeters: 18 },
    destination,
    polylinePoints: polyline,
    streaks: interrupted.streaks,
  });
  assert.equal(first.arrived, false);
  assert.equal(interrupted.arrived, false);
  assert.equal(interrupted.streaks.arrivalCount, 0);
  assert.equal(third.arrived, false);
  assert.equal(third.streaks.arrivalCount, 1);
});

test("arrival takes precedence over deviation when near the destination", () => {
  const polyline = [origin, { latitude: origin.latitude + 0.02, longitude: origin.longitude }];
  const first = evaluateNavigationFix({
    fix: { ...destination, accuracyMeters: 20 },
    destination,
    polylinePoints: polyline,
    streaks: emptyNavigationStreaks(),
  });
  const second = evaluateNavigationFix({
    fix: { ...destination, accuracyMeters: 18 },
    destination,
    polylinePoints: polyline,
    streaks: first.streaks,
  });
  assert.equal(second.arrived, true);
  assert.equal(second.deviated, false);
});

test("poor-accuracy fix never triggers deviation or arrival", () => {
  const polyline = [origin, destination];
  const first = evaluateNavigationFix({
    fix: { ...destination, accuracyMeters: 250 },
    destination,
    polylinePoints: polyline,
    streaks: emptyNavigationStreaks(),
  });
  const second = evaluateNavigationFix({
    fix: { ...destination, accuracyMeters: 250 },
    destination,
    polylinePoints: polyline,
    streaks: first.streaks,
  });
  assert.equal(first.arrived, false);
  assert.equal(first.deviated, false);
  assert.equal(second.arrived, false);
  assert.equal(second.deviated, false);
});

test("one qualifying fix does not trigger arrival or deviation", () => {
  const polyline = [origin, destination];
  const arrival = evaluateNavigationFix({
    fix: { ...destination, accuracyMeters: 20 },
    destination,
    polylinePoints: polyline,
    streaks: emptyNavigationStreaks(),
  });
  assert.equal(arrival.arrived, false);
  assert.equal(arrival.streaks.arrivalCount, 1);

  const offRoute = { latitude: origin.latitude + 0.02, longitude: origin.longitude };
  const deviation = evaluateNavigationFix({
    fix: { ...offRoute, accuracyMeters: 20 },
    destination,
    polylinePoints: polyline,
    streaks: emptyNavigationStreaks(),
  });
  assert.equal(deviation.deviated, false);
  assert.equal(deviation.streaks.deviationCount, 1);
});

test("two consecutive qualifying fixes trigger arrival and deviation", () => {
  const polyline = [origin, destination];
  const firstArrival = evaluateNavigationFix({
    fix: { ...destination, accuracyMeters: 20 },
    destination,
    polylinePoints: polyline,
    streaks: emptyNavigationStreaks(),
  });
  const secondArrival = evaluateNavigationFix({
    fix: { ...destination, accuracyMeters: 18 },
    destination,
    polylinePoints: polyline,
    streaks: firstArrival.streaks,
  });
  assert.equal(secondArrival.arrived, true);

  const offRoute = { latitude: origin.latitude + 0.02, longitude: origin.longitude };
  const firstDeviation = evaluateNavigationFix({
    fix: { ...offRoute, accuracyMeters: 20 },
    destination,
    polylinePoints: polyline,
    streaks: emptyNavigationStreaks(),
  });
  const secondDeviation = evaluateNavigationFix({
    fix: { ...offRoute, accuracyMeters: 25 },
    destination,
    polylinePoints: polyline,
    streaks: firstDeviation.streaks,
  });
  assert.equal(secondDeviation.deviated, true);
});

test("input objects are not mutated", () => {
  const fix = { latitude: destination.latitude, longitude: destination.longitude, accuracyMeters: 20 };
  const streaks = emptyNavigationStreaks();
  const polyline = [origin, destination];
  Object.freeze(fix);
  Object.freeze(destination);
  Object.freeze(origin);
  Object.freeze(polyline);
  Object.freeze(streaks);
  const result = evaluateNavigationFix({
    fix,
    destination,
    polylinePoints: polyline,
    streaks,
  });
  assert.equal(streaks.arrivalCount, 0);
  assert.equal(result.streaks.arrivalCount, 1);
  assert.notEqual(result.streaks, streaks);
});
