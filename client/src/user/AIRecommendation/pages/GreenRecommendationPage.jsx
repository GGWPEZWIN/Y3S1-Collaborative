import { useMemo, useState } from "react";
import Layout from "../../../shared/components/Layout";
import { mockGreenRecommendation } from "../data/mockModule2Data";
import useCurrentLocation from "../hooks/useCurrentLocation";
import useLiveSelectedRoute from "../hooks/useLiveSelectedRoute";
import useLiveTransportComparison from "../hooks/useLiveTransportComparison";
import { isRouteableCoordinate } from "../services/itinerary/normalizeItinerary.js";
import { resolveItineraryContext } from "../services/itinerary/resolveItinerary.js";
import CurrentLocationCard from "../components/CurrentLocationCard";
import ItinerarySummary from "../components/ItinerarySummary";
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

  const context = useMemo(
    () => resolveItineraryContext({ itineraryId, itinerary }),
    [itineraryId, itinerary]
  );
  const contextKey =
    context.itinerary?.itineraryId || itineraryId || context.source;
  const firstDestination = context.itinerary?.destinations?.[0] || null;
  const firstLiveDestination = firstDestination?.routeable
    ? {
        destinationId: firstDestination.destinationId,
        name: firstDestination.name,
        latitude: firstDestination.latitude,
        longitude: firstDestination.longitude,
      }
    : null;

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
  const canRequestFirstSegment = Boolean(firstLiveDestination) && originHasCoords;

  const {
    status: directRouteStatus,
    route: directRoute,
    errorCode: directRouteError,
    loadRoute: loadSelectedLiveRoute,
  } = useLiveSelectedRoute({
    origin: location,
    destination: firstLiveDestination,
    travelMode: selectedTravelMode,
    contextKey,
  });

  const {
    status: liveComparisonStatus,
    results: liveComparisonResults,
    errorCode: liveComparisonError,
    loadComparison: loadLiveTransportComparison,
  } = useLiveTransportComparison({
    origin: location,
    destination: firstLiveDestination,
    contextKey,
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
  const isDemo = context.source === "demo";

  function showRecommendation() {
    setView("recommendation");
  }

  function showCompare() {
    setView("compare");
  }

  function showNavigation() {
    setView("navigation");
  }

  function handleNextDestination() {
    if (paused || navIndex >= lastIndex) return;
    setNavIndex((index) => Math.min(index + 1, lastIndex));
  }

  return (
    <Layout active="recommendations" onNavigate={onNavigate}>
      <div className="m2-page">
        <header className="m2-header">
          <div className="m2-title-row">
            <h1 className="m2-title">AI Green Recommendation</h1>
            <span className={isDemo ? "m2-badge m2-badge--demo" : "m2-badge"}>
              {isDemo ? "Demonstration itinerary" : "Module 1 itinerary"}
            </span>
          </div>
        </header>

        <p className="m2-notice" role="note">
          {isDemo
            ? "Demonstration itinerary is shown because no Module 1 itinerary is selected."
            : "This itinerary was loaded from Module 1. Destinations stay in the saved order and are not mixed with demonstration stops."}
        </p>

        <div className="m2-tabs" role="tablist" aria-label="Module 2 views">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`m2-tab-${tab.id}`}
              aria-selected={view === tab.id}
              aria-controls={`m2-panel-${tab.id}`}
              className="m2-tab"
              onClick={() => setView(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          id={`m2-panel-${view}`}
          role="tabpanel"
          aria-labelledby={`m2-tab-${view}`}
        >
          {view === "recommendation" ? (
            <>
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
              liveComparisonStatus={liveComparisonStatus}
              liveComparisonError={liveComparisonError}
              liveComparisonResults={liveComparisonResults}
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
                  : context.segments.map((segment) => ({
                      ...segment,
                      origin: segment.origin.name,
                      destination: segment.destination.name,
                      modeLabel: segment.routeable
                        ? "Not requested yet"
                        : "Not yet routeable",
                      estimatedDistanceKm: "—",
                      estimatedDurationMinutes: "—",
                      estimatedCarbonKg: "—",
                    }))
              }
              startLocation={location}
              destinations={mapDestinationsForMap(context.itinerary)}
              currentIndex={navIndex}
              paused={paused}
              onPause={() => setPaused(true)}
              onResume={() => setPaused(false)}
              onNext={handleNextDestination}
              onBack={showRecommendation}
              liveOriginName={startLocationName}
              liveDestinationName={
                firstLiveDestination?.name || "First destination"
              }
              selectedTravelMode={selectedTravelMode}
              liveRouteStatus={navigationLive.status}
              liveRoute={navigationLive.route}
              liveRouteError={navigationLive.errorCode}
              liveRouteSource={navigationLive.sourceKind}
              onLoadLiveRoute={
                !canRequestFirstSegment ||
                navigationLive.sourceKind === "comparison" ||
                liveComparisonStatus === "loading"
                  ? undefined
                  : loadSelectedLiveRoute
              }
            />
          ) : null}
        </div>
      </div>
    </Layout>
  );
}
