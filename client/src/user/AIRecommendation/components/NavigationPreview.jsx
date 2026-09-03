export default function NavigationPreview({
  stops,
  segments,
  currentIndex,
  paused,
  onPause,
  onResume,
  onNext,
  onBack,
}) {
  const lastIndex = stops.length - 1;
  const current = stops[currentIndex];
  const next = stops[currentIndex + 1];
  const completed = currentIndex >= lastIndex;
  const remainingSegments = segments.slice(currentIndex);
  const remainingMinutes = remainingSegments.reduce(
    (sum, segment) => sum + segment.estimatedDurationMinutes,
    0
  );
  const remainingKm = remainingSegments.reduce(
    (sum, segment) => sum + segment.estimatedDistanceKm,
    0
  );

  return (
    <section className="m2-grid" aria-label="Navigation preview">
      <article className="m2-card">
        <h3>Navigation Preview</h3>
        <p className="m2-badge" style={{ marginBottom: 12 }}>
          Simulation
        </p>
        <dl className="m2-stat-row">
          <div className="m2-stat">
            <dt>Current demonstration segment</dt>
            <dd>{current?.name}</dd>
          </div>
          <div className="m2-stat">
            <dt>Next destination</dt>
            <dd>{next ? next.name : "None"}</dd>
          </div>
          <div className="m2-stat">
            <dt>Estimated remaining time</dt>
            <dd>{completed ? "0 min" : `${remainingMinutes} min`}</dd>
          </div>
          <div className="m2-stat">
            <dt>Estimated remaining distance</dt>
            <dd>{completed ? "0 km" : `${remainingKm.toFixed(1)} km`}</dd>
          </div>
        </dl>
        {paused ? (
          <p className="m2-muted" style={{ marginTop: 12 }}>
            Preview paused. Resume to continue this simulation.
          </p>
        ) : null}
        {completed ? (
          <p className="m2-complete" role="status">
            Demo trip completed
          </p>
        ) : null}
        <div className="m2-actions">
          <button
            type="button"
            className="m2-btn m2-btn--secondary"
            onClick={onPause}
            disabled={paused || completed}
          >
            Pause Preview
          </button>
          <button
            type="button"
            className="m2-btn m2-btn--secondary"
            onClick={onResume}
            disabled={!paused || completed}
          >
            Resume Preview
          </button>
          <button
            type="button"
            className="m2-btn"
            onClick={onNext}
            disabled={paused || completed}
          >
            Next Destination
          </button>
          <button
            type="button"
            className="m2-btn m2-btn--secondary"
            onClick={onBack}
          >
            Back to Recommendation
          </button>
        </div>
      </article>

      <article className="m2-card">
        <h4>Ordered destination progress</h4>
        <ol className="m2-order">
          {stops.map((stop, index) => {
            const done = index < currentIndex || completed;
            const here = index === currentIndex && !completed;
            return (
              <li
                key={stop.stopId}
                className={
                  done
                    ? "m2-order-item m2-order-item--done"
                    : here
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
                    {done
                      ? "Completed"
                      : here
                        ? "Current"
                        : stop.kind === "start"
                          ? "Starting point"
                          : "Upcoming"}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </article>

      <div className="m2-map-placeholder" style={{ gridColumn: "1 / -1" }}>
        Interactive route map will be connected to Google Maps in a later
        milestone.
      </div>
    </section>
  );
}
