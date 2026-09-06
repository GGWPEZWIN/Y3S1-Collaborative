export default function RouteInformationPanel({
  segments,
  structural = false,
}) {
  return (
    <article className="m2-card" aria-label="Route information">
      <h3>Route information</h3>
      <p className="m2-muted" style={{ marginBottom: 8 }}>
        {structural
          ? "These hops follow the saved itinerary order. Live distance, duration, and carbon are not calculated for every segment yet."
          : "Route values are prototype estimates, not live Google Routes or GPS results."}
      </p>
      {segments.map((segment) => (
        <div key={segment.segmentId} className="m2-segment">
          <strong>
            {(segment.origin?.name || segment.origin) +
              " → " +
              (segment.destination?.name || segment.destination)}
          </strong>
          {structural ? (
            <span className="m2-muted">
              {segment.routeable
                ? `Segment ${segment.segmentIndex} · Day ${segment.day}`
                : `Segment ${segment.segmentIndex} · Not yet routeable`}
            </span>
          ) : (
            <>
              <span className="m2-muted">{segment.modeLabel}</span>
              <span>
                {segment.estimatedDistanceKm} km · {segment.estimatedDurationMinutes}{" "}
                min · {segment.estimatedCarbonKg} kg CO₂e
              </span>
            </>
          )}
        </div>
      ))}
    </article>
  );
}
