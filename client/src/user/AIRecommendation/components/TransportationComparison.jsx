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

function formatDistanceKm(meters) {
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDurationMinutes(seconds) {
  const minutes = seconds / 60;
  if (minutes < 1) return "< 1 min";
  return `${Math.round(minutes)} min`;
}

export default function TransportationComparison({
  options,
  selectedMode,
  onSelect,
  onUseRecommended,
  onBack,
  liveOriginName,
  liveDestinationName,
  liveComparisonStatus = "idle",
  liveComparisonError = null,
  liveComparisonResults = null,
  onLoadComparison,
}) {
  const isLoading = liveComparisonStatus === "loading";
  const hasLoaded =
    liveComparisonStatus === "success" || liveComparisonStatus === "error";
  const walkLive = liveComparisonResults?.WALK;
  const showWalkNotice = walkLive?.status === "success";

  return (
    <section aria-label="Compare transport">
      <article className="m2-card m2-compare-live" aria-label="Live transport comparison">
        <h3>Live first-segment comparison</h3>
        <p className="m2-muted">
          Clicking the button requests up to three live routes (WALK, TRANSIT,
          and DRIVE) from {liveOriginName} to {liveDestinationName}. This is
          the first itinerary segment only. Carbon and Eco-Score figures remain
          demonstration estimates.
        </p>
        <div className="m2-live" aria-live="polite">
          {liveComparisonStatus === "idle" ? (
            <p className="m2-muted">No paid comparison request has been made yet.</p>
          ) : null}
          {isLoading ? (
            <p className="m2-status m2-status--loading">
              Loading live walking, transit, and driving routes…
            </p>
          ) : null}
          {liveComparisonError === "AUTH_REQUIRED" ||
          liveComparisonError === "INVALID_AUTH_TOKEN" ? (
            <p className="m2-status m2-status--error">
              Please sign in again to load live transport options.
            </p>
          ) : null}
          {liveComparisonStatus === "error" &&
          liveComparisonError !== "AUTH_REQUIRED" &&
          liveComparisonError !== "INVALID_AUTH_TOKEN" ? (
            <p className="m2-status m2-status--error">
              Live transport options are temporarily unavailable.
            </p>
          ) : null}
        </div>
        <div className="m2-actions">
          <button
            type="button"
            className="m2-btn"
            onClick={onLoadComparison}
            disabled={isLoading || !onLoadComparison}
          >
            {isLoading
              ? "Loading live comparison…"
              : hasLoaded
                ? "Refresh Live Comparison"
                : "Load Live Transport Comparison"}
          </button>
        </div>
      </article>

      {showWalkNotice ? (
        <p className="m2-walk-notice" role="note">
          Walking routes are in beta. Check sidewalks, pedestrian access, and
          local conditions before travelling.
        </p>
      ) : null}

      <div className="m2-compare">
        {options.map((option) => {
          const selected = option.mode === selectedMode;
          const travelMode = OPTION_TRAVEL_MODE[option.mode];
          const live = travelMode ? liveComparisonResults?.[travelMode] : null;
          const liveSuccess = live?.status === "success" ? live.route : null;
          const liveFailed =
            live?.status === "error" &&
            liveComparisonError !== "AUTH_REQUIRED" &&
            liveComparisonError !== "INVALID_AUTH_TOKEN";

          return (
            <button
              key={option.mode}
              type="button"
              className={
                selected
                  ? "m2-mode-card m2-mode-card--selected"
                  : "m2-mode-card"
              }
              aria-pressed={selected}
              onClick={() => onSelect(option.mode)}
            >
              <div className="m2-mode-head">
                <h3>{option.label}</h3>
                {option.isRecommended ? (
                  <span className="m2-rec-badge">Prototype recommendation</span>
                ) : null}
              </div>
              {liveSuccess ? (
                <div className="m2-mode-live-meta">
                  <span className="m2-source-badge m2-source-badge--live">
                    Live Google Routes
                  </span>
                  <span className="m2-chip">{liveSuccess.travelMode}</span>
                  {liveSuccess.travelMode === "DRIVE" && liveSuccess.trafficAware ? (
                    <span className="m2-chip">Traffic-aware routing</span>
                  ) : null}
                </div>
              ) : null}
              <dl className="m2-stat-row">
                <div className="m2-stat">
                  <dt>{liveSuccess ? "Live duration" : "Duration"}</dt>
                  <dd>
                    {liveSuccess
                      ? formatDurationMinutes(liveSuccess.durationSeconds)
                      : `${option.estimatedDurationMinutes} min`}
                  </dd>
                </div>
                <div className="m2-stat">
                  <dt>{liveSuccess ? "Live distance" : "Distance"}</dt>
                  <dd>
                    {liveSuccess
                      ? formatDistanceKm(liveSuccess.distanceMeters)
                      : `${option.estimatedDistanceKm} km`}
                  </dd>
                </div>
                <div className="m2-stat">
                  <dt>Demo carbon estimate</dt>
                  <dd>{option.estimatedCarbonKg} kg CO₂e</dd>
                </div>
                <div className="m2-stat">
                  <dt>Demo Eco-Score</dt>
                  <dd>{option.demoEcoScore}</dd>
                </div>
              </dl>
              {liveFailed ? (
                <p className="m2-status m2-status--error" style={{ marginTop: 12 }}>
                  {MODE_UNAVAILABLE[travelMode] || MODE_UNAVAILABLE.WALK}
                </p>
              ) : null}
              <p className="m2-muted" style={{ marginTop: 12 }}>
                Advantages
              </p>
              <ul className="m2-list">
                {option.advantages.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="m2-muted" style={{ marginTop: 12 }}>
                Limitations
              </p>
              <ul className="m2-list">
                {option.limitations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
      <div className="m2-actions">
        <button type="button" className="m2-btn" onClick={onUseRecommended}>
          Use Recommended Option
        </button>
        <button
          type="button"
          className="m2-btn m2-btn--secondary"
          onClick={onBack}
        >
          Back to Recommendation
        </button>
      </div>
    </section>
  );
}
