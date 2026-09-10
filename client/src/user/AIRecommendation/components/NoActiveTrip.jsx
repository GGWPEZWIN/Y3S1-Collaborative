export default function NoActiveTrip({ onBrowseItineraries }) {
  return (
    <article className="m2-card m2-empty-trip" aria-label="No active trip">
      <p className="m2-chip">Trip session</p>
      <h2 className="m2-empty-title">No active trip</h2>
      <p className="m2-muted">
        Start a saved itinerary to get live transport recommendations for the
        next destination.
      </p>
      <div className="m2-actions">
        <button type="button" className="m2-btn" onClick={onBrowseItineraries}>
          Open itineraries
        </button>
      </div>
    </article>
  );
}
