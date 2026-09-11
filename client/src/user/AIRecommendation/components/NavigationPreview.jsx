import TripMap from "./TripMap";
import TripActionRow from "./TripActionRow";
import {
  formatMetersAsKilometres,
  formatSecondsAsMinutes,
} from "../services/formatMeasurement.js";

const TRAVEL_MODE_LABEL = {
  WALK: "Walking",
  TRANSIT: "Public transit",
  DRIVE: "Driving",
};

const GPS_STATUS_MESSAGES = {
  requesting: "Waiting for location permission…",
  tracking: "GPS tracking is on for this navigation preview only.",
  permission_denied:
    "Location permission was denied. You can still follow the selected route on the map.",
  temporarily_unavailable:
    "Location is temporarily unavailable. The selected route is still shown.",
  poor_accuracy:
    "GPS accuracy is too low to confirm arrival or route deviation.",
};

const RECALCULATE_ERROR_MESSAGES = {
  INVALID_ROUTE_REQUEST:
    "The route could not be recalculated. The previous route is still shown.",
  ROUTES_NOT_CONFIGURED:
    "Live routing is not available. The previous route is still shown.",
  ROUTE_NOT_FOUND:
    "No replacement route was found. The previous route is still shown.",
  ROUTES_TIMEOUT:
    "The route request timed out. The previous route is still shown.",
  ROUTES_UPSTREAM_ERROR:
    "The route could not be recalculated. The previous route is still shown.",
  UNAVAILABLE:
    "The route could not be recalculated. The previous route is still shown.",
  AUTH_REQUIRED: "Please sign in again to recalculate the route.",
  INVALID_AUTH_TOKEN: "Please sign in again to recalculate the route.",
};

function gpsStatusClass(status) {
  if (status === "tracking") return "m2-status";
  if (status === "requesting") return "m2-status m2-status--loading";
  if (status === "poor_accuracy") return "m2-status m2-status--error";
  if (status === "permission_denied" || status === "temporarily_unavailable") {
    return "m2-status m2-status--error";
  }
  return "m2-muted";
}

export default function NavigationPreview({
  startLocation,
  destinations,
  liveOriginName,
  liveDestinationName,
  selectedTravelMode = "TRANSIT",
  liveRoute = null,
  markerSource = "saved",
  gpsStatus = "idle",
  gpsAccuracyMeters = null,
  currentLocation = null,
  isDeviated = false,
  recalculateStatus = "idle",
  recalculateError = null,
  canRecalculate = false,
  onRecalculate,
  onBackToTransport,
  onNextNavigation,
  actionsDisabled = false,
}) {
  const modeLabel = TRAVEL_MODE_LABEL[selectedTravelMode] || "Selected transport";
  const encodedPolyline =
    liveRoute && typeof liveRoute.encodedPolyline === "string"
      ? liveRoute.encodedPolyline
      : null;
  const gpsMessage = GPS_STATUS_MESSAGES[gpsStatus] || null;
  const recalculating = recalculateStatus === "loading";

  return (
    <section className="m2-grid m2-nav-preview" aria-label="Navigation preview">
      <article className="m2-card">
        <header className="m2-nav-toolbar">
          <div>
            <h3>Navigation Preview</h3>
            <p className="m2-badge">Web / PWA preview</p>
          </div>
        </header>
        <p className="m2-muted">
          This is a GPS-assisted selected-route preview. It is not Google
          Navigation SDK turn-by-turn guidance. Instructions are shown only
          when the current backend returns them.
        </p>
        <dl className="m2-stat-row" style={{ marginTop: 16 }}>
          <div className="m2-stat">
            <dt>Selected transport</dt>
            <dd>{modeLabel}</dd>
          </div>
          <div className="m2-stat">
            <dt>Destination</dt>
            <dd>{liveDestinationName}</dd>
          </div>
          <div className="m2-stat">
            <dt>Origin</dt>
            <dd>{liveOriginName}</dd>
          </div>
          <div className="m2-stat">
            <dt>Selected route distance</dt>
            <dd>
              {liveRoute
                ? formatMetersAsKilometres(liveRoute.distanceMeters)
                : "Unavailable"}
            </dd>
          </div>
          <div className="m2-stat">
            <dt>Selected route duration</dt>
            <dd>
              {liveRoute
                ? formatSecondsAsMinutes(liveRoute.durationSeconds)
                : "Unavailable"}
            </dd>
          </div>
          {typeof gpsAccuracyMeters === "number" &&
          Number.isFinite(gpsAccuracyMeters) ? (
            <div className="m2-stat">
              <dt>GPS accuracy</dt>
              <dd>{Math.round(gpsAccuracyMeters)} m</dd>
            </div>
          ) : null}
        </dl>
        <div className="m2-live" aria-live="polite">
          {gpsMessage ? (
            <p className={gpsStatusClass(gpsStatus)}>{gpsMessage}</p>
          ) : null}
        </div>
        {selectedTravelMode === "WALK" ? (
          <p className="m2-walk-notice" role="note">
            Walking routes are in beta. Check sidewalks, pedestrian access, and
            local conditions before travelling.
          </p>
        ) : null}
        <TripActionRow
          left={
            <button
              type="button"
              className="m2-btn m2-btn--secondary"
              onClick={onBackToTransport}
              disabled={actionsDisabled}
            >
              Back to Transport
            </button>
          }
          right={
            <button
              type="button"
              className="m2-btn"
              onClick={onNextNavigation}
              disabled={actionsDisabled}
            >
              Next Navigation
            </button>
          }
          helper="Next Navigation skips this destination if you have not arrived."
        />
      </article>

      {isDeviated ? (
        <article className="m2-card m2-deviation" role="status">
          <h3>You may be off the selected route</h3>
          <p className="m2-muted">
            Two accurate GPS fixes were farther from the selected route than
            the deviation threshold. Recalculate to replace only this
            selected route, or return to transport comparison without completing or
            skipping this destination.
          </p>
          {recalculateError ? (
            <p className="m2-status m2-status--error" role="alert">
              {RECALCULATE_ERROR_MESSAGES[recalculateError] ||
                RECALCULATE_ERROR_MESSAGES.UNAVAILABLE}
            </p>
          ) : null}
          <TripActionRow
            left={
              <button
                type="button"
                className="m2-btn m2-btn--secondary"
                onClick={onBackToTransport}
                disabled={recalculating || actionsDisabled}
              >
                Back to Transport
              </button>
            }
            right={
              <button
                type="button"
                className="m2-btn"
                onClick={onRecalculate}
                disabled={!canRecalculate || recalculating || actionsDisabled}
              >
                {recalculating ? "Recalculating…" : "Recalculate Route"}
              </button>
            }
          />
        </article>
      ) : null}

      <TripMap
        startLocation={startLocation}
        destinations={destinations}
        encodedPolyline={encodedPolyline}
        routeTravelMode={liveRoute ? selectedTravelMode : null}
        markerSource={markerSource}
        currentLocation={currentLocation}
        currentLocationAccuracyMeters={gpsAccuracyMeters}
        legendLabel="Displayed selected route"
      />
    </section>
  );
}
