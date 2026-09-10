import TripMap from "./TripMap";
import { routeStopKind } from "../services/navigation/segmentOrigin.js";

const LOCATION_MESSAGES = {
  loading: "Getting your location…",
  denied:
    "Location access was denied. The saved origin is still in use.",
  unavailable:
    "Your location could not be determined. The saved origin is still in use.",
  timeout: "The location request timed out. The saved origin is still in use.",
  unsupported:
    "This browser does not support location. The saved origin is still in use.",
  insecure:
    "Location can only be requested over a secure connection. The saved origin is still in use.",
  error: "Location could not be updated. The saved origin is still in use.",
};

function formatCarbonKg(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0 kg CO₂e";
  if (value < 1) return `${value.toFixed(3)} kg CO₂e`;
  return `${value.toFixed(2)} kg CO₂e`;
}

function formatOptionalNumber(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Unavailable";
  return String(value);
}

function progressClass(kind) {
  if (kind === "CURRENT") return "m2-order-item m2-order-item--start";
  if (kind === "NEXT DESTINATION") return "m2-order-item m2-order-item--next";
  if (kind === "COMPLETED") return "m2-order-item m2-order-item--done";
  return "m2-order-item";
}

export default function ActiveTripOverview({
  itinerary,
  originName,
  originIsDevice = false,
  nextDestinationName,
  segmentNumber,
  totalSegments,
  currentStopIndex = 0,
  firstSegmentDistance,
  firstSegmentEta,
  locationStatus = "idle",
  onUseCurrentLocation,
  onUseSavedStart,
  locationLoading = false,
  startLocation,
  destinations = [],
  confirmingCancel = false,
  cancelError = null,
  isCancelling = false,
  onGo,
  goDisabled = false,
  goDisabledReason = null,
  originNotice = null,
  transportCarbonKg = 0,
  transportCarbonEmpty = true,
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

  const locationMessage = LOCATION_MESSAGES[locationStatus] || null;
  const showReset = originIsDevice || Boolean(locationMessage);
  const accommodations = itinerary?.accommodations ?? [];
  const stayCarbon = itinerary?.activitiesStayCarbonKg;

  return (
    <section className="m2-overview" aria-label="Active trip overview">
      <header className="m2-overview-hero">
        <p className="m2-chip">Live recommendation</p>
        <h1 className="m2-overview-title">Active Green Trip</h1>
        <div className="m2-overview-heading">
          <h2 className="m2-overview-itinerary">{title}</h2>
          <span className="m2-badge">In progress</span>
        </div>
        <p className="m2-overview-segment">
          Segment {segmentNumber} of {totalSegments}
        </p>
      </header>

      <div className="m2-overview-metrics">
        <article className="m2-card m2-metric-card">
          <h3>Current origin</h3>
          <p className="m2-metric-value">{originName}</p>
          <p className="m2-muted">
            {originIsDevice
              ? "Using your current location for this unfinished segment only."
              : "Using the saved itinerary origin."}
          </p>
        </article>
        <article className="m2-card m2-metric-card">
          <h3>Next destination</h3>
          <p className="m2-metric-value">{nextDestinationName}</p>
          <p className="m2-muted">Saved Module 1 order is unchanged.</p>
        </article>
        <article className="m2-card m2-metric-card">
          <h3>{firstSegmentDistance.label}</h3>
          <p className="m2-metric-value">{firstSegmentDistance.value}</p>
        </article>
        <article className="m2-card m2-metric-card">
          <h3>{firstSegmentEta.label}</h3>
          <p className="m2-metric-value">{firstSegmentEta.value}</p>
        </article>
      </div>

      <article className="m2-card" aria-label="Current location">
        <div className="m2-location-head">
          <h3>Use my current location</h3>
          <span className={originIsDevice ? "m2-source-badge m2-source-badge--device" : "m2-source-badge"}>
            {originIsDevice ? "Device location" : "Saved origin"}
          </span>
        </div>
        <p className="m2-muted">
          This overrides the current unfinished segment origin only. It does
          not reorder destinations.
        </p>
        <div className="m2-live" aria-live="polite">
          {locationStatus === "loading" ? (
            <p className="m2-status m2-status--loading">{LOCATION_MESSAGES.loading}</p>
          ) : null}
          {locationMessage && locationStatus !== "loading" ? (
            <p className="m2-status m2-status--error">{locationMessage}</p>
          ) : null}
          {originNotice ? (
            <p className="m2-status">{originNotice}</p>
          ) : null}
        </div>
        <div className="m2-actions">
          <button
            type="button"
            className="m2-btn m2-btn--secondary"
            onClick={onUseCurrentLocation}
            disabled={locationLoading}
          >
            {locationLoading ? "Getting your location…" : "Use My Current Location"}
          </button>
          {showReset ? (
            <button
              type="button"
              className="m2-btn m2-btn--secondary"
              onClick={onUseSavedStart}
              disabled={locationLoading}
            >
              Use Saved Origin
            </button>
          ) : null}
        </div>
      </article>

      <div className="m2-overview-grid">
        <article className="m2-card" aria-label="Saved destination order">
          <h3>Saved route</h3>
          <p className="m2-muted">
            Saved start → destination 1 → destination 2 → final destination.
            Completed destinations stay in the saved order.
          </p>
          <ol className="m2-order" style={{ marginTop: 16 }}>
            {stops.map((stop, index) => {
              const kind = routeStopKind({
                stopIndex: index,
                currentSegmentIndex: currentStopIndex,
                totalSegments,
                isStart: index === 0,
              });
              return (
                <li key={stop.id || `${stop.name}-${index}`} className={progressClass(kind)}>
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

        <article className="m2-card" aria-labelledby="m2-plan-eco-title">
          <h3 id="m2-plan-eco-title">{title} Plan Eco-Score</h3>
          <p className="m2-metric-value">{formatOptionalNumber(itinerary?.ecoScore)}</p>
          <p className="m2-muted">
            This is the saved itinerary planning score from Module 1. It is not
            the final completed-trip Eco-Score.
          </p>
          <dl className="m2-stat-row" style={{ marginTop: 16 }}>
            <div className="m2-stat">
              <dt>Accommodation</dt>
              <dd>{accommodations[0]?.name || "Unavailable"}</dd>
            </div>
            <div className="m2-stat">
              <dt>Activities / stay carbon</dt>
              <dd>
                {typeof stayCarbon === "number" && Number.isFinite(stayCarbon)
                  ? `${stayCarbon} kg CO₂e`
                  : "Unavailable"}
              </dd>
            </div>
          </dl>
        </article>
      </div>

      <article className="m2-card" aria-labelledby="m2-carbon-tracked-title">
        <h3 id="m2-carbon-tracked-title">Confirmed transportation carbon</h3>
        {transportCarbonEmpty ? (
          <p className="m2-muted">No completed transportation segments yet</p>
        ) : (
          <>
            <p className="m2-metric-value">{formatCarbonKg(transportCarbonKg)}</p>
            <p className="m2-muted">Sum of confirmed completed segments only.</p>
          </>
        )}
      </article>

      <article className="m2-card m2-map" aria-label="Trip map">
        <h3>Route map</h3>
        <TripMap
          startLocation={startLocation}
          destinations={destinations}
          encodedPolyline={null}
          routeTravelMode={null}
          markerSource="saved"
        />
      </article>

      {goDisabledReason ? (
        <p className="m2-status m2-status--error" role="status">
          {goDisabledReason}
        </p>
      ) : null}

      <div className="m2-overview-cta">
        <button
          type="button"
          className="m2-btn m2-btn--go"
          onClick={onGo}
          disabled={goDisabled || isCancelling}
        >
          GO
        </button>
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
      </div>
    </section>
  );
}
