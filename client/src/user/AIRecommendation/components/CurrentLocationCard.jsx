const STATUS_MESSAGES = {
  loading: "Getting your location…",
  denied:
    "Location access was denied. You can enable it in this site’s browser settings, or keep using the KL Sentral demo start.",
  unavailable:
    "Your location could not be determined. The KL Sentral demo start is still in use.",
  timeout:
    "The location request timed out. The KL Sentral demo start is still in use.",
  unsupported:
    "This browser does not support location. The KL Sentral demo start is still in use.",
  insecure:
    "Location can only be requested over a secure connection. The KL Sentral demo start is still in use.",
  error:
    "Location could not be updated. The KL Sentral demo start is still in use.",
};

function roundCoord(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toFixed(5);
}

export default function CurrentLocationCard({
  location,
  status,
  onRequestLocation,
  onUseDemoLocation,
}) {
  const isDevice = location.source === "device";
  const isLoading = status === "loading";
  const hasError = Boolean(STATUS_MESSAGES[status]) && status !== "loading";
  const showDemoReset = isDevice || hasError;
  const liveMessage = isLoading
    ? STATUS_MESSAGES.loading
    : hasError
      ? STATUS_MESSAGES[status]
      : isDevice
        ? "Current coordinates updated. Route figures remain demonstration estimates until live route services are connected."
        : "";

  return (
    <article className="m2-card m2-location-card" aria-label="Trip starting location">
      <div className="m2-location-head">
        <h3>Trip starting location</h3>
        <span className={isDevice ? "m2-source-badge m2-source-badge--device" : "m2-source-badge"}>
          {isDevice ? "Device location" : "Demo location"}
        </span>
      </div>

      <p className="m2-location-label">{location.label}</p>

      <dl className="m2-stat-row">
        <div className="m2-stat">
          <dt>Latitude</dt>
          <dd>{roundCoord(location.latitude)}</dd>
        </div>
        <div className="m2-stat">
          <dt>Longitude</dt>
          <dd>{roundCoord(location.longitude)}</dd>
        </div>
        {isDevice && location.accuracyMeters != null ? (
          <div className="m2-stat">
            <dt>Accuracy</dt>
            <dd>{Math.round(location.accuracyMeters)} m</dd>
          </div>
        ) : null}
      </dl>

      <div className="m2-live" aria-live="polite">
        {liveMessage ? (
          <p
            className={
              isLoading
                ? "m2-status m2-status--loading"
                : hasError
                  ? "m2-status m2-status--error"
                  : "m2-status m2-status--success"
            }
          >
            {liveMessage}
          </p>
        ) : null}
      </div>

      <div className="m2-actions">
        <button
          type="button"
          className="m2-btn"
          onClick={onRequestLocation}
          disabled={isLoading}
        >
          {isLoading ? "Getting your location…" : "Use My Current Location"}
        </button>
        {showDemoReset ? (
          <button
            type="button"
            className="m2-btn m2-btn--secondary"
            onClick={onUseDemoLocation}
            disabled={isLoading}
          >
            Use Demo Location
          </button>
        ) : null}
      </div>
    </article>
  );
}
