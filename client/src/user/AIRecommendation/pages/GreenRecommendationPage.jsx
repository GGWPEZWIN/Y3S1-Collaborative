import { useMemo, useState } from "react";
import Layout from "../../../shared/components/Layout";
import {
  mockGreenRecommendation,
  mockItinerary,
} from "../data/mockModule2Data";
import useCurrentLocation from "../hooks/useCurrentLocation";
import useLiveSelectedRoute from "../hooks/useLiveSelectedRoute";
import useLiveTransportComparison from "../hooks/useLiveTransportComparison";
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
const FIRST_LIVE_DESTINATION_ID = "dest-perdana-botanical-garden";

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

export default function GreenRecommendationPage({ onNavigate }) {
  const [view, setView] = useState("recommendation");
  const [selectedMode, setSelectedMode] = useState(RECOMMENDED_MODE);
  const [navIndex, setNavIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const {
    location,
    status: locationStatus,
    requestCurrentLocation,
    useDemoLocation,
  } = useCurrentLocation();

  const firstLiveDestination =
    mockItinerary.destinations.find(
      (destination) => destination.destinationId === FIRST_LIVE_DESTINATION_ID
    ) || mockItinerary.destinations[0];

  const selectedTravelMode =
    OPTION_TO_TRAVEL_MODE[selectedMode] || OPTION_TO_TRAVEL_MODE[RECOMMENDED_MODE];

  const {
    status: directRouteStatus,
    route: directRoute,
    errorCode: directRouteError,
    loadRoute: loadSelectedLiveRoute,
  } = useLiveSelectedRoute({
    origin: location,
    destination: firstLiveDestination,
    travelMode: selectedTravelMode,
  });

  const {
    status: liveComparisonStatus,
    results: liveComparisonResults,
    errorCode: liveComparisonError,
    loadComparison: loadLiveTransportComparison,
  } = useLiveTransportComparison({
    origin: location,
    destination: firstLiveDestination,
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
      : mockItinerary.startLocation.name;

  const stops = mockGreenRecommendation.recommendedDestinationOrder;
  const lastIndex = stops.length - 1;

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
            <span className="m2-badge">Frontend Prototype</span>
          </div>
        </header>

        <p className="m2-notice" role="note">
          Demonstration data is being used while Module 1 and live route
          services are under development.
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
              />
              <ItinerarySummary
                itinerary={mockItinerary}
                recommendation={mockGreenRecommendation}
                startLocationName={startLocationName}
                onCompare={showCompare}
                onPreview={showNavigation}
              />
              <div style={{ marginTop: 16 }}>
                <RouteInformationPanel
                  segments={mockGreenRecommendation.routeSegments}
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
                firstLiveDestination?.name || "Perdana Botanical Garden"
              }
              liveComparisonStatus={liveComparisonStatus}
              liveComparisonError={liveComparisonError}
              liveComparisonResults={liveComparisonResults}
              onLoadComparison={loadLiveTransportComparison}
            />
          ) : null}

          {view === "navigation" ? (
            <NavigationPreview
              stops={stops}
              segments={mockGreenRecommendation.routeSegments}
              startLocation={location}
              destinations={mockItinerary.destinations}
              currentIndex={navIndex}
              paused={paused}
              onPause={() => setPaused(true)}
              onResume={() => setPaused(false)}
              onNext={handleNextDestination}
              onBack={showRecommendation}
              liveOriginName={startLocationName}
              liveDestinationName={
                firstLiveDestination?.name || "Perdana Botanical Garden"
              }
              selectedTravelMode={selectedTravelMode}
              liveRouteStatus={navigationLive.status}
              liveRoute={navigationLive.route}
              liveRouteError={navigationLive.errorCode}
              liveRouteSource={navigationLive.sourceKind}
              onLoadLiveRoute={
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
