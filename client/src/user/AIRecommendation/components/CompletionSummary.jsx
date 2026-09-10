import { formatCarbonKg, formatScore } from "../services/report/reportDisplay.js";

export default function CompletionSummary({
  summary,
  confirmingCancel = false,
  cancelError = null,
  isCancelling = false,
  finishDisabled = false,
  finishError = null,
  onFinish,
  onRequestCancel,
  onConfirmCancel,
  onKeepTrip,
}) {
  const title = summary?.title || "Green trip";

  return (
    <section className="m2-overview m2-complete" aria-label="Completion summary">
      <header className="m2-overview-hero m2-success-hero">
        <p className="m2-chip">Trip complete</p>
        <h1 className="m2-overview-title">All destinations reached</h1>
        <div className="m2-overview-heading">
          <h2 className="m2-overview-itinerary">{title}</h2>
          <span className="m2-badge">Ready to finish</span>
        </div>
        <p className="m2-overview-segment">
          {summary?.destinationCount || 0} saved destinations completed
        </p>
      </header>

      <article className="m2-card m2-score-card" aria-labelledby="m2-final-preview-title">
        <h3 id="m2-final-preview-title">Final Trip Eco-Score preview</h3>
        <p className="m2-score-hero">{formatScore(summary?.finalEcoScore)}</p>
        <p className="m2-muted">{summary?.formulaExplanation}</p>
      </article>

      <div className="m2-overview-metrics">
        <article className="m2-card m2-metric-card">
          <h3>Plan Eco-Score</h3>
          <p className="m2-metric-value">{formatScore(summary?.planEcoScore)}</p>
          <p className="m2-muted">Saved itinerary planning score from Module 1.</p>
        </article>
        <article className="m2-card m2-metric-card">
          <h3>Transportation Eco-Score</h3>
          <p className="m2-metric-value">{formatScore(summary?.transportationEcoScore)}</p>
          <p className="m2-muted">Average of completed segment scores.</p>
        </article>
        <article className="m2-card m2-metric-card">
          <h3>Confirmed transportation carbon</h3>
          <p className="m2-metric-value">
            {formatCarbonKg(summary?.confirmedTransportationCarbonKg)}
          </p>
          <p className="m2-muted">Sum of confirmed completed segments only.</p>
        </article>
      </div>

      <article className="m2-card" aria-label="Saved route">
        <h3>Saved route</h3>
        <ol className="m2-order" style={{ marginTop: 16 }}>
          {(summary?.stops || []).map((stop, index) => (
            <li
              key={stop.id || `${stop.name}-${index}`}
              className="m2-order-item m2-order-item--done"
            >
              <span className="m2-order-index" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <div>{stop.name}</div>
                <div className="m2-chip">{stop.kind}</div>
              </div>
            </li>
          ))}
        </ol>
      </article>

      <div className="m2-live" aria-live="polite">
        {finishError ? (
          <p className="m2-status m2-status--error" role="alert">
            {finishError}
          </p>
        ) : null}
        {cancelError ? (
          <p className="m2-status m2-status--error" role="alert">
            {cancelError}
          </p>
        ) : null}
      </div>

      <div className="m2-overview-cta">
        <button
          type="button"
          className="m2-btn m2-btn--go"
          onClick={onFinish}
          disabled={finishDisabled || isCancelling}
        >
          Finish Trip
        </button>
        <div className="m2-actions m2-actions--cancel">
          {confirmingCancel ? (
            <>
              <button
                type="button"
                className="m2-btn m2-btn--danger"
                onClick={onConfirmCancel}
                disabled={isCancelling || finishDisabled}
              >
                {isCancelling ? "Cancelling…" : "Confirm Cancel"}
              </button>
              <button
                type="button"
                className="m2-btn m2-btn--secondary"
                onClick={onKeepTrip}
                disabled={isCancelling || finishDisabled}
              >
                Keep Trip
              </button>
            </>
          ) : (
            <button
              type="button"
              className="m2-btn m2-btn--danger m2-btn--secondary-danger"
              onClick={onRequestCancel}
              disabled={isCancelling || finishDisabled}
            >
              Cancel Trip
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
