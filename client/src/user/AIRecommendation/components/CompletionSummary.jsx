import { formatCarbonKg, formatScore } from "../services/report/reportDisplay.js";
import TripActionRow from "./TripActionRow";

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
  const headingTitle = summary?.headingTitle || "Trip ready to finish";
  const carbonValue = summary?.noCompletedTravel
    ? "No completed travel recorded"
    : formatCarbonKg(summary?.confirmedTransportationCarbonKg);
  const transportValue = summary?.noCompletedTravel
    ? "No completed travel recorded"
    : formatScore(summary?.transportationEcoScore);
  const finalValue = summary?.noCompletedTravel
    ? "No completed travel recorded"
    : formatScore(summary?.finalEcoScore);

  return (
    <section className="m2-overview m2-complete" aria-label="Completion summary">
      <header className="m2-overview-hero m2-success-hero">
        <p className="m2-chip">{summary?.headingChip || "Trip summary"}</p>
        <h1 className="m2-overview-title">{headingTitle}</h1>
        <div className="m2-overview-heading">
          <h2 className="m2-overview-itinerary">{title}</h2>
          <span className="m2-badge">Ready to finish</span>
        </div>
        <p className="m2-overview-segment">
          {summary?.headingSubtitle ||
            `${summary?.reachedCount || 0} reached · ${summary?.skippedCount || 0} skipped · ${summary?.destinationCount || 0} planned`}
        </p>
      </header>

      <article className="m2-card m2-score-card" aria-labelledby="m2-final-preview-title">
        <h3 id="m2-final-preview-title">Final Trip Eco-Score preview</h3>
        <p className="m2-score-hero">{finalValue}</p>
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
          <p className="m2-metric-value">{transportValue}</p>
          <p className="m2-muted">Average of completed travel scores only. Skipped stops are excluded.</p>
        </article>
        <article className="m2-card m2-metric-card">
          <h3>Recorded completed transportation carbon</h3>
          <p className="m2-metric-value">{carbonValue}</p>
          <p className="m2-muted">{summary?.carbonExplanation}</p>
        </article>
      </div>

      <article className="m2-card" aria-label="Saved route">
        <h3>Saved route</h3>
        <ol className="m2-order" style={{ marginTop: 16 }}>
          {(summary?.stops || []).map((stop, index) => (
            <li
              key={stop.id || `${stop.name}-${index}`}
              className={
                stop.kind === "SKIPPED"
                  ? "m2-order-item m2-order-item--skipped"
                  : stop.kind === "START"
                    ? "m2-order-item m2-order-item--start"
                    : "m2-order-item m2-order-item--done"
              }
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

      <TripActionRow
        left={
          confirmingCancel ? (
            <button
              type="button"
              className="m2-btn m2-btn--danger"
              onClick={onConfirmCancel}
              disabled={isCancelling || finishDisabled}
            >
              {isCancelling ? "Cancelling…" : "Confirm Cancel"}
            </button>
          ) : (
            <button
              type="button"
              className="m2-btn m2-btn--danger m2-btn--secondary-danger"
              onClick={onRequestCancel}
              disabled={isCancelling || finishDisabled}
            >
              Cancel Trip
            </button>
          )
        }
        right={
          confirmingCancel ? (
            <button
              type="button"
              className="m2-btn m2-btn--secondary"
              onClick={onKeepTrip}
              disabled={isCancelling || finishDisabled}
            >
              Keep Trip
            </button>
          ) : (
            <button
              type="button"
              className="m2-btn"
              onClick={onFinish}
              disabled={finishDisabled || isCancelling}
            >
              Finish Trip
            </button>
          )
        }
      />
    </section>
  );
}
