export default function DestinationReached({
  destinationName,
  originName,
  travelModeLabel,
  completing = false,
  completeError = null,
  onComplete,
  onBackToOverview,
}) {
  return (
    <section className="m2-reached" aria-label="Destination reached">
      <header className="m2-nav-toolbar">
        <h1>Destination reached</h1>
        <button
          type="button"
          className="m2-btn m2-btn--secondary m2-btn--icon"
          onClick={onBackToOverview}
          aria-label="Back to Route Overview"
        >
          X
        </button>
      </header>
      <article className="m2-card">
        <p className="m2-badge">GPS preview</p>
        <p className="m2-metric-value">{destinationName}</p>
        <p className="m2-muted">
          Two accurate GPS fixes were within 100 metres of this destination.
          Confirm to save this segment. This does not finish the whole trip.
        </p>
        <dl className="m2-stat-row" style={{ marginTop: 16 }}>
          <div className="m2-stat">
            <dt>Origin</dt>
            <dd>{originName}</dd>
          </div>
          <div className="m2-stat">
            <dt>Selected transport</dt>
            <dd>{travelModeLabel}</dd>
          </div>
        </dl>
        {completeError ? (
          <p className="m2-status m2-status--error" role="alert">
            {completeError}
          </p>
        ) : null}
        <div className="m2-actions">
          <button
            type="button"
            className="m2-btn"
            onClick={onComplete}
            disabled={completing}
          >
            {completing ? "Saving destination…" : "Complete This Destination"}
          </button>
          <button
            type="button"
            className="m2-btn m2-btn--secondary"
            onClick={onBackToOverview}
            disabled={completing}
          >
            Back to Route Overview
          </button>
        </div>
      </article>
    </section>
  );
}
