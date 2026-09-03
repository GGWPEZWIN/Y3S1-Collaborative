export default function ItinerarySummary({
  itinerary,
  recommendation,
  onCompare,
  onPreview,
}) {
  const destinationCount = itinerary.destinations.length;
  const recommendedOption = recommendation.transportationOptions.find(
    (option) => option.isRecommended
  );

  return (
    <section className="m2-grid" aria-label="Trip recommendation">
      <article className="m2-card">
        <h3>{itinerary.title}</h3>
        <p className="m2-muted">
          {itinerary.date} · Departs {itinerary.departureTime}
        </p>

        <dl className="m2-stat-row" style={{ marginTop: 16 }}>
          <div className="m2-stat">
            <dt>Starting location</dt>
            <dd>{itinerary.startLocation.name}</dd>
          </div>
          <div className="m2-stat">
            <dt>Destinations</dt>
            <dd>{destinationCount}</dd>
          </div>
          <div className="m2-stat">
            <dt>Recommended mode</dt>
            <dd>{recommendedOption?.label ?? recommendation.recommendedMode}</dd>
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
        </dl>
      </article>

      <article className="m2-card">
        <h3>Recommended destination order</h3>
        <ol className="m2-order">
          {recommendation.recommendedDestinationOrder.map((stop, index) => (
            <li
              key={stop.stopId}
              className={
                stop.kind === "start"
                  ? "m2-order-item m2-order-item--start"
                  : "m2-order-item"
              }
            >
              <span className="m2-order-index" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <div>{stop.name}</div>
                <div className="m2-chip">
                  {stop.kind === "start" ? "Starting point" : "Destination"}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </article>

      <article className="m2-card" style={{ gridColumn: "1 / -1" }}>
        <h3>Why this demonstration pick</h3>
        <p style={{ color: "#374151", fontSize: 14, lineHeight: 1.6 }}>
          {recommendation.recommendationExplanation}
        </p>
        <div className="m2-actions">
          <button type="button" className="m2-btn" onClick={onCompare}>
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
