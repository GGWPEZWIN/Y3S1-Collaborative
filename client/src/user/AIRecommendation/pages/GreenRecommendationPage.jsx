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
import useLiveSelectedRoute from "../hooks/useLiveSelectedRoute";
import useLiveTransportComparison from "../hooks/useLiveTransportComparison";
import useResolvedItinerary from "../hooks/useResolvedItinerary";
import { isRouteableCoordinate } from "../services/itinerary/normalizeItinerary.js";
import { firstRouteableSegment } from "../services/itinerary/buildRouteSegments.js";
import { ITINERARY_LOAD_STATUS } from "../services/itinerary/resolveItinerary.js";
import CurrentLocationCard from "../components/CurrentLocationCard";
import ItinerarySummary from "../components/ItinerarySummary";
import TripActivationPanel from "../components/TripActivationPanel";
import TransportationComparison from "../components/TransportationComparison";
import RouteInformationPanel from "../components/RouteInformationPanel";
import NavigationPreview from "../components/NavigationPreview";
import "../styles/aiRecommendation.css";

const TABS = [
  { id: "recommendation", label: "Trip Recommendation" },
  { id: "compare", label: "Compare Transport" },
  { id: "navigation", label: "Navigation Preview" },
];

const RECOMMENDED_MODE = "public_transit";

const OPTION_TO_TRAVEL_MODE = {
  walking: "WALK",
  public_transit: "TRANSIT",
  driving: "DRIVE",
};

function resolveNavigationLiveRoute({
  selectedTravelMode,
  comparisonEntry,
  comparisonStatus,
  directStatus,
  directRoute,
  directError,
}) {
  const comparisonSuccess =
    comparisonEntry?.status === "success" &&
    comparisonEntry.route?.travelMode === selectedTravelMode
      ? comparisonEntry.route
      : null;
  const comparisonFailed = comparisonEntry?.status === "error";
  const directSuccess =
    directStatus === "success" &&
    directRoute?.travelMode === selectedTravelMode
      ? directRoute
      : null;

  if (comparisonSuccess) {
    return {
      status: "success",
      route: comparisonSuccess,
      errorCode: null,
      sourceKind: "comparison",
    };
  }
  if (directSuccess) {
    return {
      status: "success",
      route: directSuccess,
      errorCode: null,
      sourceKind: "direct",
    };
  }
  if (directStatus === "loading") {
    return {
      status: "loading",
      route: null,
      errorCode: null,
      sourceKind: null,
    };
  }
  if (directStatus === "error") {
    return {
      status: "error",
      route: null,
      errorCode: directError,
      sourceKind: null,
    };
  }
  if (comparisonFailed) {
    return {
      status: "error",
      route: null,
      errorCode: comparisonEntry.code || "UNAVAILABLE",
      sourceKind: null,
    };
  }
  return {
    status: comparisonStatus === "loading" ? "comparison-loading" : "idle",
    route: null,
    errorCode: null,
    sourceKind: null,
  };
}

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

