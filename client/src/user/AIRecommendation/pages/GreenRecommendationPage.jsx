import { useMemo, useState } from "react";
import Layout from "../../../shared/components/Layout";
import {
  cancelActiveTripSession,
  startTripSession,
} from "../../../firebase/tripSessionService";
import { mockGreenRecommendation } from "../data/mockModule2Data";
import useActiveTripSession, {
  ACTIVE_TRIP_STATUS,
} from "../hooks/useActiveTripSession";
import useCurrentLocation from "../hooks/useCurrentLocation";
import useLiveTransportComparison from "../hooks/useLiveTransportComparison";
import useResolvedItinerary from "../hooks/useResolvedItinerary";
import { isRouteableCoordinate } from "../services/itinerary/normalizeItinerary.js";
import { firstRouteableSegment } from "../services/itinerary/buildRouteSegments.js";
import { ITINERARY_LOAD_STATUS } from "../services/itinerary/resolveItinerary.js";
import {
  formatMetersAsKilometres,
  formatSecondsAsMinutes,
} from "../services/formatMeasurement.js";
import { TRIP_FLOW } from "../tripFlow.js";
import ActiveTripOverview from "../components/ActiveTripOverview";
import ComparisonLoadingScreen from "../components/ComparisonLoadingScreen";
import NavigationPreview from "../components/NavigationPreview";
import NoActiveTrip from "../components/NoActiveTrip";
import SavedItineraryPreview from "../components/SavedItineraryPreview";
import TransportationComparison from "../components/TransportationComparison";
import TripActivationPanel from "../components/TripActivationPanel";
import TripFlowStepper from "../components/TripFlowStepper";
import "../styles/aiRecommendation.css";

const OPTION_TO_TRAVEL_MODE = {
  walking: "WALK",
  public_transit: "TRANSIT",
  driving: "DRIVE",
};

const CANCEL_MESSAGES = {
  AUTH_REQUIRED: "Please sign in again to cancel the active trip.",
  UNAUTHORIZED: "You do not have access to cancel this trip.",
  SESSION_MISMATCH: "The active trip could not be cancelled. Please try again.",
  UNAVAILABLE: "The trip could not be cancelled. Please try again.",
};

function mapDestinationsForMap(itinerary) {
  if (!itinerary?.destinations) return [];
  return itinerary.destinations
    .filter((destination) => destination.routeable)
    .map((destination, index) => ({
      destinationId: destination.destinationId,
      name: destination.name,
      latitude: destination.latitude,
      longitude: destination.longitude,
      plannedOrder: destination.order ?? index + 1,
    }));
}

function mapStartForMap(itinerary) {
  if (!itinerary?.startLocation) return null;
  return {
    latitude: itinerary.startLocation.latitude,
    longitude: itinerary.startLocation.longitude,
    label: itinerary.startLocation.name,
  };
}

function liveDestinationFromSegment(segments, segmentIndex) {
  const segment = Array.isArray(segments) ? segments[segmentIndex] : null;
  if (segment?.routeable) {
    return {
      destinationId: segment.destination.id,
      name: segment.destination.name,
      latitude: segment.destination.latitude,
      longitude: segment.destination.longitude,
    };
  }
  const first = firstRouteableSegment(segments);
  if (!first) return null;
  return {
    destinationId: first.destination.id,
    name: first.destination.name,
    latitude: first.destination.latitude,
    longitude: first.destination.longitude,
  };
}

function mapStops(itinerary) {
  if (!itinerary) return [];
  const stops = [];
  if (itinerary.startLocation) {
    stops.push({
      stopId: itinerary.startLocation.locationId,
      name: itinerary.startLocation.name,
      kind: "start",
    });
  }
  itinerary.destinations.forEach((destination) => {
    stops.push({
      stopId: destination.destinationId,
      name: destination.name,
      kind: "destination",
    });
  });
  return stops;
}

