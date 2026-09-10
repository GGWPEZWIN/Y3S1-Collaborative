function formatDateRange(itinerary) {
  if (itinerary?.startDate && itinerary?.endDate) {
    return `${itinerary.startDate} – ${itinerary.endDate}`;
  }
  return itinerary?.startDate || itinerary?.date || "Dates not provided";
}

export default function SavedItineraryPreview({ itinerary }) {
  const destinations = itinerary?.destinations ?? [];

  return (
    <article className="m2-card" aria-label="Saved itinerary">
      <div className="m2-location-head">
        <h3>{itinerary?.title || "Saved itinerary"}</h3>
        <span className="m2-badge">Module 1 itinerary</span>
      </div>
      <p className="m2-muted">{formatDateRange(itinerary || {})}</p>
      <ol className="m2-order" style={{ marginTop: 16 }}>
        {itinerary?.startLocation ? (
          <li className="m2-order-item m2-order-item--start">
            <span className="m2-order-index" aria-hidden="true">
              1
            </span>
            <div>
              <div>{itinerary.startLocation.name}</div>
              <div className="m2-chip">Start</div>
            </div>
          </li>
        ) : null}
        {destinations.map((destination, index) => (
          <li
            key={`${destination.destinationId}-${index}`}
            className="m2-order-item"
          >
            <span className="m2-order-index" aria-hidden="true">
              {(itinerary?.startLocation ? 2 : 1) + index}
            </span>
            <div>
              <div>{destination.name}</div>
              <div className="m2-chip">
                {destination.routeable ? `Stop ${destination.order}` : "Needs coordinates"}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}
