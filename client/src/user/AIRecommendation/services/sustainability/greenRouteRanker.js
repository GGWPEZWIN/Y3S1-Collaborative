import { estimateTripSustainability } from "./carbonCalculator.js";

export const RANKING_VERSION = "prototype-green-ranking-v1";

const MODE_ORDER = ["WALK", "TRANSIT", "DRIVE"];
const WALK_DURATION_LIMIT_SECONDS = 45 * 60;
const WALK_DISTANCE_LIMIT_METERS = 4000;
const WALKING_PENALTY_POINTS = 15;
const SUPPORTED_MODES = new Set(MODE_ORDER);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeMode(value) {
  if (typeof value !== "string") return null;
  const mode = value.trim().toUpperCase();
  return SUPPORTED_MODES.has(mode) ? mode : null;
}

function isPositiveFinite(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function modeOrderIndex(mode) {
  const index = MODE_ORDER.indexOf(mode);
  return index === -1 ? MODE_ORDER.length : index;
}

function compareRanked(a, b) {
  if (b.rankingScore !== a.rankingScore) return b.rankingScore - a.rankingScore;
  if (b.ecoScore !== a.ecoScore) return b.ecoScore - a.ecoScore;
  if (a.carbonKgCo2e !== b.carbonKgCo2e) return a.carbonKgCo2e - b.carbonKgCo2e;
  if (a.durationSeconds !== b.durationSeconds) {
    return a.durationSeconds - b.durationSeconds;
  }
  return modeOrderIndex(a.travelMode) - modeOrderIndex(b.travelMode);
}

function walkingPenaltyFlags(travelMode, durationSeconds, distanceMeters) {
  if (travelMode !== "WALK") {
    return {
      walkingPenaltyApplied: false,
      walkingOver45Min: false,
      walkingOver4Km: false,
    };
  }
  const walkingOver45Min = durationSeconds > WALK_DURATION_LIMIT_SECONDS;
  const walkingOver4Km = distanceMeters > WALK_DISTANCE_LIMIT_METERS;
  return {
    walkingPenaltyApplied: walkingOver45Min || walkingOver4Km,
    walkingOver45Min,
    walkingOver4Km,
  };
}

function buildReason(entry, ranked, { comparative, onlyOption }) {
  return {
    kind: onlyOption ? "only_option" : comparative && entry.rank === 1 ? "recommended" : "alternative",
    travelMode: entry.travelMode,
    rankingScore: entry.rankingScore,
    durationSeconds: entry.durationSeconds,
    carbonKgCo2e: entry.carbonKgCo2e,
    ecoScore: entry.ecoScore,
    walkingPenaltyApplied: entry.walkingPenaltyApplied,
    walkingOver45Min: entry.walkingOver45Min,
    walkingOver4Km: entry.walkingOver4Km,
    comparedTo: ranked
      .filter((other) => other.travelMode !== entry.travelMode)
      .map((other) => ({
        travelMode: other.travelMode,
        rankingScore: other.rankingScore,
        carbonKgCo2e: other.carbonKgCo2e,
        durationSeconds: other.durationSeconds,
        ecoScore: other.ecoScore,
      })),
  };
}

/**
 * Ranks successful first-segment live routes. Does not call APIs or mutate input.
 */
export function rankGreenRoutes(candidates) {
  const source = Array.isArray(candidates) ? candidates : [];
  const prepared = [];
  const seen = new Set();

  for (const candidate of source) {
    if (candidate == null || typeof candidate !== "object") continue;
    const travelMode = normalizeMode(candidate.travelMode);
    if (!travelMode || seen.has(travelMode)) continue;
    if (!isPositiveFinite(candidate.distanceMeters)) continue;
    if (!isPositiveFinite(candidate.durationSeconds)) continue;

    const estimate = estimateTripSustainability({
      distanceMeters: candidate.distanceMeters,
      travelMode,
    });
    if (!estimate) continue;

    seen.add(travelMode);
    const penalty = walkingPenaltyFlags(
      travelMode,
      candidate.durationSeconds,
      candidate.distanceMeters
    );
    prepared.push({
      travelMode,
      distanceMeters: candidate.distanceMeters,
      durationSeconds: candidate.durationSeconds,
      carbonKgCo2e: estimate.carbonKgCo2e,
      ecoScore: estimate.ecoScore,
      ...penalty,
    });
  }

  if (prepared.length === 0) {
    return {
      ranked: [],
      recommended: null,
      comparative: false,
      onlyOption: false,
      calculationVersion: RANKING_VERSION,
    };
  }

  const shortestDurationSeconds = Math.min(
    ...prepared.map((item) => item.durationSeconds)
  );

  const scored = prepared.map((item) => {
    const durationEfficiencyScore = clamp(
      (shortestDurationSeconds / item.durationSeconds) * 100,
      0,
      100
    );
    const baseGreenScore =
      0.7 * item.ecoScore + 0.3 * durationEfficiencyScore;
    const penaltyPoints = item.walkingPenaltyApplied ? WALKING_PENALTY_POINTS : 0;
    const rankingScore = Math.round(
      clamp(baseGreenScore - penaltyPoints, 0, 100)
    );
    return {
      ...item,
      durationEfficiencyScore,
      rankingScore,
    };
  });

  scored.sort(compareRanked);

  const onlyOption = scored.length === 1;
  const comparative = scored.length >= 2;
  const rankedBase = scored.map((item, index) => ({
    rank: index + 1,
    travelMode: item.travelMode,
    rankingScore: item.rankingScore,
    durationEfficiencyScore: item.durationEfficiencyScore,
    carbonKgCo2e: item.carbonKgCo2e,
    ecoScore: item.ecoScore,
    durationSeconds: item.durationSeconds,
    distanceMeters: item.distanceMeters,
    walkingPenaltyApplied: item.walkingPenaltyApplied,
    walkingOver45Min: item.walkingOver45Min,
    walkingOver4Km: item.walkingOver4Km,
    calculationVersion: RANKING_VERSION,
  }));

  const ranked = rankedBase.map((entry) => {
    const reason = buildReason(entry, rankedBase, { comparative, onlyOption });
    reason.comparedTo.forEach((other) => Object.freeze(other));
    Object.freeze(reason.comparedTo);
    Object.freeze(reason);
    return Object.freeze({
      ...entry,
      reason,
    });
  });

  return Object.freeze({
    ranked: Object.freeze(ranked),
    recommended: comparative || onlyOption ? ranked[0] : null,
    comparative,
    onlyOption,
    calculationVersion: RANKING_VERSION,
  });
}
