import { useMemo } from "react";
import { estimateTripSustainability } from "../services/sustainability/carbonCalculator";
import { rankGreenRoutes } from "../services/sustainability/greenRouteRanker";
import {
  formatMetersAsKilometres,
  formatSecondsAsMinutes,
} from "../services/formatMeasurement.js";
import TripActionRow from "./TripActionRow";

const OPTION_TRAVEL_MODE = {
  walking: "WALK",
  public_transit: "TRANSIT",
  driving: "DRIVE",
};

const MODE_UNAVAILABLE = {
  WALK: "A live walking route is unavailable for this segment.",
  TRANSIT: "A live public transit route is unavailable for this segment.",
  DRIVE: "A live driving route is unavailable for this segment.",
};

const MODE_LABEL = {
  WALK: "Walking",
  TRANSIT: "Public transit",
  DRIVE: "Driving",
};

function formatCarbonKg(carbonKgCo2e) {
  if (carbonKgCo2e < 1) {
    return `${carbonKgCo2e.toFixed(3)} kg CO₂e`;
  }
  return `${carbonKgCo2e.toFixed(2)} kg CO₂e`;
}

function liveCandidatesFromResults(liveComparisonResults) {
  if (!liveComparisonResults) return [];
  return ["WALK", "TRANSIT", "DRIVE"].flatMap((travelMode) => {
    const entry = liveComparisonResults[travelMode];
    if (entry?.status !== "success" || !entry.route) return [];
    return [
      {
        travelMode,
        distanceMeters: entry.route.distanceMeters,
        durationSeconds: entry.route.durationSeconds,
      },
    ];
  });
}

function rankingExplanation(ranking) {
  if (ranking.onlyOption && ranking.recommended) {
    const rec = ranking.recommended;
    return `${MODE_LABEL[rec.travelMode]} is the only live option available for this first segment.`;
  }
  if (!ranking.comparative || !ranking.recommended) return null;
  const rec = ranking.recommended;
  const others = rec.reason.comparedTo
    .map((other) => `${MODE_LABEL[other.travelMode]} (score ${other.rankingScore})`)
    .join(" and ");
  const sentences = [
    `${MODE_LABEL[rec.travelMode]} is recommended for this first segment.`,
    `Green ranking score ${rec.rankingScore}.`,
  ];
  if (others) sentences.push(`It ranked above ${others}.`);
  return sentences.join(" ");
}

