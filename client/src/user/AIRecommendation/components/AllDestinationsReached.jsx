function formatCarbonKg(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0 kg CO₂e";
  if (value < 1) return `${value.toFixed(3)} kg CO₂e`;
  return `${value.toFixed(2)} kg CO₂e`;
}

function stopKind(index, currentSegmentIndex, totalSegments) {
  if (currentSegmentIndex >= totalSegments) {
    return index === 0 ? "START" : "COMPLETED";
  }
  if (index === 0) return currentSegmentIndex === 0 ? "CURRENT" : "START";
  const destinationIndex = index - 1;
  if (destinationIndex < currentSegmentIndex) return "COMPLETED";
  if (destinationIndex === currentSegmentIndex) return "NEXT DESTINATION";
  return "UPCOMING";
}

export default function AllDestinationsReached({
  itinerary,
  transportCarbonKg = 0,
  transportCarbonEmpty = true,
  confirmingCancel = false,
  cancelError = null,
  isCancelling = false,
  onRequestCancel,
  onConfirmCancel,
  onKeepTrip,
}) {
  const title = itinerary?.title || "Green trip";
  const stops = [];
  if (itinerary?.startLocation) {
    stops.push({
      id: itinerary.startLocation.locationId || "start",
      name: itinerary.startLocation.name,
    });
  }
  (itinerary?.destinations || []).forEach((destination) => {
    stops.push({
      id: destination.destinationId,
      name: destination.name,
    });
  });
  const totalSegments = Math.max(stops.length - 1, 0);

  return (
    <section className="m2-overview" aria-label="All destinations reached">
      <header className="m2-overview-hero">
        <p className="m2-chip">Live recommendation</p>
        <h1 className="m2-overview-title">All Destinations Reached</h1>
        <div className="m2-overview-heading">
          <h2 className="m2-overview-itinerary">{title}</h2>
          <span className="m2-badge">Destinations complete</span>
        </div>
        <p className="m2-muted">
          Every saved destination has been confirmed. Final trip completion
          and Eco Report creation are the next step and are not available yet.
        </p>
      </header>

      <article className="m2-card">
        <h3>Saved route</h3>
        <ol className="m2-order" style={{ marginTop: 16 }}>
          {stops.map((stop, index) => {
            const kind = stopKind(index, totalSegments, totalSegments);
            return (
              <li
                key={stop.id || `${stop.name}-${index}`}
                className={
                  kind === "COMPLETED"
                    ? "m2-order-item m2-order-item--done"
                    : "m2-order-item"
                }
              >
                <span className="m2-order-index" aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <div>{stop.name}</div>
                  <div className="m2-chip">{kind}</div>
                </div>
              </li>
            );
          })}
        </ol>
      </article>

      <article className="m2-card" aria-labelledby="m2-carbon-tracked-title">
        <h3 id="m2-carbon-tracked-title">Confirmed transportation carbon</h3>
        <dl className="m2-stat-row">
          <div className="m2-stat">
            <dt>Transportation</dt>
            <dd>{formatCarbonKg(transportCarbonKg)}</dd>
            <p className="m2-muted">
              {transportCarbonEmpty
                ? "No completed transport segments yet"
                : "Sum of confirmed completed segments only."}
            </p>
          </div>
          <div className="m2-stat" data-status="pending">
            <dt>Food waste</dt>
            <dd>0 kg CO₂e</dd>
            <p className="m2-muted">Awaiting Waste Module data</p>
          </div>
        </dl>
      </article>

      {cancelError ? (
        <p className="m2-status m2-status--error" role="alert">
          {cancelError}
        </p>
      ) : null}

      <div className="m2-actions m2-actions--cancel">
        {confirmingCancel ? (
          <>
            <button
              type="button"
              className="m2-btn m2-btn--danger"
              onClick={onConfirmCancel}
              disabled={isCancelling}
            >
              {isCancelling ? "Cancelling…" : "Confirm Cancel"}
            </button>
            <button
              type="button"
              className="m2-btn m2-btn--secondary"
              onClick={onKeepTrip}
              disabled={isCancelling}
            >
              Keep Trip
            </button>
          </>
        ) : (
          <button
            type="button"
            className="m2-btn m2-btn--danger m2-btn--secondary-danger"
            onClick={onRequestCancel}
            disabled={isCancelling}
          >
            Cancel Trip
          </button>
        )}
      </div>
    </section>
  );
}
