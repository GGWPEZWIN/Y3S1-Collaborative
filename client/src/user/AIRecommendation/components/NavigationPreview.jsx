import TripMap from "./TripMap";
import {
  formatKilometres,
  formatMetersAsKilometres,
  formatMinutes,
  formatSecondsAsMinutes,
  sumFiniteNumbers,
} from "../services/formatMeasurement.js";

const TRAVEL_MODE_LABEL = {
  WALK: "Walking",
  TRANSIT: "Public transit",
  DRIVE: "Driving",
};

const TRAVEL_MODE_TITLE = {
  WALK: "Walking",
  TRANSIT: "Public Transit",
  DRIVE: "Driving",
};

const LIVE_ERROR_MESSAGES = {
  INVALID_ROUTE_REQUEST:
    "The live route request was invalid. You can retry or keep using the demonstration map.",
  ROUTES_NOT_CONFIGURED:
    "Live routing is not available on this server. The demonstration map is still usable.",
  ROUTE_NOT_FOUND:
    "No live route was found for this first segment. The demonstration map is still usable.",
  ROUTES_TIMEOUT:
    "The live route request timed out. You can retry, or keep using the demonstration map.",
  ROUTES_UPSTREAM_ERROR:
    "The live route could not be loaded. You can retry, or keep using the demonstration map.",
  UNAVAILABLE:
    "The live route could not be loaded. You can retry, or keep using the demonstration map.",
  AUTH_REQUIRED: "Please sign in again to load the live route.",
  INVALID_AUTH_TOKEN: "Please sign in again to load the live route.",
};

function loadButtonLabel(travelMode, { loading, canRefresh }) {
  const title = TRAVEL_MODE_TITLE[travelMode] || "Route";
  if (loading) return `Loading selected ${title.toLowerCase()} route…`;
  if (canRefresh) return `Refresh Selected ${title} Route`;
  return `Load Selected ${title} Route`;
}

