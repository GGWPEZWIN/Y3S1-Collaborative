export default function RouteInformationPanel({ segments }) {
  return (
    <article className="m2-card" aria-label="Route information">
      <h3>Route information</h3>
      <p className="m2-muted" style={{ marginBottom: 8 }}>
        Route values are prototype estimates, not live Google Routes or GPS
        results.
      </p>
      {segments.map((segment) => (
        <div key={segment.segmentId} className="m2-segment">
          <strong>
            {segment.origin} → {segment.destination}
          </strong>
          <span className="m2-muted">{segment.modeLabel}</span>
          <span>
            {segment.estimatedDistanceKm} km · {segment.estimatedDurationMinutes}{" "}
            min · {segment.estimatedCarbonKg} kg CO₂e
          </span>
        </div>
      ))}
    </article>
  );
}
