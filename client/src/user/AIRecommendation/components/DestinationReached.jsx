import TripActionRow from "./TripActionRow";

export default function DestinationReached({
  destinationName,
  originName,
  travelModeLabel,
  completing = false,
  completeError = null,
  saved = false,
  onRetry,
  onAcknowledge,
  actionsDisabled = false,
}) {
  return (
    <section className="m2-reached" aria-label="Destination reached">
      <header className="m2-nav-toolbar">
        <h1>Destination reached</h1>
      </header>
      <article className="m2-card">
        <p className="m2-badge">GPS preview</p>
        <p className="m2-metric-value">{destinationName}</p>
        <p className="m2-muted">
          Two accurate GPS fixes were within 100 metres of this destination.
          Arrival is saved automatically. This does not finish the whole trip.
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
        <div className="m2-live" aria-live="polite">
          {completing ? (
            <p className="m2-status m2-status--loading" role="status">
              Saving destination…
            </p>
          ) : null}
          {saved ? (
            <p className="m2-status" role="status">
              Destination saved as reached.
            </p>
          ) : null}
          {completeError ? (
            <p className="m2-status m2-status--error" role="alert">
              {completeError}
            </p>
          ) : null}
        </div>
        <TripActionRow
          left={
            <button
              type="button"
              className="m2-btn m2-btn--secondary"
              disabled
            >
              {saved ? "Reached" : "Stay here"}
            </button>
          }
          right={
            saved ? (
              <button
                type="button"
                className="m2-btn"
                onClick={onAcknowledge}
                disabled={actionsDisabled}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                className="m2-btn"
                onClick={onRetry}
                disabled={completing || !completeError || actionsDisabled}
              >
                {completing ? "Saving destination…" : "Retry save"}
              </button>
            )
          }
        />
      </article>
    </section>
  );
}