export default function NavigationPreview({
  stops,
  segments,
  startLocation,
  destinations,
  currentIndex,
  paused,
  onPause,
  onResume,
  onNext,
  onBack,
  liveOriginName,
  liveDestinationName,
  selectedTravelMode = "TRANSIT",
  liveRouteStatus = "idle",
  liveRoute = null,
  liveRouteError = null,
  liveRouteSource = null,
  markerSource = "demo",
  onLoadLiveRoute,
  progressControlsEnabled = false,
  progressDisabledReason = null,
  allowNextDestination = false,
  backLabel = "Back to Route Overview",
  useSessionProgressLabels = false,
}) {
  const lastIndex = stops.length - 1;
  const current = stops[currentIndex];
  const next = stops[currentIndex + 1];
  const completed = currentIndex >= lastIndex;
  const isSavedItinerary = markerSource === "saved";
  const remainingSegments = Array.isArray(segments)
    ? segments.slice(currentIndex)
    : [];
  const remainingMinutes = isSavedItinerary
    ? null
    : completed
      ? 0
      : sumFiniteNumbers(
          remainingSegments.map((segment) => segment.estimatedDurationMinutes)
        );
  const remainingKm = isSavedItinerary
    ? null
    : completed
      ? 0
      : sumFiniteNumbers(
          remainingSegments.map((segment) => segment.estimatedDistanceKm)
        );
  const modeLabel = TRAVEL_MODE_LABEL[selectedTravelMode] || "Public transit";
  const liveSuccess = liveRouteStatus === "success" && liveRoute;
  const showWalkNotice =
    selectedTravelMode === "WALK" && liveSuccess;
  const canLoadDirect = typeof onLoadLiveRoute === "function";
  const isLoading = liveRouteStatus === "loading";
  const encodedPolyline =
    liveSuccess && typeof liveRoute.encodedPolyline === "string"
      ? liveRoute.encodedPolyline
      : null;

  return (
    <section className="m2-grid" aria-label="Navigation preview">
      <article className="m2-card">
        <h3>Navigation Preview</h3>
        <p className="m2-badge" style={{ marginBottom: 12 }}>
          Simulation
        </p>
        <p className="m2-muted">
          {isSavedItinerary
            ? "This itinerary has no whole-route distance or duration yet. A live first-segment result is shown separately and is not a trip total."
            : "Full-itinerary demonstration totals below stay separate from the live first-segment route."}
        </p>
        <dl className="m2-stat-row">
          <div className="m2-stat">
            <dt>
              {isSavedItinerary
                ? "Current saved stop"
                : "Current demonstration segment"}
            </dt>
            <dd>{current?.name}</dd>
          </div>
          <div className="m2-stat">
            <dt>Next destination</dt>
            <dd>{next ? next.name : "None"}</dd>
          </div>
          <div className="m2-stat">
            <dt>
              {isSavedItinerary
                ? "Itinerary remaining time"
                : "Demonstration remaining time"}
            </dt>
            <dd>{formatMinutes(remainingMinutes)}</dd>
          </div>
          <div className="m2-stat">
            <dt>
              {isSavedItinerary
                ? "Itinerary remaining distance"
                : "Demonstration remaining distance"}
            </dt>
            <dd>{formatKilometres(remainingKm)}</dd>
          </div>
        </dl>
        {paused ? (
          <p className="m2-muted" style={{ marginTop: 12 }}>
            Preview paused. Resume to continue this simulation.
          </p>
        ) : null}
        {completed ? (
          <p className="m2-complete" role="status">
            {isSavedItinerary
              ? "Saved itinerary preview completed"
              : "Demo trip completed"}
          </p>
        ) : null}
        {progressDisabledReason ? (
          <p className="m2-muted" style={{ marginTop: 12 }} role="note">
            {progressDisabledReason}
          </p>
        ) : null}
        <div className="m2-actions">
          <button
            type="button"
            className="m2-btn m2-btn--secondary"
            onClick={onPause}
            disabled={!progressControlsEnabled || paused || completed}
          >
            Pause Preview
          </button>
          <button
            type="button"
            className="m2-btn m2-btn--secondary"
            onClick={onResume}
            disabled={!progressControlsEnabled || !paused || completed}
          >
            Resume Preview
          </button>
          <button
            type="button"
            className="m2-btn"
            onClick={onNext}
            disabled={
              !progressControlsEnabled ||
              !allowNextDestination ||
              paused ||
              completed
            }
          >
            Next Destination
          </button>
          <button
            type="button"
            className="m2-btn m2-btn--secondary"
            onClick={onBack}
          >
            {backLabel}
          </button>
        </div>
      </article>

      <article className="m2-card">
        <h4>Ordered destination progress</h4>
        <ol className="m2-order">
          {stops.map((stop, index) => {
            const sessionKind = useSessionProgressLabels
              ? index === currentIndex
                ? "CURRENT"
                : index === currentIndex + 1
                  ? "NEXT DESTINATION"
                  : "UPCOMING"
              : null;
            const done = !useSessionProgressLabels && (index < currentIndex || completed);
            const here = !useSessionProgressLabels && index === currentIndex && !completed;
            return (
              <li
                key={stop.stopId}
                className={
                  sessionKind === "CURRENT" || here
                    ? "m2-order-item m2-order-item--start"
                    : sessionKind === "NEXT DESTINATION"
                      ? "m2-order-item m2-order-item--next"
                      : done
                        ? "m2-order-item m2-order-item--done"
                        : "m2-order-item"
                }
              >
                <span className="m2-order-index" aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <div>{stop.name}</div>
                  <div className="m2-chip">
                    {sessionKind
                      ? sessionKind
                      : done
                        ? "Completed"
                        : here
                          ? "Current"
                          : stop.kind === "start"
                            ? "Starting point"
                            : "Upcoming"}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </article>

      <article className="m2-card m2-live-route" aria-label={`Live ${modeLabel.toLowerCase()} route`}>
        <div className="m2-live-route-head">
          <h3>Live {modeLabel.toLowerCase()} route</h3>
          {liveSuccess ? (
            <span className="m2-source-badge m2-source-badge--live">
              Live Google Routes
            </span>
          ) : (
            <span className="m2-source-badge">First segment only</span>
          )}
        </div>
        <p className="m2-muted">
          Selected transport: {modeLabel}. This first-segment preview uses your
          effective start to {liveDestinationName}.
          {isSavedItinerary
            ? " First-segment live values are not whole-itinerary totals."
            : " Full-itinerary demonstration totals above are unchanged."}
        </p>
        <div className="m2-live" aria-live="polite">
          {liveRouteStatus === "idle" ? (
            <p className="m2-muted">
              No live route has been loaded for {modeLabel.toLowerCase()}. Map
              markers stay on the{" "}
              {isSavedItinerary ? "saved itinerary" : "demonstration itinerary"}.
            </p>
          ) : null}
          {liveRouteStatus === "comparison-loading" ? (
            <p className="m2-status m2-status--loading">
              Live comparison is loading. This preview will reuse that result
              when it finishes, without an extra request.
            </p>
          ) : null}
          {isLoading ? (
            <p className="m2-status m2-status--loading">
              Loading selected {modeLabel.toLowerCase()} route…
            </p>
          ) : null}
          {liveRouteStatus === "error" ? (
            <p className="m2-status m2-status--error">
              {LIVE_ERROR_MESSAGES[liveRouteError] ||
                LIVE_ERROR_MESSAGES.UNAVAILABLE}
            </p>
          ) : null}
          {liveSuccess ? (
            <dl className="m2-stat-row">
              <div className="m2-stat">
                <dt>Selected transport</dt>
                <dd>{modeLabel}</dd>
              </div>
              <div className="m2-stat">
                <dt>Origin</dt>
                <dd>{liveOriginName}</dd>
              </div>
              <div className="m2-stat">
                <dt>Destination</dt>
                <dd>{liveDestinationName}</dd>
              </div>
              <div className="m2-stat">
                <dt>Live first-segment distance</dt>
                <dd>
                  {formatMetersAsKilometres(liveRoute.distanceMeters)}
                </dd>
              </div>
              <div className="m2-stat">
                <dt>Live first-segment duration</dt>
                <dd>
                  {formatSecondsAsMinutes(liveRoute.durationSeconds)}
                </dd>
              </div>
              {selectedTravelMode === "DRIVE" ? (
                <div className="m2-stat">
                  <dt>Traffic-aware routing</dt>
                  <dd>{liveRoute.trafficAware ? "Yes" : "No"}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
          {liveSuccess && liveRouteSource === "comparison" ? (
            <p className="m2-chip" style={{ marginTop: 12 }}>
              Reused from live comparison
            </p>
          ) : null}
          {liveSuccess && liveRouteSource === "direct" ? (
            <p className="m2-chip" style={{ marginTop: 12 }}>
              Loaded directly in Navigation Preview
            </p>
          ) : null}
        </div>
        {showWalkNotice ? (
          <p className="m2-walk-notice" role="note">
            Walking routes are in beta. Check sidewalks, pedestrian access, and
            local conditions before travelling.
          </p>
        ) : null}
        {canLoadDirect ? (
          <div className="m2-actions">
            <button
              type="button"
              className="m2-btn"
              onClick={onLoadLiveRoute}
              disabled={isLoading}
            >
              {loadButtonLabel(selectedTravelMode, {
                loading: isLoading,
                canRefresh: liveRouteSource === "direct",
              })}
            </button>
            {liveRouteStatus === "error" ? (
              <button
                type="button"
                className="m2-btn m2-btn--secondary"
                onClick={onLoadLiveRoute}
                disabled={isLoading}
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : null}
      </article>

      <TripMap
        startLocation={startLocation}
        destinations={destinations}
        encodedPolyline={encodedPolyline}
        routeTravelMode={liveSuccess ? selectedTravelMode : null}
        markerSource={markerSource}
      />
    </section>
  );
}
