import {
  formatCarbonKg,
  formatCompletionDate,
  formatDistanceMeters,
  formatDurationSeconds,
  formatScore,
  travelModeLabel,
  visibilityLabel,
} from "../services/report/reportDisplay.js";

export default function CompletedEcoReport({
  reportView,
  publishing = false,
  publishError = null,
  onPublish,
}) {
  const isPublic = Boolean(reportView?.isPublic);

  return (
    <section className="m2-overview m2-complete" aria-label="Completed Eco Report">
      <header className="m2-overview-hero m2-success-hero">
        <p className="m2-chip">Trip completed</p>
        <h1 className="m2-overview-title">Eco Report</h1>
        <div className="m2-overview-heading">
          <h2 className="m2-overview-itinerary">{reportView?.title || "Green trip"}</h2>
          <span className={isPublic ? "m2-badge m2-badge--public" : "m2-badge m2-badge--private"}>
            {visibilityLabel(reportView?.visibility)}
          </span>
        </div>
        <p className="m2-overview-segment">
          {reportView?.reachedCount || 0} reached · {reportView?.skippedCount || 0} skipped ·{" "}
          {reportView?.destinationCount || 0} planned · {formatCompletionDate(reportView?.completedAt)}
        </p>
      </header>

      <article className="m2-card m2-score-card" aria-labelledby="m2-final-score-title">
        <h3 id="m2-final-score-title">Final Trip Eco-Score</h3>
        <p className="m2-score-hero">
          {reportView?.noCompletedTravel
            ? "No completed travel recorded"
            : formatScore(reportView?.finalEcoScore)}
        </p>
        <p className="m2-muted">{reportView?.formulaExplanation}</p>
      </article>

      <div className="m2-overview-metrics">
        <article className="m2-card m2-metric-card">
          <h3>Plan Eco-Score</h3>
          <p className="m2-metric-value">{formatScore(reportView?.planEcoScore)}</p>
        </article>
        <article className="m2-card m2-metric-card">
          <h3>Transportation Eco-Score</h3>
          <p className="m2-metric-value">
            {reportView?.noCompletedTravel
              ? "No completed travel recorded"
              : formatScore(reportView?.transportationEcoScore)}
          </p>
        </article>
        <article className="m2-card m2-metric-card">
          <h3>Recorded completed transportation carbon</h3>
          <p className="m2-metric-value">
            {reportView?.noCompletedTravel
              ? "No completed travel recorded"
              : formatCarbonKg(reportView?.confirmedTransportationCarbonKg)}
          </p>
          <p className="m2-muted">{reportView?.carbonExplanation}</p>
        </article>
      </div>

      <article className="m2-card" aria-label="Completed route">
        <h3>Saved route</h3>
        <p className="m2-muted">
          {reportView?.originName || "Unavailable"}
          {(reportView?.destinationNames || []).map((name) => ` → ${name}`).join("")}
        </p>
        {(reportView?.destinationOutcomes || []).length > 0 ? (
          <ol className="m2-order" style={{ marginTop: 16 }}>
            {(reportView.destinationOutcomes || []).map((entry, index) => (
              <li
                key={`${entry.segmentIndex}-${index}`}
                className={
                  entry.outcome === "skipped"
                    ? "m2-order-item m2-order-item--skipped"
                    : "m2-order-item m2-order-item--done"
                }
              >
                <span className="m2-order-index" aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <div>{entry.destinationName || "Unavailable"}</div>
                  <div className="m2-chip">
                    {entry.outcome === "skipped" ? "SKIPPED" : "REACHED"}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : null}
        <h3 style={{ marginTop: 20 }}>Completed travel</h3>
        {reportView?.noCompletedTravel || (reportView?.segments || []).length === 0 ? (
          <p className="m2-muted">No completed travel recorded.</p>
        ) : (
        <ol className="m2-segment-list">
          {(reportView?.segments || []).map((segment, index) => (
            <li key={`${segment.segmentIndex}-${index}`} className="m2-segment-item">
              <div className="m2-segment-title">
                {segment.originName || "Unavailable"} → {segment.destinationName || "Unavailable"}
              </div>
              <dl className="m2-stat-row">
                <div className="m2-stat">
                  <dt>Transport</dt>
                  <dd>{travelModeLabel(segment.travelMode)}</dd>
                </div>
                <div className="m2-stat">
                  <dt>Distance</dt>
                  <dd>{formatDistanceMeters(segment.distanceMeters)}</dd>
                </div>
                <div className="m2-stat">
                  <dt>Duration</dt>
                  <dd>{formatDurationSeconds(segment.durationSeconds)}</dd>
                </div>
                <div className="m2-stat">
                  <dt>Transportation carbon</dt>
                  <dd>{formatCarbonKg(segment.carbonKgCo2e)}</dd>
                </div>
                <div className="m2-stat">
                  <dt>Eco-Score</dt>
                  <dd>{formatScore(segment.prototypeEcoScore)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
        )}
      </article>

      <div className="m2-live" aria-live="polite">
        {publishError ? (
          <p className="m2-status m2-status--error" role="alert">
            {publishError}
          </p>
        ) : null}
        {publishing ? (
          <p className="m2-status m2-status--loading" role="status">
            Sharing your Eco Report…
          </p>
        ) : null}
      </div>

      <div className="m2-overview-cta">
        {isPublic ? (
          <p className="m2-notice" role="status">
            Public — ready for Community Hub
          </p>
        ) : (
          <button
            type="button"
            className="m2-btn m2-btn--go"
            onClick={onPublish}
            disabled={publishing}
          >
            Share Eco Report to Community
          </button>
        )}
      </div>
    </section>
  );
}