export default function GreenRecommendationPage({
  onNavigate,
  itineraryId = null,
  itinerary = null,
}) {
  const [flowScreen, setFlowScreen] = useState(TRIP_FLOW.OVERVIEW);
  const [selectedMode, setSelectedMode] = useState(null);
  const [paused, setPaused] = useState(false);
  const [activeItineraryId, setActiveItineraryId] = useState(itineraryId);
  const [tripAction, setTripAction] = useState({
    status: "idle",
    error: null,
  });
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [originStamp, setOriginStamp] = useState(null);

  if (activeItineraryId !== itineraryId) {
    setActiveItineraryId(itineraryId);
    setFlowScreen(TRIP_FLOW.OVERVIEW);
    setSelectedMode(null);
    setPaused(false);
    setTripAction({ status: "idle", error: null });
    setConfirmingCancel(false);
  }

  const context = useResolvedItinerary({ itineraryId, itinerary });
  const requestedId =
    typeof itineraryId === "string" ? itineraryId.trim() : "";
  const tripSession = useActiveTripSession(requestedId || null);
  const isDemo = context.status === ITINERARY_LOAD_STATUS.DEMO;
  const thisTripActive =
    tripSession.status === ACTIVE_TRIP_STATUS.ACTIVE_CURRENT;
  const otherTripActive =
    tripSession.status === ACTIVE_TRIP_STATUS.ACTIVE_DIFFERENT;
  const noTrip =
    tripSession.status === ACTIVE_TRIP_STATUS.NONE && !requestedId;
  const contextKey =
    context.status === ITINERARY_LOAD_STATUS.LOADING
      ? `loading:${requestedId}`
      : context.itinerary?.itineraryId || requestedId || context.source;
  const routingContextKey = `${contextKey}:${thisTripActive ? "active" : "inactive"}`;
  const currentSegmentIndex = tripSession.currentSegmentIndex || 0;
  const firstLiveDestination = liveDestinationFromSegment(
    context.segments,
    currentSegmentIndex
  );

  const {
    location,
    status: locationStatus,
    requestCurrentLocation,
    useDemoLocation,
  } = useCurrentLocation({
    savedStart: context.itinerary?.startLocation || null,
    itineraryKey: contextKey,
  });

  const originKey = `${location.latitude},${location.longitude},${location.source}`;
  if (originStamp !== originKey) {
    const hadOrigin = originStamp !== null;
    setOriginStamp(originKey);
    if (hadOrigin) {
      setSelectedMode(null);
      if (flowScreen !== TRIP_FLOW.OVERVIEW) {
        setFlowScreen(TRIP_FLOW.OVERVIEW);
      }
    }
  }

  const selectedTravelMode = selectedMode
    ? OPTION_TO_TRAVEL_MODE[selectedMode] || null
    : null;
  const originHasCoords = isRouteableCoordinate(
    location.latitude,
    location.longitude
  );
  const canRequestFirstSegment =
    thisTripActive &&
    !isDemo &&
    context.status === ITINERARY_LOAD_STATUS.SUCCESS &&
    Boolean(firstLiveDestination) &&
    originHasCoords &&
    !otherTripActive;

  const {
    status: liveComparisonStatus,
    results: liveComparisonResults,
    errorCode: liveComparisonError,
    loadComparison: loadLiveTransportComparison,
  } = useLiveTransportComparison({
    origin: location,
    destination: firstLiveDestination,
    contextKey: routingContextKey,
  });

  const selectedEntry = selectedTravelMode
    ? liveComparisonResults?.[selectedTravelMode]
    : null;
  const hasSuccessfulSelection =
    thisTripActive && selectedEntry?.status === "success" && selectedEntry.route;
  const visibleComparisonResults = thisTripActive
    ? liveComparisonResults
    : null;
  const navigationLive = useMemo(() => {
    if (!hasSuccessfulSelection) {
      return { status: "idle", route: null, errorCode: null, sourceKind: null };
    }
    return {
      status: "success",
      route: selectedEntry.route,
      errorCode: null,
      sourceKind: "comparison",
    };
  }, [hasSuccessfulSelection, selectedEntry]);

  if (thisTripActive && flowScreen === TRIP_FLOW.NAV && !hasSuccessfulSelection) {
    setFlowScreen(
      liveComparisonStatus === "success" || liveComparisonStatus === "error"
        ? TRIP_FLOW.COMPARE
        : TRIP_FLOW.OVERVIEW
    );
  } else if (!thisTripActive && flowScreen !== TRIP_FLOW.OVERVIEW) {
    setFlowScreen(TRIP_FLOW.OVERVIEW);
  }

  const startLocationName =
    location.source === "device"
      ? location.label
      : context.itinerary?.startLocation?.name || location.label;
  const stops = mapStops(context.itinerary);
  const isReady = context.status === ITINERARY_LOAD_STATUS.SUCCESS;
  const isLoadError =
    Boolean(requestedId) &&
    !isReady &&
    context.status !== ITINERARY_LOAD_STATUS.LOADING;
  const mapStartLocation = mapStartForMap(context.itinerary);
  const totalSegments =
    tripSession.session?.totalSegments ||
    context.segments.length ||
    1;
  const selectedRoute = hasSuccessfulSelection ? selectedEntry.route : null;
  const firstSegmentDistance = selectedRoute
    ? {
        label: "Selected first-segment distance",
        value: formatMetersAsKilometres(selectedRoute.distanceMeters),
      }
    : {
        label: "First-segment distance",
        value: "Not calculated yet",
      };
  const firstSegmentEta = selectedRoute
    ? {
        label: "Selected first-segment ETA",
        value: formatSecondsAsMinutes(selectedRoute.durationSeconds),
      }
    : {
        label: "First-segment ETA",
        value: "Not calculated yet",
      };

  function goDisabledReason() {
    if (!originHasCoords) return "This segment needs a usable origin before GO.";
    if (!firstLiveDestination) {
      return "This itinerary does not yet have a routeable next destination.";
    }
    return null;
  }

  async function handleGo() {
    if (!canRequestFirstSegment) return;
    if (liveComparisonStatus === "loading") return;
    if (
      liveComparisonStatus === "success" ||
      liveComparisonStatus === "error"
    ) {
      setFlowScreen(TRIP_FLOW.COMPARE);
      return;
    }
    setFlowScreen(TRIP_FLOW.LOADING);
    await loadLiveTransportComparison();
    setFlowScreen((screen) =>
      screen === TRIP_FLOW.LOADING ? TRIP_FLOW.COMPARE : screen
    );
  }

  async function handleRefreshComparison() {
    if (!canRequestFirstSegment) return;
    if (liveComparisonStatus === "loading") return;
    setSelectedMode(null);
    setFlowScreen(TRIP_FLOW.LOADING);
    await loadLiveTransportComparison();
    setFlowScreen((screen) =>
      screen === TRIP_FLOW.LOADING ? TRIP_FLOW.COMPARE : screen
    );
  }

  function handleBackToOverview() {
    setFlowScreen(TRIP_FLOW.OVERVIEW);
  }

  function handleStartNavigation() {
    if (!hasSuccessfulSelection) return;
    setFlowScreen(TRIP_FLOW.NAV);
  }

  async function handleStartTrip() {
    if (isDemo || !requestedId) return;
    setTripAction({ status: "starting", error: null });
    try {
      await startTripSession(requestedId);
      setTripAction({ status: "idle", error: null });
      setFlowScreen(TRIP_FLOW.OVERVIEW);
      setConfirmingCancel(false);
    } catch (error) {
      setTripAction({
        status: "idle",
        error: error?.code || "UNAVAILABLE",
      });
    }
  }

  async function handleConfirmCancel() {
    setTripAction({ status: "cancelling", error: null });
    try {
      await cancelActiveTripSession();
      setConfirmingCancel(false);
      setTripAction({ status: "idle", error: null });
      setFlowScreen(TRIP_FLOW.OVERVIEW);
      setSelectedMode(null);
      setPaused(false);
    } catch (error) {
      setTripAction({
        status: "idle",
        error: error?.code || "UNAVAILABLE",
      });
    }
  }

  function handleResumeActiveTrip() {
    if (tripSession.lock?.itineraryId) {
      onNavigate?.("/recommendations", tripSession.lock.itineraryId);
    }
  }

  const tripChecking = tripSession.status === ACTIVE_TRIP_STATUS.LOADING;
  const itineraryLoading =
    Boolean(requestedId) && context.status === ITINERARY_LOAD_STATUS.LOADING;

  return (
    <Layout active="recommendations" onNavigate={onNavigate}>
      <div className="m2-page">
        {itineraryLoading || tripChecking ? (
          <p className="m2-status m2-status--loading" role="status">
            {itineraryLoading
              ? context.message
              : "Checking for an active trip…"}
          </p>
        ) : null}

        {isLoadError ? (
          <article className="m2-card" role="alert">
            <h3>Itinerary unavailable</h3>
            <p className="m2-status m2-status--error">{context.message}</p>
          </article>
        ) : null}

        {!itineraryLoading && !tripChecking && noTrip ? (
          <NoActiveTrip onBrowseItineraries={() => onNavigate?.("/itinerary")} />
        ) : null}

        {!itineraryLoading &&
        !tripChecking &&
        !isLoadError &&
        (otherTripActive || (isDemo && tripSession.status === ACTIVE_TRIP_STATUS.ACTIVE_DIFFERENT)) ? (
          <TripActivationPanel
            isDemo={false}
            tripStatus={ACTIVE_TRIP_STATUS.ACTIVE_DIFFERENT}
            lock={tripSession.lock}
            lockWarning={tripSession.warning}
            actionStatus={tripAction.status}
            actionError={tripAction.error}
            onResumeActiveTrip={handleResumeActiveTrip}
          />
        ) : null}

        {!itineraryLoading &&
        !tripChecking &&
        isReady &&
        !thisTripActive &&
        !otherTripActive ? (
          <>
            <TripActivationPanel
              isDemo={false}
              tripStatus={tripSession.status}
              lock={tripSession.lock}
              lockWarning={tripSession.warning}
              actionStatus={tripAction.status}
              actionError={tripAction.error}
              confirmingCancel={confirmingCancel}
              onStart={handleStartTrip}
              onResumeActiveTrip={handleResumeActiveTrip}
              onRequestCancel={() => setConfirmingCancel(true)}
              onConfirmCancel={handleConfirmCancel}
              onKeepTrip={() => setConfirmingCancel(false)}
            />
            <SavedItineraryPreview itinerary={context.itinerary} />
          </>
        ) : null}

        {thisTripActive && isReady ? (
          <>
            <TripFlowStepper screen={flowScreen} />

            {flowScreen === TRIP_FLOW.OVERVIEW ? (
              <ActiveTripOverview
                itinerary={context.itinerary}
                originName={startLocationName}
                originIsDevice={location.source === "device"}
                nextDestinationName={
                  firstLiveDestination?.name || "Next destination unavailable"
                }
                segmentNumber={currentSegmentIndex + 1}
                totalSegments={totalSegments}
                currentStopIndex={currentSegmentIndex}
                firstSegmentDistance={firstSegmentDistance}
                firstSegmentEta={firstSegmentEta}
                locationStatus={locationStatus}
                onUseCurrentLocation={requestCurrentLocation}
                onUseSavedStart={useDemoLocation}
                locationLoading={locationStatus === "loading"}
                startLocation={mapStartLocation}
                destinations={mapDestinationsForMap(context.itinerary)}
                confirmingCancel={confirmingCancel}
                cancelError={CANCEL_MESSAGES[tripAction.error] || null}
                isCancelling={tripAction.status === "cancelling"}
                onGo={handleGo}
                goDisabled={!canRequestFirstSegment}
                goDisabledReason={goDisabledReason()}
                onRequestCancel={() => setConfirmingCancel(true)}
                onConfirmCancel={handleConfirmCancel}
                onKeepTrip={() => setConfirmingCancel(false)}
              />
            ) : null}

            {flowScreen === TRIP_FLOW.LOADING ? (
              <ComparisonLoadingScreen
                originName={startLocationName}
                destinationName={
                  firstLiveDestination?.name || "Next destination"
                }
              />
            ) : null}

            {flowScreen === TRIP_FLOW.COMPARE ? (
              <TransportationComparison
                options={mockGreenRecommendation.transportationOptions}
                selectedMode={selectedMode}
                onSelect={setSelectedMode}
                onBack={handleBackToOverview}
                onStartNavigation={handleStartNavigation}
                liveOriginName={startLocationName}
                liveDestinationName={
                  firstLiveDestination?.name || "Next destination"
                }
                liveComparisonStatus={liveComparisonStatus}
                liveComparisonError={liveComparisonError}
                liveComparisonResults={visibleComparisonResults}
                onLoadComparison={
                  canRequestFirstSegment ? handleRefreshComparison : undefined
                }
                canStartNavigation={hasSuccessfulSelection}
              />
            ) : null}

            {flowScreen === TRIP_FLOW.NAV ? (
              <NavigationPreview
                stops={stops}
                segments={context.segments}
                startLocation={
                  location.source === "device"
                    ? {
                        latitude: location.latitude,
                        longitude: location.longitude,
                        label: location.label,
                      }
                    : mapStartLocation || location
                }
                destinations={mapDestinationsForMap(context.itinerary)}
                currentIndex={currentSegmentIndex}
                paused={paused}
                onPause={() => setPaused(true)}
                onResume={() => setPaused(false)}
                onNext={() => {}}
                onBack={() => setFlowScreen(TRIP_FLOW.COMPARE)}
                liveOriginName={startLocationName}
                liveDestinationName={
                  firstLiveDestination?.name || "Next destination"
                }
                selectedTravelMode={selectedTravelMode || "TRANSIT"}
                liveRouteStatus={navigationLive.status}
                liveRoute={navigationLive.route}
                liveRouteError={navigationLive.errorCode}
                liveRouteSource={navigationLive.sourceKind}
                markerSource="saved"
                progressControlsEnabled
                progressDisabledReason="Segment completion is not available yet."
                allowNextDestination={false}
                backLabel="Back to transport options"
                useSessionProgressLabels
              />
            ) : null}
          </>
        ) : null}
      </div>
    </Layout>
  );
}
