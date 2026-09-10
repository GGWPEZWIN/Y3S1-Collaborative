import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../../../shared/components/Layout";
import {
  cancelActiveTripSession,
  completeCurrentSegment,
  finishTripSession,
  startTripSession,
} from "../../../firebase/tripSessionService";
import { publishEcoReport } from "../../../firebase/ecoReportService";
import { mockGreenRecommendation } from "../data/mockModule2Data";
import useActiveTripSession, {
  ACTIVE_TRIP_STATUS,
} from "../hooks/useActiveTripSession";
import useCurrentLocation from "../hooks/useCurrentLocation";
import useLiveTransportComparison from "../hooks/useLiveTransportComparison";
import useNavigationGpsWatch from "../hooks/useNavigationGpsWatch";
import useRecalculateSelectedRoute from "../hooks/useRecalculateSelectedRoute";
import useEcoReport, { ECO_REPORT_LOAD } from "../hooks/useEcoReport";
import useResolvedItinerary from "../hooks/useResolvedItinerary";
import { ITINERARY_LOAD_STATUS } from "../services/itinerary/resolveItinerary.js";
import { isRouteableCoordinate } from "../services/itinerary/normalizeItinerary.js";
import {
  formatMetersAsKilometres,
  formatSecondsAsMinutes,
} from "../services/formatMeasurement.js";
import { decodeGooglePolyline } from "../services/navigation/decodePolyline.js";
import {
  emptyNavigationStreaks,
  evaluateNavigationFix,
} from "../services/navigation/detection.js";
import { isValidGpsFix } from "../services/navigation/coordinates.js";
import { leaveNavigationPreview } from "../services/navigation/leaveNavigation.js";
import { sumCompletedTransportCarbon } from "../services/navigation/segmentCompletion.js";
import {
  liveDestinationForSegment,
  savedOriginForSegment,
} from "../services/navigation/segmentOrigin.js";
import { rankGreenRoutes } from "../services/sustainability/greenRouteRanker";
import {
  buildCompletedReportView,
  isModule2Report,
} from "../services/report/completedReportView.js";
import { buildCompletionSummary } from "../services/report/completionSummaryView.js";
import {
  canBeginFinish,
  mapFinishError,
  nextFinishStatus,
  PUBLISH_ERROR_MESSAGE,
  RECOMMENDATION_SURFACE,
  REPORT_LOAD_ERROR_MESSAGE,
  resolveRecommendationSurface,
} from "../services/report/finishFlowState.js";
import { TRIP_FLOW } from "../tripFlow.js";
import ActiveTripOverview from "../components/ActiveTripOverview";
import ComparisonLoadingScreen from "../components/ComparisonLoadingScreen";
import CompletedEcoReport from "../components/CompletedEcoReport";
import CompletionSummary from "../components/CompletionSummary";
import DestinationReached from "../components/DestinationReached";
import FinishingTrip from "../components/FinishingTrip";
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

const TRAVEL_MODE_LABEL = {
  WALK: "Walking",
  TRANSIT: "Public transit",
  DRIVE: "Driving",
};

const CANCEL_MESSAGES = {
  AUTH_REQUIRED: "Please sign in again to cancel the active trip.",
  UNAUTHORIZED: "You do not have access to cancel this trip.",
  SESSION_MISMATCH: "The active trip could not be cancelled. Please try again.",
  UNAVAILABLE: "The trip could not be cancelled. Please try again.",
};

const COMPLETE_ERROR =
  "The destination could not be saved. Please try again.";

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

function rankingScoreForMode(results, travelMode) {
  if (!results || !travelMode) return null;
  const candidates = ["WALK", "TRANSIT", "DRIVE"].flatMap((mode) => {
    const entry = results[mode];
    if (entry?.status !== "success" || !entry.route) return [];
    return [
      {
        travelMode: mode,
        distanceMeters: entry.route.distanceMeters,
        durationSeconds: entry.route.durationSeconds,
      },
    ];
  });
  const ranking = rankGreenRoutes(candidates);
  const ranked = ranking.ranked.find((item) => item.travelMode === travelMode);
  return typeof ranked?.rankingScore === "number" &&
    Number.isFinite(ranked.rankingScore) &&
    ranked.rankingScore >= 0 &&
    ranked.rankingScore <= 100
    ? ranked.rankingScore
    : null;
}

