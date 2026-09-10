import { CARBON_SCOPE } from "./constants.js";

function isConfirmedCarbon(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function aggregateConfirmedTransportationCarbon(completions, expectedCount) {
  if (!Number.isInteger(expectedCount) || expectedCount < 1) {
    return { ok: false, confirmedTransportationCarbonKg: null, carbonScope: CARBON_SCOPE };
  }
  if (!Array.isArray(completions) || completions.length !== expectedCount) {
    return { ok: false, confirmedTransportationCarbonKg: null, carbonScope: CARBON_SCOPE };
  }

  let total = 0;
  for (let index = 0; index < completions.length; index += 1) {
    const carbon = completions[index]?.carbonKgCo2e;
    if (!isConfirmedCarbon(carbon)) {
      return { ok: false, confirmedTransportationCarbonKg: null, carbonScope: CARBON_SCOPE };
    }
    total += carbon;
  }

  return {
    ok: true,
    confirmedTransportationCarbonKg: total,
    carbonScope: CARBON_SCOPE,
  };
}
