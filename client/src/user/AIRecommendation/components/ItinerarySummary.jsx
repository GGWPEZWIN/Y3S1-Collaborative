function formatDateRange(itinerary) {
  if (itinerary?.startDate && itinerary?.endDate) {
    return `${itinerary.startDate} – ${itinerary.endDate}`;
  }
  return itinerary?.startDate || itinerary?.date || "Dates not provided";
}

function formatCoordinatePair(latitude, longitude, routeable) {
  if (!routeable) return "Coordinates unavailable";
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

function formatOptionalNumber(value, suffix = "") {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Unavailable";
  return `${value}${suffix}`;
}

function activityLabel(activity) {
  return activity.name || activity.activityId;
}

export default function ItinerarySummary({
  itinerary,
  recommendation,
  startLocationName,
  source = "demo",
  issues = [],
  routeableSegmentCount = 0,
  compareEnabled = true,
  previewEnabled = true,
  flowBlockedReason = null,
  onCompare,
  onPreview,
}) {
  const destinations = itinerary?.destinations ?? [];
  const accommodations = itinerary?.accommodations ?? [];
  const activities = itinerary?.activities ?? [];
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
            <dt>Start coordinates</dt>
            <dd>
              {itinerary?.startLocation
                ? formatCoordinatePair(
                    itinerary.startLocation.latitude,
                    itinerary.startLocation.longitude,
                    itinerary.startLocation.routeable
                  )
                : "Coordinates unavailable"}
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
            <>
              <div className="m2-stat">
                <dt>Module 1 Eco-Score</dt>
                <dd>{formatOptionalNumber(itinerary?.ecoScore)}</dd>
              </div>
              <div className="m2-stat">
                <dt>Activities / stay carbon</dt>
                <dd>
                  {formatOptionalNumber(
                    itinerary?.activitiesStayCarbonKg,
                    " kg CO₂e"
                  )}
                </dd>
              </div>
              <div className="m2-stat">
                <dt>Transportation carbon</dt>
                <dd>Not calculated yet</dd>
              </div>
            </>
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
                <div className="m2-muted">
                  {formatCoordinatePair(
                    itinerary.startLocation.latitude,
                    itinerary.startLocation.longitude,
                    itinerary.startLocation.routeable
                  )}
                </div>
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
                <div className="m2-muted">
                  {formatCoordinatePair(
                    destination.latitude,
                    destination.longitude,
                    destination.routeable
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </article>

      {!isDemo ? (
        <article className="m2-card" style={{ gridColumn: "1 / -1" }}>
          <h3>Activities and stay</h3>
          <p className="m2-muted">
            These values come from the saved Module 1 itinerary. Missing
            sustainability figures are shown as unavailable, not zero.
            Transportation impact is calculated separately.
          </p>
          <dl className="m2-stat-row" style={{ marginTop: 12 }}>
            <div className="m2-stat">
              <dt>Accommodation</dt>
              <dd>
                {accommodations[0]?.name || "Unavailable"}
              </dd>
            </div>
            <div className="m2-stat">
              <dt>Activities</dt>
              <dd>
                {activities.length > 0
                  ? activities.map(activityLabel).join(", ")
                  : "None saved"}
              </dd>
            </div>
            <div className="m2-stat">
              <dt>Activities / stay carbon</dt>
              <dd>
                {formatOptionalNumber(
                  itinerary?.activitiesStayCarbonKg,
                  " kg CO₂e"
                )}
              </dd>
            </div>
            <div className="m2-stat">
              <dt>Module 1 Eco-Score</dt>
              <dd>{formatOptionalNumber(itinerary?.ecoScore)}</dd>
            </div>
          </dl>
        </article>
      ) : null}

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
        {flowBlockedReason ? (
          <p className="m2-muted" style={{ marginTop: 12 }} role="note">
            {flowBlockedReason}
          </p>
        ) : null}
        <div className="m2-actions">
          <button
            type="button"
            className="m2-btn"
            onClick={onCompare}
            disabled={!compareEnabled || (!canCompare && !isDemo)}
          >
            Compare Transport
          </button>
          <button
            type="button"
            className="m2-btn m2-btn--secondary"
            onClick={onPreview}
            disabled={!previewEnabled}
          >
            Preview Navigation
          </button>
        </div>
      </article>
    </section>
  );
}
