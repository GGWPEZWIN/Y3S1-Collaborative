import { SCORE_COMPLETENESS, SCORE_FORMULA_VERSION } from "./constants.js";

export function isValidScore(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

export function readPlanEcoScore(value) {
  return isValidScore(value) ? value : null;
}

function clampScore(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, value));
}

export function calculateTransportationEcoScore(completions) {
  if (!Array.isArray(completions) || completions.length === 0) {
    return { ok: false, transportationEcoScore: null };
  }

  let total = 0;
  for (let index = 0; index < completions.length; index += 1) {
    const score = completions[index]?.prototypeEcoScore;
    if (!isValidScore(score)) {
      return { ok: false, transportationEcoScore: null };
    }
    total += score;
  }

  return {
    ok: true,
    transportationEcoScore: total / completions.length,
  };
}

export function calculateFinalTripScore({ planEcoScore, transportationEcoScore } = {}) {
  const plan = readPlanEcoScore(planEcoScore);
  if (!isValidScore(transportationEcoScore)) {
    return {
      ok: false,
      planEcoScore: plan,
      transportationEcoScore: null,
      finalEcoScore: null,
      scoreCompleteness: null,
      scoreFormulaVersion: SCORE_FORMULA_VERSION,
    };
  }

  if (plan == null) {
    return {
      ok: true,
      planEcoScore: null,
      transportationEcoScore,
      finalEcoScore: Math.round(transportationEcoScore),
      scoreCompleteness: SCORE_COMPLETENESS.TRANSPORT_ONLY,
      scoreFormulaVersion: SCORE_FORMULA_VERSION,
    };
  }

  const blended = clampScore((plan + transportationEcoScore) / 2);
  return {
    ok: true,
    planEcoScore: plan,
    transportationEcoScore,
    finalEcoScore: Math.round(blended),
    scoreCompleteness: SCORE_COMPLETENESS.PLAN_AND_TRANSPORT,
    scoreFormulaVersion: SCORE_FORMULA_VERSION,
  };
}

export function calculateFinishScores({ planEcoScore, completions } = {}) {
  if (!Array.isArray(completions) || completions.length === 0) {
    return {
      ok: true,
      planEcoScore: readPlanEcoScore(planEcoScore),
      transportationEcoScore: null,
      finalEcoScore: null,
      scoreCompleteness: SCORE_COMPLETENESS.NO_COMPLETED_TRANSPORT,
      scoreFormulaVersion: SCORE_FORMULA_VERSION,
    };
  }

  const transport = calculateTransportationEcoScore(completions);
  if (!transport.ok) {
    return {
      ok: false,
      planEcoScore: readPlanEcoScore(planEcoScore),
      transportationEcoScore: null,
      finalEcoScore: null,
      scoreCompleteness: null,
      scoreFormulaVersion: SCORE_FORMULA_VERSION,
    };
  }

  return calculateFinalTripScore({
    planEcoScore,
    transportationEcoScore: transport.transportationEcoScore,
  });
}