export default function TransportationComparison({
  options,
  selectedMode,
  onSelect,
  onBack,
  onStartNavigation,
  liveOriginName,
  liveDestinationName,
  liveComparisonStatus = "idle",
  liveComparisonError = null,
  liveComparisonResults = null,
  onLoadComparison,
  canStartNavigation = false,
}) {
  const isLoading = liveComparisonStatus === "loading";
  const allFailed = liveComparisonStatus === "error";
  const ranking = useMemo(
    () => rankGreenRoutes(liveCandidatesFromResults(liveComparisonResults)),
    [liveComparisonResults]
  );
  const rankingByMode = useMemo(() => {
    const byMode = {};
    ranking.ranked.forEach((entry) => {
      byMode[entry.travelMode] = entry;
    });
    return byMode;
  }, [ranking]);
  const explanation = rankingExplanation(ranking);
  const walkLive = liveComparisonResults?.WALK;
  const showWalkNotice = walkLive?.status === "success";

  return (
    <section className="m2-compare-screen" aria-label="Choose transport">
      <header className="m2-compare-header">
        <h2>Choose a greener way</h2>
        <p className="m2-muted">
          {liveOriginName} → {liveDestinationName}. Live first-segment options
          only. Select a successful card to continue.
        </p>
      </header>

      {showWalkNotice ? (
        <p className="m2-walk-notice" role="note">
          Walking routes are in beta. Check sidewalks, pedestrian access, and
          local conditions before travelling.
        </p>
      ) : null}

      {allFailed ? (
        <p className="m2-status m2-status--error" role="alert">
          {liveComparisonError === "AUTH_REQUIRED" ||
          liveComparisonError === "INVALID_AUTH_TOKEN"
            ? "Please sign in again to load live transport options."
            : "Live transport options are temporarily unavailable."}
        </p>
      ) : null}

      <div className="m2-compare">
        {options.map((option) => {
          const travelMode = OPTION_TRAVEL_MODE[option.mode];
          const live = travelMode ? liveComparisonResults?.[travelMode] : null;
          const liveSuccess = live?.status === "success" ? live.route : null;
          const liveFailed = live?.status === "error";
          const selected = option.mode === selectedMode;
          const estimate = liveSuccess
            ? estimateTripSustainability({
                distanceMeters: liveSuccess.distanceMeters,
                travelMode: liveSuccess.travelMode || travelMode,
              })
            : null;
          const rankedEntry = travelMode ? rankingByMode[travelMode] : null;
          const showRecommended =
            Boolean(rankedEntry) &&
            ranking.recommended?.travelMode === travelMode &&
            (ranking.comparative || ranking.onlyOption);

          return (
            <button
              key={option.mode}
              type="button"
              className={[
                "m2-mode-card",
                `m2-mode-card--${travelMode.toLowerCase()}`,
                selected ? "m2-mode-card--selected" : "",
                liveFailed ? "m2-mode-card--unavailable" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={selected}
              disabled={!liveSuccess}
              onClick={() => {
                if (!liveSuccess) return;
                onSelect(option.mode);
              }}
            >
              <div className="m2-mode-head">
                <h3>{option.label}</h3>
                <div className="m2-mode-badges">
                  {rankedEntry ? (
                    <span className="m2-rank-badge">Rank {rankedEntry.rank}</span>
                  ) : null}
                  {showRecommended ? (
                    <span className="m2-rec-badge">Recommended</span>
                  ) : null}
                </div>
              </div>
              {liveSuccess ? (
                <dl className="m2-stat-row">
                  <div className="m2-stat">
                    <dt>Live first-segment distance</dt>
                    <dd>{formatMetersAsKilometres(liveSuccess.distanceMeters)}</dd>
                  </div>
                  <div className="m2-stat">
                    <dt>Live first-segment ETA</dt>
                    <dd>{formatSecondsAsMinutes(liveSuccess.durationSeconds)}</dd>
                  </div>
                  <div className="m2-stat">
                    <dt>Calculated transport carbon</dt>
                    <dd>
                      {estimate ? formatCarbonKg(estimate.carbonKgCo2e) : "Unavailable"}
                    </dd>
                  </div>
                  <div className="m2-stat">
                    <dt>Prototype Eco-Score</dt>
                    <dd>{estimate ? estimate.ecoScore : "Unavailable"}</dd>
                  </div>
                  {rankedEntry ? (
                    <div className="m2-stat">
                      <dt>Local ranking</dt>
                      <dd>{rankedEntry.rankingScore}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : (
                <p className="m2-status m2-status--error" style={{ marginTop: 8 }}>
                  {MODE_UNAVAILABLE[travelMode] || MODE_UNAVAILABLE.WALK}
                </p>
              )}
              {liveSuccess ? (
                <>
                  <p className="m2-muted" style={{ marginTop: 12 }}>
                    Advantages
                  </p>
                  <ul className="m2-list">
                    {option.advantages.slice(0, 3).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="m2-muted" style={{ marginTop: 12 }}>
                    Limitations
                  </p>
                  <ul className="m2-list">
                    {option.limitations.slice(0, 3).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </button>
          );
        })}
      </div>

      {explanation ? (
        <details className="m2-card m2-ranking-explainer">
          <summary>Why this ranking?</summary>
          <p>{explanation}</p>
          <p className="m2-muted">
            Transparent rule-based prototype. Sustainability 70%, duration 30%.
            Walking is adjusted when over 45 minutes or 4 km. This does not
            reorder destinations.
          </p>
        </details>
      ) : null}

      <div className="m2-compare-refresh">
        <button
          type="button"
          className="m2-btn m2-btn--secondary"
          onClick={onLoadComparison}
          disabled={isLoading || !onLoadComparison}
        >
          {isLoading ? "Refreshing…" : "Refresh Live Comparison"}
        </button>
      </div>

      <TripActionRow
        left={
          <button
            type="button"
            className="m2-btn m2-btn--secondary"
            onClick={onBack}
            disabled={isLoading}
          >
            Back to Route Overview
          </button>
        }
        right={
          <button
            type="button"
            className="m2-btn"
            onClick={onStartNavigation}
            disabled={!canStartNavigation || isLoading}
          >
            Start Navigation
          </button>
        }
      />
    </section>
  );
}