function firstLiveDestinationFromSegments(segments) {
  const firstSegment = firstRouteableSegment(segments);
  if (!firstSegment) return null;
  return {
    destinationId: firstSegment.destination.id,
    name: firstSegment.destination.name,
    latitude: firstSegment.destination.latitude,
    longitude: firstSegment.destination.longitude,
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
  const [view, setView] = useState("recommendation");
  const [selectedMode, setSelectedMode] = useState(RECOMMENDED_MODE);
  const [navIndex, setNavIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [activeItineraryId, setActiveItineraryId] = useState(itineraryId);

  const [tripAction, setTripAction] = useState({
    status: "idle",
    error: null,
  });
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  if (activeItineraryId !== itineraryId) {
    setActiveItineraryId(itineraryId);
    setView("recommendation");
    setSelectedMode(RECOMMENDED_MODE);
    setNavIndex(0);
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
  const contextKey =
    context.status === ITINERARY_LOAD_STATUS.LOADING
      ? `loading:${requestedId}`
      : context.itinerary?.itineraryId || requestedId || context.source;
  const routingContextKey = `${contextKey}:${thisTripActive ? "active" : "inactive"}`;
  const firstLiveDestination = firstLiveDestinationFromSegments(
    context.segments
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

  const selectedTravelMode =
    OPTION_TO_TRAVEL_MODE[selectedMode] || OPTION_TO_TRAVEL_MODE[RECOMMENDED_MODE];
  const originHasCoords = isRouteableCoordinate(
    location.latitude,
    location.longitude
  );
  const canRequestFirstSegment =
    (isDemo || thisTripActive) &&
    (context.status === ITINERARY_LOAD_STATUS.SUCCESS ||
      context.status === ITINERARY_LOAD_STATUS.DEMO) &&
    Boolean(firstLiveDestination) &&
    originHasCoords &&
    !otherTripActive;

  const {
    status: directRouteStatus,
    route: directRoute,
    errorCode: directRouteError,
    loadRoute: loadSelectedLiveRoute,
  } = useLiveSelectedRoute({
    origin: location,
    destination: firstLiveDestination,
    travelMode: selectedTravelMode,
    contextKey: routingContextKey,
  });

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

  const navigationLive = useMemo(
    () =>
      resolveNavigationLiveRoute({
        selectedTravelMode,
        comparisonEntry: liveComparisonResults?.[selectedTravelMode] ?? null,
        comparisonStatus: liveComparisonStatus,
        directStatus: directRouteStatus,
        directRoute,
        directError: directRouteError,
      }),
    [
      selectedTravelMode,
      liveComparisonResults,
      liveComparisonStatus,
      directRouteStatus,
      directRoute,
      directRouteError,
    ]
  );

  const startLocationName =
    location.source === "device"
      ? location.label
      : context.itinerary?.startLocation?.name || location.label;

  const stops = mapStops(context.itinerary);
  const lastIndex = Math.max(stops.length - 1, 0);
  const isReady =
    context.status === ITINERARY_LOAD_STATUS.SUCCESS || isDemo;
  const isLoadError = !isReady && context.status !== ITINERARY_LOAD_STATUS.LOADING;
  const mapStartLocation = mapStartForMap(context.itinerary) || location;
  const visibleComparisonStatus = thisTripActive || isDemo
    ? liveComparisonStatus
    : "idle";
  const visibleComparisonResults = thisTripActive || isDemo
    ? liveComparisonResults
    : null;
  const visibleComparisonError = thisTripActive || isDemo
    ? liveComparisonError
    : null;
  const hasSuccessfulSelectedRoute =
    visibleComparisonResults?.[selectedTravelMode]?.status === "success";
  const canOpenCompare = isDemo || thisTripActive;
  const canOpenNavigation = isDemo
    ? true
    : thisTripActive && hasSuccessfulSelectedRoute;
  const visibleNavigation = thisTripActive || isDemo
    ? navigationLive
    : {
        status: "idle",
        route: null,
        errorCode: null,
        sourceKind: null,
      };

  if (!isDemo && !canOpenCompare && view !== "recommendation") {
    setView("recommendation");
  } else if (
    !isDemo &&
    canOpenCompare &&
    !canOpenNavigation &&
    view === "navigation"
  ) {
    setView("compare");
  }

  function showRecommendation() {
    setView("recommendation");
  }

  function showCompare() {
    if (!canOpenCompare) return;
    setView("compare");
  }

  function showNavigation() {
    if (!canOpenNavigation) return;
    setView("navigation");
  }

  function requestView(next) {
    if (next === "recommendation") showRecommendation();
    else if (next === "compare") showCompare();
    else if (next === "navigation") showNavigation();
  }

  function handleNextDestination() {
    if (!thisTripActive || paused || navIndex >= lastIndex) return;
    setNavIndex((index) => Math.min(index + 1, lastIndex));
  }

  async function handleStartTrip() {
    if (isDemo || !requestedId) return;
    setTripAction({ status: "starting", error: null });
    try {
      await startTripSession(requestedId);
      setTripAction({ status: "idle", error: null });
      setView("recommendation");
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
      setView("recommendation");
      setSelectedMode(RECOMMENDED_MODE);
      setNavIndex(0);
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

  return (
    <Layout active="recommendations" onNavigate={onNavigate}>
      <div className="m2-page">
        <header className="m2-header">
          <div className="m2-title-row">
            <h1 className="m2-title">AI Green Recommendation</h1>
            <span
              className={
                isDemo
                  ? "m2-badge m2-badge--demo"
                  : isReady
                    ? "m2-badge"
                    : "m2-badge m2-badge--demo"
              }
            >
              {isDemo
                ? "Demonstration itinerary"
                : isReady
                  ? "Module 1 itinerary"
                  : "Saved itinerary"}
            </span>
          </div>
        </header>

        {context.status === ITINERARY_LOAD_STATUS.LOADING ? (
          <p className="m2-status m2-status--loading" role="status">
            {context.message}
          </p>
        ) : null}

        {isLoadError ? (
          <article className="m2-card" role="alert">
            <h3>Itinerary unavailable</h3>
            <p className="m2-status m2-status--error">{context.message}</p>
            <p className="m2-muted" style={{ marginTop: 12 }}>
              Demonstration destinations were not added.
            </p>
          </article>
        ) : null}

        {isReady ? (
          <>
            <p className="m2-notice" role="note">
              {isDemo
                ? "Demonstration itinerary is shown because no Module 1 itinerary is selected."
                : "This itinerary was loaded from Module 1. Destinations stay in the saved order and are not mixed with demonstration stops."}
            </p>

            <div className="m2-tabs" role="tablist" aria-label="Module 2 views">
              {TABS.map((tab) => {
                const tabEnabled =
                  tab.id === "recommendation" ||
                  (tab.id === "compare" && canOpenCompare) ||
                  (tab.id === "navigation" && canOpenNavigation);
                const tabHint =
                  tab.id === "recommendation" || tabEnabled
                    ? null
                    : otherTripActive
                      ? "Another trip is currently active"
                      : !isDemo && !thisTripActive
                        ? "Start this trip first"
                        : tab.id === "navigation"
                          ? "Select a transport option first"
                          : "Start this trip first";
                return (
                  <div key={tab.id} className="m2-tab-item">
                    <button
                      type="button"
                      role="tab"
                      id={`m2-tab-${tab.id}`}
                      aria-selected={view === tab.id}
                      aria-controls={`m2-panel-${tab.id}`}
                      aria-disabled={!tabEnabled}
                      className="m2-tab"
                      disabled={!tabEnabled}
                      onClick={() => requestView(tab.id)}
                    >
                      {tab.label}
                    </button>
                    {tabHint ? (
                      <span className="m2-tab-hint">{tabHint}</span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div
              id={`m2-panel-${view}`}
              role="tabpanel"
              aria-labelledby={`m2-tab-${view}`}
            >
              {view === "recommendation" ? (
                <>
                  <TripActivationPanel
                    isDemo={isDemo}
                    tripStatus={tripSession.status}
                    lock={tripSession.lock}
                    lockWarning={tripSession.warning}
                    actionStatus={tripAction.status}
                    actionError={tripAction.error}
                    confirmingCancel={confirmingCancel}
                    onStart={handleStartTrip}
                    onResumeNavigation={showCompare}
                    onResumeActiveTrip={handleResumeActiveTrip}
                    onRequestCancel={() => setConfirmingCancel(true)}
                    onConfirmCancel={handleConfirmCancel}
                    onKeepTrip={() => setConfirmingCancel(false)}
                  />
                  <CurrentLocationCard
                    location={location}
                    status={locationStatus}
                    onRequestLocation={requestCurrentLocation}
                    onUseDemoLocation={useDemoLocation}
                    resetLabel={isDemo ? "Use Demo Location" : "Use Saved Start"}
                  />
                  <ItinerarySummary
                    itinerary={context.itinerary}
                    recommendation={mockGreenRecommendation}
                    startLocationName={startLocationName}
                    source={context.source}
                    issues={context.issues}
                    routeableSegmentCount={context.routeableSegmentCount}
                    compareEnabled={canOpenCompare}
                    previewEnabled={canOpenNavigation}
                    flowBlockedReason={
                      !isDemo && !thisTripActive
                        ? "Start this trip first"
                        : !isDemo && thisTripActive && !canOpenNavigation
                          ? "Select a transport option first"
                          : null
                    }
                    onCompare={showCompare}
                    onPreview={showNavigation}
                  />
                  <div style={{ marginTop: 16 }}>
                    <RouteInformationPanel
                      segments={
                        isDemo
                          ? mockGreenRecommendation.routeSegments
                          : context.segments
                      }
                      structural={!isDemo}
                    />
                  </div>
                </>
              ) : null}

              {view === "compare" ? (
                <TransportationComparison
                  options={mockGreenRecommendation.transportationOptions}
                  selectedMode={selectedMode}
                  onSelect={setSelectedMode}
                  onUseRecommended={(mode) =>
                    setSelectedMode(mode || RECOMMENDED_MODE)
                  }
                  onBack={showRecommendation}
                  liveOriginName={startLocationName}
                  liveDestinationName={
                    firstLiveDestination?.name || "First destination"
                  }
                  liveComparisonStatus={visibleComparisonStatus}
                  liveComparisonError={visibleComparisonError}
                  liveComparisonResults={visibleComparisonResults}
                  blockedMessage={
                    otherTripActive
                      ? "Live comparison is unavailable while another itinerary has an active trip."
                      : !thisTripActive && !isDemo
                        ? "Start this trip first"
                        : null
                  }
                  onLoadComparison={
                    canRequestFirstSegment
                      ? loadLiveTransportComparison
                      : undefined
                  }
                />
              ) : null}

              {view === "navigation" ? (
                <NavigationPreview
                  stops={stops}
                  segments={
                    isDemo
                      ? mockGreenRecommendation.routeSegments
                      : context.segments
                  }
                  startLocation={mapStartLocation}
                  destinations={mapDestinationsForMap(context.itinerary)}
                  currentIndex={navIndex}
                  paused={paused}
                  onPause={() => {
                    if (thisTripActive) setPaused(true);
                  }}
                  onResume={() => {
                    if (thisTripActive) setPaused(false);
                  }}
                  onNext={handleNextDestination}
                  onBack={showRecommendation}
                  liveOriginName={startLocationName}
                  liveDestinationName={
                    firstLiveDestination?.name || "First destination"
                  }
                  selectedTravelMode={selectedTravelMode}
                  liveRouteStatus={visibleNavigation.status}
                  liveRoute={visibleNavigation.route}
                  liveRouteError={visibleNavigation.errorCode}
                  liveRouteSource={visibleNavigation.sourceKind}
                  markerSource={isDemo ? "demo" : "saved"}
                  progressControlsEnabled={thisTripActive}
                  progressDisabledReason={
                    thisTripActive
                      ? null
                      : otherTripActive
                        ? "Navigation controls stay on the active itinerary. Resume that trip or cancel it first."
                        : "Start this trip to use pause, resume, and next-destination controls."
                  }
                  onLoadLiveRoute={
                    !canRequestFirstSegment ||
                    visibleNavigation.sourceKind === "comparison" ||
                    visibleComparisonStatus === "loading"
                      ? undefined
                      : loadSelectedLiveRoute
                  }
                />
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </Layout>
  );
}
