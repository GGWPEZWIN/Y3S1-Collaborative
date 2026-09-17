import { TRIP_SESSION_ERROR } from "../../../firebase/tripSessionService";

const START_MESSAGES = {
  [TRIP_SESSION_ERROR.AUTH_REQUIRED]:
    "Please sign in again to start this trip.",
  [TRIP_SESSION_ERROR.ITINERARY_NOT_FOUND]:
    "This itinerary could not be found.",
  [TRIP_SESSION_ERROR.UNAUTHORIZED]:
    "You do not have access to start this trip.",
  [TRIP_SESSION_ERROR.MODULE1_INCOMPLETE]:
    "Finish saving this itinerary in Module 1 before starting a trip.",
  [TRIP_SESSION_ERROR.NOT_ROUTEABLE]:
    "This itinerary does not have a routeable segment yet.",
  [TRIP_SESSION_ERROR.ACTIVE_TRIP_EXISTS]:
    "Another trip is currently active. Resume it or cancel it first.",
  [TRIP_SESSION_ERROR.UNAVAILABLE]:
    "The trip could not be started. Please try again.",
};

const CANCEL_MESSAGES = {
  [TRIP_SESSION_ERROR.AUTH_REQUIRED]:
    "Please sign in again to cancel the active trip.",
  [TRIP_SESSION_ERROR.UNAUTHORIZED]:
    "You do not have access to cancel this trip.",
  [TRIP_SESSION_ERROR.SESSION_MISMATCH]:
    "The active trip could not be cancelled. Please try again.",
  [TRIP_SESSION_ERROR.UNAVAILABLE]:
    "The trip could not be cancelled. Please try again.",
};

const LOCK_WARNINGS = {
  [TRIP_SESSION_ERROR.UNAUTHORIZED]:
    "Trip session access could not be verified. You can still start this trip.",
  [TRIP_SESSION_ERROR.UNAVAILABLE]:
    "The active trip status could not be checked. You can still start this trip.",
};

export default function TripActivationPanel({
  isDemo = false,
  tripStatus,
  lock = null,
  lockWarning = null,
  actionStatus = "idle",
  actionError = null,
  confirmingCancel = false,
  requestedItinerary = null,
  onStart,
  onResumeNavigation,
  onResumeActiveTrip,
  onRequestCancel,
  onConfirmCancel,
  onKeepTrip,
}) {
  const isStarting = actionStatus === "starting";
  const isCancelling = actionStatus === "cancelling";
  const startError = START_MESSAGES[actionError] || null;
  const cancelError = CANCEL_MESSAGES[actionError] || null;
  const listenWarning = LOCK_WARNINGS[lockWarning] || null;

  if (isDemo && tripStatus !== "active_different_itinerary") {
    return (
      <article className="m2-card m2-activation-panel" aria-label="Trip activation">
        <h3>Trip session</h3>
        <p className="m2-muted">
          Demonstration itineraries cannot be started. Open a saved Module 1
          itinerary to begin one active trip.
        </p>
      </article>
    );
  }

  if (tripStatus === "loading") {
    return (
      <article className="m2-card m2-activation-panel" aria-label="Trip activation">
        <h3>Trip session</h3>
        <p className="m2-status m2-status--loading" role="status">
          Checking for an active trip…
        </p>
      </article>
    );
  }

  if (tripStatus === "active_different_itinerary") {
    return (
      <article className="m2-card m2-activation-panel" aria-label="Trip activation">
        <h3>Another trip is currently active</h3>
        <p className="m2-muted">
          {requestedItinerary?.title
            ? `You opened "${requestedItinerary.title}", but `
            : "Another itinerary is open, but "}
          {lock?.itineraryTitle
            ? `"${lock.itineraryTitle}" is already in progress. Live comparison and navigation stay on that trip until it is cancelled.`
            : "another itinerary already has an active trip. Live comparison and navigation stay on that trip until it is cancelled."}
        </p>
        {requestedItinerary?.title ? (
          <p className="m2-muted">
            Resume the active trip below, then cancel it from its Active Trip
            page if you want to start &quot;{requestedItinerary.title}&quot;
            instead.
          </p>
        ) : null}
        <div className="m2-actions">
          <button
            type="button"
            className="m2-btn"
            onClick={onResumeActiveTrip}
          >
            Resume Active Trip
          </button>
        </div>
      </article>
    );
  }

  if (tripStatus === "active_current_itinerary") {
    return (
      <article className="m2-card m2-activation-panel" aria-label="Trip activation">
        <div className="m2-location-head">
          <h3>Active trip</h3>
          <span className="m2-badge">In progress</span>
        </div>
        <p className="m2-muted">
          This itinerary is your one active trip. Compare Transport is
          available. Navigation Preview opens after a successful transport
          option is selected. Destination order stays as saved in Module 1.
        </p>
        {cancelError ? (
          <p className="m2-status m2-status--error" role="alert">
            {cancelError}
          </p>
        ) : null}
        <div className="m2-actions">
          <button
            type="button"
            className="m2-btn"
            onClick={onResumeNavigation}
            disabled={isCancelling}
          >
            Compare Transport
          </button>
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
              className="m2-btn m2-btn--danger"
              onClick={onRequestCancel}
              disabled={isCancelling}
            >
              Cancel Trip
            </button>
          )}
        </div>
      </article>
    );
  }

  return (
    <article className="m2-card m2-activation-panel" aria-label="Trip activation">
      <h3>Start this trip</h3>
      <p className="m2-muted">
        Starting a trip creates one active session for this itinerary. It does
        not change Module 1 destinations or request live routes.
      </p>
      {listenWarning ? (
        <p className="m2-status m2-status--error" role="status">
          {listenWarning}
        </p>
      ) : null}
      {startError ? (
        <p className="m2-status m2-status--error" role="alert">
          {startError}
        </p>
      ) : null}
      <div className="m2-actions">
        <button
          type="button"
          className="m2-btn"
          onClick={onStart}
          disabled={isStarting}
        >
          {isStarting ? "Starting…" : "Start This Trip"}
        </button>
      </div>
    </article>
  );
}
