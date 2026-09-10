import assert from "node:assert/strict";
import test from "node:test";
import { CARBON_SCOPE } from "./constants.js";
import { aggregateConfirmedTransportationCarbon } from "./confirmedCarbon.js";

test("walking carbon 0 is confirmed and included", () => {
  const completions = [
    { carbonKgCo2e: 0 },
    { carbonKgCo2e: 0.4 },
    { carbonKgCo2e: 1.25 },
  ];
  Object.freeze(completions);
  const result = aggregateConfirmedTransportationCarbon(completions, 3);
  assert.equal(result.ok, true);
  assert.equal(result.confirmedTransportationCarbonKg, 1.65);
  assert.equal(result.carbonScope, CARBON_SCOPE);
});

test("missing, malformed, or negative carbon blocks a complete total", () => {
  assert.equal(
    aggregateConfirmedTransportationCarbon([{ carbonKgCo2e: 0.2 }, { carbonKgCo2e: undefined }], 2).ok,
    false
  );
  assert.equal(
    aggregateConfirmedTransportationCarbon([{ carbonKgCo2e: "0.2" }], 1).ok,
    false
  );
  assert.equal(
    aggregateConfirmedTransportationCarbon([{ carbonKgCo2e: -0.1 }], 1).ok,
    false
  );
  assert.equal(
    aggregateConfirmedTransportationCarbon([{ carbonKgCo2e: 0.2 }], 2).ok,
    false
  );
});

test("carbon aggregation does not mutate input", () => {
  const completions = [{ carbonKgCo2e: 0 }, { carbonKgCo2e: 0.5 }];
  const frozen = completions.map((item) => Object.freeze({ ...item }));
  Object.freeze(frozen);
  const before = JSON.stringify(frozen);
  aggregateConfirmedTransportationCarbon(frozen, 2);
  assert.equal(JSON.stringify(frozen), before);
});