function currentSegmentNames(segments, segmentIndex) {
  const segment = Array.isArray(segments) ? segments[segmentIndex] : null;
  return {
    originName: segment?.origin?.name || null,
    destinationName: segment?.destination?.name || null,
  };
}

export default function GreenRecommendationPage({
  onNavigate,
  itineraryId = null,
  itinerary = null,
}) {
  const [flowScreen, setFlowScreen] = useState(TRIP_FLOW.OVERVIEW);
  const [selectedMode, setSelectedMode] = useState(null);
  const [activeItineraryId, setActiveItineraryId] = useState(itineraryId);
  const [tripAction, setTripAction] = useState({
    status: "idle",
    error: null,
  });
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [originStamp, setOriginStamp] = useState(null);
  const [segmentOriginOverride, setSegmentOriginOverride] = useState(null);
  const [originNotice, setOriginNotice] = useState(null);
  const [navRoute, setNavRoute] = useState(null);
  const [isDeviated, setIsDeviated] = useState(false);
  const [selectedRankingScore, setSelectedRankingScore] = useState(null);
  const [completeError, setCompleteError] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [finishStatus, setFinishStatus] = useState("idle");
  const [finishError, setFinishError] = useState(null);
  const [localReport, setLocalReport] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState(null);
  const completingRef = useRef(false);
  const finishingRef = useRef(false);
  const publishingRef = useRef(false);
  const streaksRef = useRef(emptyNavigationStreaks());
  const navigationGuardRef = useRef({
    sessionId: "",
    currentSegmentIndex: 0,
    flowScreen: TRIP_FLOW.OVERVIEW,
    destinationId: null,
    travelMode: null,
  });

  if (activeItineraryId !== itineraryId) {
    setActiveItineraryId(itineraryId);
    setFlowScreen(TRIP_FLOW.OVERVIEW);
    setSelectedMode(null);
    setTripAction({ status: "idle", error: null });
    setConfirmingCancel(false);
    setSegmentOriginOverride(null);
    setOriginNotice(null);
    setNavRoute(null);
    setIsDeviated(false);
    setSelectedRankingScore(null);
    setCompleteError(null);
    setFinishStatus("idle");
    setFinishError(null);
    setLocalReport(null);
    setPublishing(false);
    setPublishError(null);
  }

  const context = useResolvedItinerary({ itineraryId, itinerary });
  const requestedId =
    typeof itineraryId === "string" ? itineraryId.trim() : "";
  const tripSession = useActiveTripSession(requestedId || null);
  const ecoReport = useEcoReport(requestedId || null);
  useEffect(() => {
    finishingRef.current = false;
    publishingRef.current = false;
  }, [requestedId]);
  const finishing = finishStatus === "finishing";
  const mergedReport = localReport || ecoReport.report;
  const completedReportView = buildCompletedReportView(mergedReport, requestedId);
  const isDemo = context.status === ITINERARY_LOAD_STATUS.DEMO;
  const thisTripActive =
    tripSession.status === ACTIVE_TRIP_STATUS.ACTIVE_CURRENT;
  const otherTripActive =
    tripSession.status === ACTIVE_TRIP_STATUS.ACTIVE_DIFFERENT;
  const contextKey =
    context.status === ITINERARY_LOAD_STATUS.LOADING
      ? `loading:${requestedId}`
      : context.itinerary?.itineraryId || requestedId || context.source;
  const currentSegmentIndex = tripSession.currentSegmentIndex || 0;
  const totalSegments =
    tripSession.session?.totalSegments ||
    context.segments.length ||
    1;
  const allDestinationsReached =
    thisTripActive && totalSegments > 0 && currentSegmentIndex >= totalSegments;
  const firstLiveDestination = liveDestinationForSegment(
    context.segments,
    currentSegmentIndex
  );
  const savedOrigin = savedOriginForSegment(
    context.itinerary,
    context.segments,
    currentSegmentIndex
  );

  const {
    location,
    status: locationStatus,
    requestCurrentLocation,
    useDemoLocation: restoreSavedOrigin,
  } = useCurrentLocation({
    savedStart: context.itinerary?.startLocation || null,
    itineraryKey: contextKey,
  });

  const effectiveOrigin = segmentOriginOverride ||
    (location.source === "device" ? location : savedOrigin);

  const routingContextKey = `${contextKey}:${thisTripActive ? "active" : "inactive"}:${currentSegmentIndex}`;
  const sessionId = tripSession.lock?.sessionId || "";
  const gpsWatchEnabled =
    thisTripActive &&
    !allDestinationsReached &&
    !finishing &&
    (flowScreen === TRIP_FLOW.NAV ||
      flowScreen === TRIP_FLOW.DESTINATION_REACHED);
  const {
    status: gpsStatus,
    lastFix: gpsLastFix,
    reset: resetGpsWatch,
  } = useNavigationGpsWatch(gpsWatchEnabled, `${contextKey}:${sessionId}`);
  const recalculateRoute = useRecalculateSelectedRoute(
    `${sessionId}:${currentSegmentIndex}`
  );

  const originKey = `${effectiveOrigin.latitude},${effectiveOrigin.longitude},${effectiveOrigin.source},${currentSegmentIndex}`;
  if (originStamp !== originKey) {
    const hadOrigin = originStamp !== null;
    setOriginStamp(originKey);
    if (hadOrigin) {
      setSelectedMode(null);
      setNavRoute(null);
      setIsDeviated(false);
      setSelectedRankingScore(null);
      if (
        !allDestinationsReached &&
        !finishing &&
        flowScreen !== TRIP_FLOW.OVERVIEW &&
        flowScreen !== TRIP_FLOW.DESTINATION_REACHED
      ) {
        setFlowScreen(TRIP_FLOW.OVERVIEW);
      }
    }
  }

  const selectedTravelMode = selectedMode
    ? OPTION_TO_TRAVEL_MODE[selectedMode] || null
    : navRoute?.travelMode || null;
  const originHasCoords = isRouteableCoordinate(
    effectiveOrigin.latitude,
    effectiveOrigin.longitude
  );
  const canRequestCurrentSegment =
    thisTripActive &&
    !isDemo &&
    !allDestinationsReached &&
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
    origin: effectiveOrigin,
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
  const activeNavRoute = navRoute || (hasSuccessfulSelection ? selectedEntry.route : null);
  const polylinePoints = useMemo(
    () => decodeGooglePolyline(navRoute?.encodedPolyline || ""),
    [navRoute]
  );
  const carbonSummary = sumCompletedTransportCarbon(
    tripSession.completedSegments
  );

  useEffect(() => {
    navigationGuardRef.current = {
      sessionId,
      currentSegmentIndex,
      flowScreen,
      destinationId: firstLiveDestination?.destinationId || null,
      travelMode: selectedTravelMode,
    };
  }, [
    sessionId,
    currentSegmentIndex,
    flowScreen,
    firstLiveDestination?.destinationId,
    selectedTravelMode,
  ]);

  useEffect(() => {
    if (flowScreen !== TRIP_FLOW.NAV || allDestinationsReached) return;
    if (!gpsLastFix || !navRoute) return;
    const result = evaluateNavigationFix({
      fix: gpsLastFix,
      destination: firstLiveDestination,
      polylinePoints,
      streaks: streaksRef.current,
    });
    streaksRef.current = result.streaks;
    if (result.arrived) {
      setIsDeviated(false);
      setFlowScreen(TRIP_FLOW.DESTINATION_REACHED);
      return;
    }
    if (result.deviated) {
      setIsDeviated(true);
    }
  }, [
    gpsLastFix,
    flowScreen,
    navRoute,
    polylinePoints,
    firstLiveDestination,
    allDestinationsReached,
  ]);

  if (
    thisTripActive &&
    !allDestinationsReached &&
    flowScreen === TRIP_FLOW.NAV &&
    !hasSuccessfulSelection &&
    !navRoute
  ) {
    setFlowScreen(
      liveComparisonStatus === "success" || liveComparisonStatus === "error"
        ? TRIP_FLOW.COMPARE
        : TRIP_FLOW.OVERVIEW
    );
  }

  const startLocationName = effectiveOrigin.label || "Current origin";
  const isReady = context.status === ITINERARY_LOAD_STATUS.SUCCESS;
  const isLoadError =
    Boolean(requestedId) &&
    !isReady &&
    context.status !== ITINERARY_LOAD_STATUS.LOADING;
  const mapStartLocation = mapStartForMap(context.itinerary);
  const selectedRoute = activeNavRoute;
  const segmentDistance = selectedRoute
    ? {
        label: "Selected segment distance",
        value: formatMetersAsKilometres(selectedRoute.distanceMeters),
      }
    : {
        label: "Segment distance",
        value: "Not calculated yet",
      };
  const segmentEta = selectedRoute
    ? {
        label: "Selected segment ETA",
        value: formatSecondsAsMinutes(selectedRoute.durationSeconds),
      }
    : {
        label: "Segment ETA",
        value: "Not calculated yet",
      };

  function resetNavigationState() {
    setNavRoute(null);
    setIsDeviated(false);
    setSelectedRankingScore(null);
    setCompleteError(null);
    setCompleting(false);
    completingRef.current = false;
    streaksRef.current = emptyNavigationStreaks();
    resetGpsWatch();
    recalculateRoute.reset();
  }

  function goDisabledReason() {
    if (!originHasCoords) return "This segment needs a usable origin before GO.";
    if (!firstLiveDestination) {
      return "This itinerary does not yet have a routeable next destination.";
    }
    return null;
  }

  async function handleGo() {
    if (finishing || allDestinationsReached) return;
    if (!canRequestCurrentSegment) return;
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
    if (finishing || allDestinationsReached) return;
    if (!canRequestCurrentSegment) return;
    if (liveComparisonStatus === "loading") return;
    setSelectedMode(null);
    setNavRoute(null);
    setFlowScreen(TRIP_FLOW.LOADING);
    await loadLiveTransportComparison();
    setFlowScreen((screen) =>
      screen === TRIP_FLOW.LOADING ? TRIP_FLOW.COMPARE : screen
    );
  }

  function handleBackToOverview() {
    if (finishing || allDestinationsReached) return;
    const result = leaveNavigationPreview({
      currentSegmentIndex,
      destination: firstLiveDestination,
      lastValidFix: gpsLastFix,
      previousOrigin: effectiveOrigin,
    });
    if (result.usedGpsOrigin && result.originChanged) {
      setSegmentOriginOverride(result.nextOrigin);
    }
    setOriginNotice(result.message);
    resetNavigationState();
    setFlowScreen(TRIP_FLOW.OVERVIEW);
  }

  function handleStartNavigation() {
    if (finishing || allDestinationsReached) return;
    if (!hasSuccessfulSelection) return;
    setNavRoute(selectedEntry.route);
    setIsDeviated(false);
    setCompleteError(null);
    streaksRef.current = emptyNavigationStreaks();
    setSelectedRankingScore(
      rankingScoreForMode(liveComparisonResults, selectedTravelMode)
    );
    setFlowScreen(TRIP_FLOW.NAV);
  }

  async function handleRecalculate() {
    if (finishing || allDestinationsReached) return;
    if (!isValidGpsFix(gpsLastFix) || !firstLiveDestination || !selectedTravelMode) {
      return;
    }
    const requestedSession = sessionId;
    const requestedSegment = currentSegmentIndex;
    const requestedDestinationId = firstLiveDestination.destinationId || null;
    const requestedMode = selectedTravelMode;
    const result = await recalculateRoute.recalculate({
      origin: {
        latitude: gpsLastFix.latitude,
        longitude: gpsLastFix.longitude,
      },
      destination: {
        latitude: firstLiveDestination.latitude,
        longitude: firstLiveDestination.longitude,
      },
      travelMode: requestedMode,
    });
    const guard = navigationGuardRef.current;
    if (
      !result.ok ||
      guard.flowScreen !== TRIP_FLOW.NAV ||
      guard.sessionId !== requestedSession ||
      guard.currentSegmentIndex !== requestedSegment ||
      guard.destinationId !== requestedDestinationId ||
      guard.travelMode !== requestedMode
    ) {
      return;
    }
    setNavRoute(result.route);
    setIsDeviated(false);
    setSelectedRankingScore(null);
    streaksRef.current = emptyNavigationStreaks();
  }

  async function handleCompleteDestination() {
    if (finishing || allDestinationsReached) return;
    if (completingRef.current || completing) return;
    if (!navRoute || !firstLiveDestination) return;
    completingRef.current = true;
    setCompleting(true);
    setCompleteError(null);
    const names = currentSegmentNames(context.segments, currentSegmentIndex);
    try {
      const result = await completeCurrentSegment({
        expectedSegmentIndex: currentSegmentIndex,
        originName: names.originName || startLocationName,
        destinationName: names.destinationName || firstLiveDestination.name,
        route: navRoute,
        rankingScore: selectedRankingScore,
      });
      setSegmentOriginOverride(null);
      setOriginNotice(null);
      restoreSavedOrigin();
      setSelectedMode(null);
      resetNavigationState();
      setFlowScreen(
        result.allDestinationsReached
          ? TRIP_FLOW.COMPLETION_SUMMARY
          : TRIP_FLOW.OVERVIEW
      );
    } catch {
      setCompleteError(COMPLETE_ERROR);
      completingRef.current = false;
      setCompleting(false);
    }
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
    if (finishing) return;
    setTripAction({ status: "cancelling", error: null });
    try {
      await cancelActiveTripSession();
      setConfirmingCancel(false);
      setTripAction({ status: "idle", error: null });
      setSegmentOriginOverride(null);
      setOriginNotice(null);
      setSelectedMode(null);
      resetNavigationState();
      setFlowScreen(TRIP_FLOW.OVERVIEW);
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

  const completionSummary = buildCompletionSummary({
    itinerary: context.itinerary,
    session: tripSession.session,
    lock: tripSession.lock,
    completions: tripSession.completedSegments,
    finishing,
  });

  const tripChecking = tripSession.status === ACTIVE_TRIP_STATUS.LOADING;
  const sessionPending = thisTripActive && !tripSession.session;
  const itineraryLoading =
    Boolean(requestedId) && context.status === ITINERARY_LOAD_STATUS.LOADING;
  const reportLoading =
    Boolean(requestedId) && ecoReport.status === ECO_REPORT_LOAD.LOADING;
  const surface = resolveRecommendationSurface({
    finishing,
    hasCompletedReport: Boolean(completedReportView),
    tripStatus: tripSession.status,
    allDestinationsReached,
    hasItineraryId: Boolean(requestedId),
    itineraryReady: isReady,
    itineraryUnavailable: isLoadError,
    tripLoading: tripChecking || sessionPending,
    reportLoading,
    reportUnauthorized: ecoReport.status === ECO_REPORT_LOAD.UNAUTHORIZED,
    reportFailed: ecoReport.status === ECO_REPORT_LOAD.ERROR,
  });

  async function handleFinishTrip() {
    if (!canBeginFinish(finishStatus) || finishingRef.current) return;
    if (!completionSummary.canFinish || !sessionId) return;
    finishingRef.current = true;
    setFinishStatus(nextFinishStatus(finishStatus, "start"));
    setFinishError(null);
    setConfirmingCancel(false);
    try {
      const result = await finishTripSession(sessionId);
      if (!isModule2Report(result?.report)) {
        setFinishError(mapFinishError("REPORT_INCONSISTENT"));
        setFinishStatus(nextFinishStatus("finishing", "fail"));
        finishingRef.current = false;
        return;
      }
      setLocalReport(result.report);
      setFinishStatus(nextFinishStatus("finishing", "success"));
      setSelectedMode(null);
      resetNavigationState();
      setFlowScreen(TRIP_FLOW.COMPLETED_REPORT);
    } catch (error) {
      setFinishError(mapFinishError(error?.code));
      setFinishStatus(nextFinishStatus("finishing", "fail"));
      finishingRef.current = false;
    }
  }

  async function handlePublishReport() {
    if (publishingRef.current || !requestedId) return;
    if (completedReportView?.isPublic) return;
    publishingRef.current = true;
    setPublishing(true);
    setPublishError(null);
    try {
      const updated = await publishEcoReport(requestedId);
      setLocalReport((current) => ({
        ...(current || mergedReport),
        ...updated,
        visibility: "public",
      }));
    } catch {
      setPublishError(PUBLISH_ERROR_MESSAGE);
    } finally {
      publishingRef.current = false;
      setPublishing(false);
    }
  }

  const gpsCurrentLocation =
    gpsLastFix &&
    (flowScreen === TRIP_FLOW.NAV || flowScreen === TRIP_FLOW.DESTINATION_REACHED)
      ? {
          latitude: gpsLastFix.latitude,
          longitude: gpsLastFix.longitude,
        }
      : null;
  const showActiveTrip = surface === RECOMMENDATION_SURFACE.ACTIVE_TRIP && isReady;

  return (
    <Layout active="recommendations" onNavigate={onNavigate}>
      <div className="m2-page">
        {surface === RECOMMENDATION_SURFACE.LOADING ? (
          <p className="m2-status m2-status--loading" role="status">
            {itineraryLoading
              ? context.message
              : reportLoading
                ? "Loading your Eco Report…"
                : "Checking for an active trip…"}
          </p>
        ) : null}

        {surface === RECOMMENDATION_SURFACE.ITINERARY_UNAVAILABLE ? (
          <article className="m2-card" role="alert">
            <h3>Itinerary unavailable</h3>
            <p className="m2-status m2-status--error">{context.message}</p>
          </article>
        ) : null}

        {surface === RECOMMENDATION_SURFACE.FINISHING ? (
          <FinishingTrip />
        ) : null}

        {surface === RECOMMENDATION_SURFACE.COMPLETED_REPORT ? (
          <CompletedEcoReport
            reportView={completedReportView}
            publishing={publishing}
            publishError={publishError}
            onPublish={handlePublishReport}
          />
        ) : null}

        {surface === RECOMMENDATION_SURFACE.REPORT_UNAUTHORIZED ? (
          <article className="m2-card" role="alert">
            <h3>Eco Report unavailable</h3>
            <p className="m2-status m2-status--error">
              {REPORT_LOAD_ERROR_MESSAGE.UNAUTHORIZED}
            </p>
          </article>
        ) : null}

        {surface === RECOMMENDATION_SURFACE.REPORT_ERROR ? (
          <article className="m2-card" role="alert">
            <h3>Eco Report unavailable</h3>
            <p className="m2-status m2-status--error">
              {REPORT_LOAD_ERROR_MESSAGE.ERROR}
            </p>
          </article>
        ) : null}

        {surface === RECOMMENDATION_SURFACE.COMPLETION_SUMMARY ? (
          <CompletionSummary
            summary={completionSummary}
            confirmingCancel={confirmingCancel}
            cancelError={CANCEL_MESSAGES[tripAction.error] || null}
            isCancelling={tripAction.status === "cancelling"}
            finishDisabled={!completionSummary.canFinish || finishing}
            finishError={finishError}
            onFinish={handleFinishTrip}
            onRequestCancel={() => setConfirmingCancel(true)}
            onConfirmCancel={handleConfirmCancel}
            onKeepTrip={() => setConfirmingCancel(false)}
          />
        ) : null}

        {surface === RECOMMENDATION_SURFACE.NO_ACTIVE_TRIP ? (
          <NoActiveTrip onBrowseItineraries={() => onNavigate?.("/itinerary")} />
        ) : null}

        {surface === RECOMMENDATION_SURFACE.OTHER_TRIP ? (
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

        {surface === RECOMMENDATION_SURFACE.START_ITINERARY ? (
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

        {showActiveTrip ? (
          <>
            <TripFlowStepper screen={flowScreen} />

            {flowScreen === TRIP_FLOW.OVERVIEW ? (
              <ActiveTripOverview
                itinerary={context.itinerary}
                originName={startLocationName}
                originIsDevice={effectiveOrigin.source === "device"}
                nextDestinationName={
                  firstLiveDestination?.name || "Next destination unavailable"
                }
                segmentNumber={currentSegmentIndex + 1}
                totalSegments={totalSegments}
                currentStopIndex={currentSegmentIndex}
                firstSegmentDistance={segmentDistance}
                firstSegmentEta={segmentEta}
                locationStatus={locationStatus}
                onUseCurrentLocation={requestCurrentLocation}
                onUseSavedStart={() => {
                  setSegmentOriginOverride(null);
                  setOriginNotice(null);
                  restoreSavedOrigin();
                }}
                locationLoading={locationStatus === "loading"}
                startLocation={mapStartLocation}
                destinations={mapDestinationsForMap(context.itinerary)}
                confirmingCancel={confirmingCancel}
                cancelError={CANCEL_MESSAGES[tripAction.error] || null}
                isCancelling={tripAction.status === "cancelling"}
                onGo={handleGo}
                goDisabled={!canRequestCurrentSegment}
                goDisabledReason={goDisabledReason()}
                originNotice={originNotice}
                transportCarbonKg={carbonSummary.kg}
                transportCarbonEmpty={carbonSummary.empty}
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
                onBack={() => setFlowScreen(TRIP_FLOW.OVERVIEW)}
                onStartNavigation={handleStartNavigation}
                liveOriginName={startLocationName}
                liveDestinationName={
                  firstLiveDestination?.name || "Next destination"
                }
                liveComparisonStatus={liveComparisonStatus}
                liveComparisonError={liveComparisonError}
                liveComparisonResults={visibleComparisonResults}
                onLoadComparison={
                  canRequestCurrentSegment ? handleRefreshComparison : undefined
                }
                canStartNavigation={hasSuccessfulSelection}
              />
            ) : null}

            {flowScreen === TRIP_FLOW.NAV ? (
              <NavigationPreview
                startLocation={
                  effectiveOrigin.source === "device"
                    ? {
                        latitude: effectiveOrigin.latitude,
                        longitude: effectiveOrigin.longitude,
                        label: effectiveOrigin.label,
                      }
                    : mapStartLocation || effectiveOrigin
                }
                destinations={mapDestinationsForMap(context.itinerary)}
                liveOriginName={startLocationName}
                liveDestinationName={
                  firstLiveDestination?.name || "Next destination"
                }
                selectedTravelMode={selectedTravelMode || "TRANSIT"}
                liveRoute={activeNavRoute}
                markerSource="saved"
                gpsStatus={gpsStatus}
                gpsAccuracyMeters={gpsLastFix?.accuracyMeters ?? null}
                currentLocation={gpsCurrentLocation}
                isDeviated={isDeviated}
                recalculateStatus={recalculateRoute.status}
                recalculateError={recalculateRoute.errorCode}
                canRecalculate={isValidGpsFix(gpsLastFix)}
                onRecalculate={handleRecalculate}
                onBackToOverview={handleBackToOverview}
              />
            ) : null}

            {flowScreen === TRIP_FLOW.DESTINATION_REACHED ? (
              <DestinationReached
                destinationName={
                  firstLiveDestination?.name || "Current destination"
                }
                originName={startLocationName}
                travelModeLabel={
                  TRAVEL_MODE_LABEL[selectedTravelMode] || "Selected transport"
                }
                completing={completing}
                completeError={completeError}
                onComplete={handleCompleteDestination}
                onBackToOverview={handleBackToOverview}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </Layout>
  );
}
