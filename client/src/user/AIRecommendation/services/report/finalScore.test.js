import assert from "node:assert/strict";
import test from "node:test";
import { SCORE_COMPLETENESS, SCORE_FORMULA_VERSION } from "./constants.js";
import {
  calculateFinishScores,
  calculateTransportationEcoScore,
  isValidScore,
  readPlanEcoScore,
} from "./finalScore.js";

test("P=89 and transport scores [100, 72, 55] blend to 82", () => {
  const completions = [
    { prototypeEcoScore: 100 },
    { prototypeEcoScore: 72 },
    { prototypeEcoScore: 55 },
  ];
  Object.freeze(completions);
  const result = calculateFinishScores({ planEcoScore: 89, completions });
  assert.equal(result.ok, true);
  assert.equal(result.planEcoScore, 89);
  assert.equal(result.transportationEcoScore, (100 + 72 + 55) / 3);
  assert.equal(result.finalEcoScore, 82);
  assert.equal(result.scoreCompleteness, SCORE_COMPLETENESS.PLAN_AND_TRANSPORT);
  assert.equal(result.scoreFormulaVersion, SCORE_FORMULA_VERSION);
  assert.equal(completions[0].prototypeEcoScore, 100);
});

test("missing P with valid T uses transport_only and round(T)", () => {
  const completions = [
    { prototypeEcoScore: 100 },
    { prototypeEcoScore: 72 },
    { prototypeEcoScore: 55 },
  ];
  const result = calculateFinishScores({ planEcoScore: null, completions });
  assert.equal(result.ok, true);
  assert.equal(result.planEcoScore, null);
  assert.equal(result.finalEcoScore, Math.round((100 + 72 + 55) / 3));
  assert.equal(result.scoreCompleteness, SCORE_COMPLETENESS.TRANSPORT_ONLY);
});

test("missing segment score blocks finish scoring", () => {
  const result = calculateFinishScores({
    planEcoScore: 89,
    completions: [{ prototypeEcoScore: 100 }, { prototypeEcoScore: undefined }],
  });
  assert.equal(result.ok, false);
  assert.equal(result.finalEcoScore, null);
  assert.equal(result.transportationEcoScore, null);
});

test("numeric strings, null, undefined, NaN, Infinity and out-of-range are not scores", () => {
  assert.equal(isValidScore("89"), false);
  assert.equal(isValidScore(null), false);
  assert.equal(isValidScore(undefined), false);
  assert.equal(isValidScore(Number.NaN), false);
  assert.equal(isValidScore(Infinity), false);
  assert.equal(isValidScore(-1), false);
  assert.equal(isValidScore(101), false);
  assert.equal(readPlanEcoScore("89"), null);
  assert.equal(readPlanEcoScore(null), null);
  assert.equal(readPlanEcoScore(0), 0);
  assert.equal(readPlanEcoScore(100), 100);

  const fromStrings = calculateTransportationEcoScore([{ prototypeEcoScore: "100" }]);
  assert.equal(fromStrings.ok, false);

  const fromNaN = calculateFinishScores({
    planEcoScore: 89,
    completions: [{ prototypeEcoScore: Number.NaN }],
  });
  assert.equal(fromNaN.ok, false);
});

test("score helpers do not mutate input", () => {
  const completions = [{ prototypeEcoScore: 80 }, { prototypeEcoScore: 90 }];
  const frozen = completions.map((item) => Object.freeze({ ...item }));
  Object.freeze(frozen);
  const before = JSON.stringify(frozen);
  calculateFinishScores({ planEcoScore: 70, completions: frozen });
  assert.equal(JSON.stringify(frozen), before);
});
