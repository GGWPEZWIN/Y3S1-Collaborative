function formatDateRange(itinerary) {
  if (itinerary.startDate && itinerary.endDate) {
    return `${itinerary.startDate} – ${itinerary.endDate}`;
  }
  return itinerary.startDate || itinerary.date || "Dates not provided";
}

export default function ItinerarySummary({
  itinerary,
  recommendation,
  startLocationName,
  source = "demo",
  issues = [],
  routeableSegmentCount = 0,
  onCompare,
  onPreview,
}) {
  const destinations = itinerary?.destinations ?? [];
  const recommendedOption = recommendation?.transportationOptions?.find(
    (option) => option.isRecommended
  );
  const isDemo = source === "demo";
  const canCompare = routeableSegmentCount > 0;

  return (
    <section className="m2-grid" aria-label="Trip recommendation">
      <article className="m2-card">
        <div className="m2-location-head">
          <h3>{itinerary?.title || "Itinerary"}</h3>
          <span className={isDemo ? "m2-badge m2-badge--demo" : "m2-badge"}>
            {isDemo ? "Demonstration itinerary" : "Module 1 itinerary"}
          </span>
        </div>
        <p className="m2-muted">{formatDateRange(itinerary || {})}</p>

        <dl className="m2-stat-row" style={{ marginTop: 16 }}>
          <div className="m2-stat">
            <dt>Starting location</dt>
            <dd>
              {startLocationName ??
                itinerary?.startLocation?.name ??
                "Not provided"}
            </dd>
          </div>
          <div className="m2-stat">
            <dt>Destinations</dt>
            <dd>{destinations.length}</dd>
          </div>
          <div className="m2-stat">
            <dt>Routeable segments</dt>
            <dd>{routeableSegmentCount}</dd>
          </div>
          {isDemo ? (
            <>
              <div className="m2-stat">
                <dt>Recommended mode</dt>
                <dd>
                  {recommendedOption?.label ?? recommendation?.recommendedMode}
                </dd>
              </div>
              <div className="m2-stat">
                <dt>Demo Eco-Score</dt>
                <dd>{recommendation.demoEcoScore}</dd>
              </div>
              <div className="m2-stat">
                <dt>Estimated distance</dt>
                <dd>{recommendation.totalDistanceKm} km</dd>
              </div>
              <div className="m2-stat">
                <dt>Estimated duration</dt>
                <dd>{recommendation.estimatedTotalDurationMinutes} min</dd>
              </div>
              <div className="m2-stat">
                <dt>Estimated carbon</dt>
                <dd>{recommendation.estimatedCarbonKg} kg CO₂e</dd>
              </div>
            </>
          ) : (
            <div className="m2-stat">
              <dt>Trip Eco-Score</dt>
              <dd>Not calculated yet</dd>
            </div>
          )}
        </dl>
      </article>

      <article className="m2-card">
        <h3>Ordered destination list</h3>
        <p className="m2-muted">
          Destinations stay in the saved Module {isDemo ? "2 demonstration" : "1"}{" "}
          order. Module 2 does not reorder them.
        </p>
        <ol className="m2-order">
          {itinerary?.startLocation ? (
            <li className="m2-order-item m2-order-item--start">
              <span className="m2-order-index" aria-hidden="true">
                1
              </span>
              <div>
                <div>{itinerary.startLocation.name}</div>
                <div className="m2-chip">Starting point</div>
              </div>
            </li>
          ) : null}
          {destinations.map((destination, index) => (
            <li
              key={`${destination.destinationId}-${index}`}
              className="m2-order-item"
            >
              <span className="m2-order-index" aria-hidden="true">
                {(itinerary?.startLocation ? 2 : 1) + index}
              </span>
              <div>
                <div>{destination.name}</div>
                <div className="m2-chip">
                  {destination.routeable
                    ? `Day ${destination.day} · Stop ${destination.order}`
                    : "Coordinates needed"}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </article>

      {issues.length > 0 ? (
        <article className="m2-card" style={{ gridColumn: "1 / -1" }}>
          <h3>Itinerary checks</h3>
          <ul className="m2-list">
            {issues.map((issue, index) => (
              <li key={`${issue.code}-${issue.destinationId || index}`}>
                {issue.message}
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      <article className="m2-card" style={{ gridColumn: "1 / -1" }}>
        <h3>
          {isDemo ? "Why this demonstration pick" : "First-segment routing"}
        </h3>
        <p style={{ color: "#374151", fontSize: 14, lineHeight: 1.6 }}>
          {isDemo
            ? recommendation.recommendationExplanation
            : canCompare
              ? `Live transport comparison uses the first saved segment only (${itinerary.startLocation?.name || "start"} → ${destinations[0]?.name}). Remaining segments are listed but not requested yet.`
              : "This itinerary does not yet have a complete first segment with coordinates, so live routing is not requested automatically."}
        </p>
        <div className="m2-actions">
          <button
            type="button"
            className="m2-btn"
            onClick={onCompare}
            disabled={!canCompare && !isDemo}
          >
            Compare Transport
          </button>
          <button
            type="button"
            className="m2-btn m2-btn--secondary"
            onClick={onPreview}
          >
            Preview Navigation
          </button>
        </div>
      </article>
    </section>
  );
}
