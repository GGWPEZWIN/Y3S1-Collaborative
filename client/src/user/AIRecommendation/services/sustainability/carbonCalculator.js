export const CALCULATION_VERSION = "prototype-uk-ghg-2026-v1";

/**
 * Prototype screening factors. Not Malaysia-specific official factors.
 *
 * TRANSIT uses the UK Government 2026 average local bus screening factor
 * because the current backend response does not identify the transit vehicle
 * type.
 * DRIVE uses the UK Government 2026 average car, unknown-fuel screening
 * factor.
 * WALK represents zero direct operational vehicle emissions; food energy and
 * embodied infrastructure emissions are excluded.
 */
export const EMISSION_FACTORS_KG_PER_KM = {
  WALK: 0,
  TRANSIT: 0.10151,
  DRIVE: 0.16591,
};

export const DRIVE_FACTOR = EMISSION_FACTORS_KG_PER_KM.DRIVE;

const FACTOR_UNITS = {
  WALK: "kg CO2e per passenger-km",
  TRANSIT: "kg CO2e per passenger-km",
  DRIVE: "kg CO2e per km",
};

const SOURCE_LABEL =
  "UK Government GHG Conversion Factors 2026 (prototype screening)";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isPositiveFiniteDistance(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Pure first-segment carbon and prototype Eco-Score estimate.
 * Does not call APIs, Firebase, storage, or the backend.
 */
export function estimateTripSustainability({ distanceMeters, travelMode }) {
  if (!isPositiveFiniteDistance(distanceMeters)) {
    return null;
  }
  if (typeof travelMode !== "string") {
    return null;
  }

  const mode = travelMode.trim().toUpperCase();
  if (!Object.prototype.hasOwnProperty.call(EMISSION_FACTORS_KG_PER_KM, mode)) {
    return null;
  }

  const factor = EMISSION_FACTORS_KG_PER_KM[mode];
  const distanceKm = distanceMeters / 1000;
  const carbonKgCo2e = distanceKm * factor;
  if (!Number.isFinite(distanceKm) || !Number.isFinite(carbonKgCo2e)) {
    return null;
  }

  const ecoScore = Math.round(
    clamp(100 - (factor / DRIVE_FACTOR) * 45, 0, 100)
  );

  return {
    distanceKm,
    carbonKgCo2e,
    ecoScore,
    factor,
    factorUnit: FACTOR_UNITS[mode],
    sourceLabel: SOURCE_LABEL,
    calculationVersion: CALCULATION_VERSION,
  };
}
