import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProgressOutcomes,
  DESTINATION_OUTCOME,
  PROGRESS_STOP_KIND,
} from "./progressOutcomes.js";
import {
  lastReachedDestination,
  originAfterSkip,
  reconstructRoutingOrigin,
} from "./routingOrigin.js";
import { routeStopKind } from "./segmentOrigin.js";

const airport = {
  name: "Airport",
  latitude: 5.2971,
  longitude: 100.2769,
};
const penang = {
  id: "dest-penang",
  name: "Penang",
  latitude: 5.4141,
  longitude: 100.3288,
};
const cameron = {
  id: "dest-cameron",
  name: "Cameron Highlands",
  latitude: 4.4721,
  longitude: 101.3801,
};
const kl = {
  id: "dest-kl",
  name: "Kuala Lumpur",
  latitude: 3.139,
  longitude: 101.6869,
};

const itinerary = {
  startLocation: airport,
  destinations: [penang, cameron, kl],
};

const segments = [
  { origin: airport, destination: penang },
  { origin: penang, destination: cameron },
  { origin: cameron, destination: kl },
];

function reached(index, destinationName) {
  return {
    segmentIndex: index,
    destinationName,
    carbonKgCo2e: 0.2,
    prototypeEcoScore: 80,
  };
}

function skipped(index, destinationName) {
  return {
    segmentIndex: index,
    destinationName,
    outcome: "skipped",
  };
}

test("skip Penang routes from actual origin to Cameron Highlands", () => {
  const progress = buildProgressOutcomes({
    totalSegments: 3,
    currentSegmentIndex: 1,
    completions: [],
    skips: [skipped(0, "Penang")],
  });
  assert.equal(progress.items[0].kind, PROGRESS_STOP_KIND.SKIPPED);
  assert.equal(progress.items[1].kind, PROGRESS_STOP_KIND.NEXT);
  assert.equal(progress.items[1].outcome, null);

  const origin = reconstructRoutingOrigin({
    itinerary,
    segments,
    completions: [],
    currentSegmentIndex: 1,
  });
  assert.equal(origin.label, "Airport");
  assert.equal(origin.latitude, airport.latitude);
  assert.notEqual(origin.label, "Penang");
  assert.equal(segments[1].destination.name, "Cameron Highlands");
});

test("consecutive skips do not teleport the origin", () => {
  const afterTwoSkips = reconstructRoutingOrigin({
    itinerary,
    segments,
    completions: [],
    currentSegmentIndex: 2,
  });
  assert.equal(afterTwoSkips.latitude, airport.latitude);
  assert.notEqual(afterTwoSkips.label, "Penang");
  assert.notEqual(afterTwoSkips.label, "Cameron Highlands");

  const gpsOrigin = originAfterSkip({
    lastValidFix: {
      latitude: 5.3,
      longitude: 100.3,
      accuracyMeters: 12,
    },
    reconstructedOrigin: afterTwoSkips,
  });
  assert.equal(gpsOrigin.usedGps, true);
  assert.equal(gpsOrigin.origin.latitude, 5.3);
});

test("reload reconstructs last reached origin and skipped labels", () => {
  const completions = [reached(0, "Penang")];
  const skips = [skipped(1, "Cameron Highlands")];
  const origin = reconstructRoutingOrigin({
    itinerary,
    segments,
    completions,
    currentSegmentIndex: 2,
  });
  assert.equal(origin.source, "reached");
  assert.equal(origin.label, "Penang");
  assert.equal(lastReachedDestination({ segments, completions, beforeIndex: 2 }).label, "Penang");

  const progress = buildProgressOutcomes({
    totalSegments: 3,
    currentSegmentIndex: 2,
    completions,
    skips,
  });
  assert.equal(progress.reachedCount, 1);
  assert.equal(progress.skippedCount, 1);
  assert.equal(routeStopKind({
    stopIndex: 2,
    currentSegmentIndex: 2,
    totalSegments: 3,
    isStart: false,
    outcomesByIndex: { 0: DESTINATION_OUTCOME.REACHED, 1: DESTINATION_OUTCOME.SKIPPED },
  }), "SKIPPED");
  assert.equal(routeStopKind({
    stopIndex: 1,
    currentSegmentIndex: 2,
    totalSegments: 3,
    isStart: false,
    outcomesByIndex: { 0: DESTINATION_OUTCOME.REACHED, 1: DESTINATION_OUTCOME.SKIPPED },
  }), "REACHED");
  assert.equal(routeStopKind({
    stopIndex: 3,
    currentSegmentIndex: 2,
    totalSegments: 3,
    isStart: false,
    outcomesByIndex: { 0: DESTINATION_OUTCOME.REACHED, 1: DESTINATION_OUTCOME.SKIPPED },
  }), "NEXT DESTINATION");
});

test("legacy sessions without skip records still show reached destinations", () => {
  const progress = buildProgressOutcomes({
    totalSegments: 2,
    currentSegmentIndex: 1,
    completions: [reached(0, "Penang")],
    skips: [],
  });
  assert.equal(progress.items[0].kind, PROGRESS_STOP_KIND.REACHED);
  assert.equal(progress.items[1].kind, PROGRESS_STOP_KIND.NEXT);
  assert.equal(progress.skippedCount, 0);
});
