import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../../../shared/components/Layout";
import {
  cancelActiveTripSession,
  completeCurrentSegment,
  finishTripSession,
  skipCurrentDestination,
  startTripSession,
} from "../../../firebase/tripSessionService";
import { publishEcoReport } from "../../../firebase/ecoReportService";
import { useCurrentUser } from "../../../firebase/useCurrentUser";
import useTripWasteImpact from "../../../firebase/useTripWasteImpact";
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
import { leaveNavigationToTransport } from "../services/navigation/leaveNavigation.js";
import { sumCompletedTransportCarbon } from "../services/navigation/segmentCompletion.js";
import { liveDestinationForSegment } from "../services/navigation/segmentOrigin.js";
import {
  originAfterSkip,
  reconstructRoutingOrigin,
  savedStartOrigin,
} from "../services/navigation/routingOrigin.js";
import { createArrivalLatch } from "../services/navigation/arrivalLatch.js";
import {
  resolveArrivalPersistenceStart,
  resolveGpsArrivalWithSkipDialog,
  resolveSkipConfirmAgainstArrival,
} from "../services/navigation/arrivalSkipOrchestration.js";
import {
  buildProgressOutcomes,
  outcomesBySegmentIndex,
} from "../services/navigation/progressOutcomes.js";
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
import SkipDestinationDialog from "../components/SkipDestinationDialog";
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
const SKIP_ERROR =
  "This destination could not be skipped. Please try again.";
const SKIP_STALE_ERROR =
  "This destination is no longer current. Please try again.";

function mapDestinationsForMap(itinerary, progress = null) {
  if (!itinerary?.destinations) return [];
  return itinerary.destinations
    .filter((destination) => destination.routeable)
    .map((destination, index) => {
      const item = progress?.items?.[index];
      let outcome = "upcoming";
      if (item?.kind === "REACHED") outcome = "reached";
      else if (item?.kind === "SKIPPED") outcome = "skipped";
      else if (item?.kind === "NEXT DESTINATION") outcome = "next";
      return {
        destinationId: destination.destinationId,
        name: destination.name,
        latitude: destination.latitude,
        longitude: destination.longitude,
        plannedOrder: destination.order ?? index + 1,
        outcome,
      };
    });
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
  const [arrivalSaved, setArrivalSaved] = useState(false);
  const [arrivalAckPending, setArrivalAckPending] = useState(false);
  const [latchedDestinationName, setLatchedDestinationName] = useState(null);
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [skipDialogDestination, setSkipDialogDestination] = useState(null);
  const [skipping, setSkipping] = useState(false);
  const [skipError, setSkipError] = useState(null);
  const [finishStatus, setFinishStatus] = useState("idle");
  const [finishError, setFinishError] = useState(null);
  const [localReport, setLocalReport] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState(null);
  const completingRef = useRef(false);
  const skippingRef = useRef(false);
  const finishingRef = useRef(false);
  const publishingRef = useRef(false);
  const streaksRef = useRef(emptyNavigationStreaks());
  const arrivalLatchRef = useRef(null);
  const arrivalSavedRef = useRef(false);
  const skipGuardRef = useRef(null);
  const arrivalResultRef = useRef(null);
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
    setArrivalSaved(false);
    setArrivalAckPending(false);
    setLatchedDestinationName(null);
    setSkipDialogOpen(false);
    setSkipDialogDestination(null);
    setSkipping(false);
    setSkipError(null);
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

  const reportShouldLoad =
    Boolean(localReport) ||
    context.itinerary?.status === "Completed" ||
    tripSession.session?.status === "completed";

  const ecoReport = useEcoReport(
    requestedId || null,
    reportShouldLoad
  );

  const { authUser } = useCurrentUser();
  const wasteImpact = useTripWasteImpact(authUser?.uid || null, requestedId || null);
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
  const progress = buildProgressOutcomes({
    totalSegments,
    currentSegmentIndex,
    completions: tripSession.completedSegments,
    skips: tripSession.skippedSegments,
  });
  const outcomesByIndex = outcomesBySegmentIndex(progress);
  const allDestinationsResolved =
    thisTripActive && totalSegments > 0 && currentSegmentIndex >= totalSegments;
  const firstLiveDestination = liveDestinationForSegment(
    context.segments,
    currentSegmentIndex
  );
  const reconstructedOrigin = reconstructRoutingOrigin({
    itinerary: context.itinerary,
    segments: context.segments,
    completions: tripSession.completedSegments,
    currentSegmentIndex,
  });

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
    (location.source === "device" ? location : reconstructedOrigin);

  const routingContextKey = `${contextKey}:${thisTripActive ? "active" : "inactive"}:${currentSegmentIndex}`;
  const sessionId = tripSession.lock?.sessionId || "";
  const gpsWatchEnabled =
    thisTripActive &&
    !allDestinationsResolved &&
    !finishing &&
    !arrivalAckPending &&
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
        !allDestinationsResolved &&
        !finishing &&
        !arrivalAckPending &&
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
    !allDestinationsResolved &&
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
    if (flowScreen !== TRIP_FLOW.NAV || allDestinationsResolved) return;
    if (!gpsLastFix || !navRoute) return;
    const result = evaluateNavigationFix({
      fix: gpsLastFix,
      destination: firstLiveDestination,
      polylinePoints,
      streaks: streaksRef.current,
    });
    streaksRef.current = result.streaks;
    if (result.arrived) {
      const arrivalPlan = resolveGpsArrivalWithSkipDialog({
        arrived: true,
        skipInFlight: skippingRef.current,
        hasLatch: Boolean(arrivalLatchRef.current),
      });
      if (arrivalPlan.ignoreArrival) return;
      if (arrivalPlan.closeSkipDialog) {
        setSkipDialogOpen(false);
        skipGuardRef.current = null;
        setSkipDialogDestination(null);
        setSkipError(null);
      }
      if (arrivalPlan.createLatch) {
        const latch = createArrivalLatch({
          sessionId,
          segmentIndex: currentSegmentIndex,
          destinationId: firstLiveDestination?.destinationId,
          route: navRoute,
          rankingScore: selectedRankingScore,
        });
        if (latch) {
          arrivalLatchRef.current = latch;
          arrivalSavedRef.current = false;
          arrivalResultRef.current = null;
          setLatchedDestinationName(firstLiveDestination?.name || null);
          setArrivalSaved(false);
          setArrivalAckPending(true);
        }
      }
      if (arrivalPlan.showReached) {
        setIsDeviated(false);
        setFlowScreen(TRIP_FLOW.DESTINATION_REACHED);
      }
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
    allDestinationsResolved,
    sessionId,
    currentSegmentIndex,
    selectedRankingScore,
  ]);

  useEffect(() => {
    streaksRef.current = emptyNavigationStreaks();
    if (arrivalSavedRef.current) return;
    const latch = arrivalLatchRef.current;
    if (
      latch &&
      (latch.sessionId !== sessionId ||
        latch.segmentIndex !== currentSegmentIndex ||
        latch.destinationId !== (firstLiveDestination?.destinationId || null))
    ) {
      arrivalLatchRef.current = null;
      setArrivalAckPending(false);
      setLatchedDestinationName(null);
    }
  }, [sessionId, currentSegmentIndex, firstLiveDestination?.destinationId]);

  if (
    thisTripActive &&
    !allDestinationsResolved &&
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

  const outcomeBusy = completing || skipping || arrivalAckPending;

  function goDisabledReason() {
    if (!originHasCoords) return "This segment needs a usable origin before GO.";
    if (!firstLiveDestination) {
      return "This itinerary does not yet have a routeable next destination.";
    }
    return null;
  }

  async function handleGo() {
    if (finishing || allDestinationsResolved) return;
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
    if (finishing || allDestinationsResolved) return;
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

  function handleBackToTransport() {
    if (finishing || completingRef.current || skippingRef.current || arrivalAckPending) {
      return;
    }
    leaveNavigationToTransport({
      currentSegmentIndex,
      destination: firstLiveDestination,
    });
    setSkipDialogOpen(false);
    skipGuardRef.current = null;
    setSkipDialogDestination(null);
    setSkipError(null);
    streaksRef.current = emptyNavigationStreaks();
    resetGpsWatch();
    setNavRoute(null);
    setIsDeviated(false);
    setCompleteError(null);
    setFlowScreen(TRIP_FLOW.COMPARE);
  }

  function handleOpenSkipDialog() {
    if (finishing || completingRef.current || skippingRef.current || arrivalAckPending) {
      return;
    }
    if (!firstLiveDestination) return;
    skipGuardRef.current = {
      sessionId,
      currentSegmentIndex,
      destinationId: firstLiveDestination.destinationId,
      destinationName: firstLiveDestination.name,
      isFinal: currentSegmentIndex === totalSegments - 1,
    };
    setSkipDialogDestination({
      name: firstLiveDestination.name,
      isFinal: currentSegmentIndex === totalSegments - 1,
    });
    setSkipError(null);
    setSkipDialogOpen(true);
  }

  function handleKeepNavigating() {
    if (skippingRef.current) return;
    skipGuardRef.current = null;
    setSkipDialogOpen(false);
    setSkipDialogDestination(null);
  }

  async function handleConfirmSkip() {
    const guard = skipGuardRef.current;
    if (!guard) return;
    if (
      !resolveSkipConfirmAgainstArrival({
        skipInFlight: skippingRef.current,
        completing: completingRef.current,
        arrivalLatch: arrivalLatchRef.current,
        arrivalSaved: arrivalSavedRef.current,
      }).confirmSkip
    ) {
      return;
    }
    if (
      guard.sessionId !== sessionId ||
      guard.currentSegmentIndex !== currentSegmentIndex ||
      guard.destinationId !== firstLiveDestination?.destinationId
    ) {
      skipGuardRef.current = null;
      setSkipDialogOpen(false);
      setSkipDialogDestination(null);
      setSkipError(SKIP_STALE_ERROR);
      return;
    }
    skippingRef.current = true;
    setSkipping(true);
    setSkipError(null);
    try {
      const result = await skipCurrentDestination({
        expectedSegmentIndex: guard.currentSegmentIndex,
        destinationId: guard.destinationId,
        destinationName: guard.destinationName,
      });
      skipGuardRef.current = null;
      setSkipDialogOpen(false);
      setSkipDialogDestination(null);
      setSkipping(false);
      skippingRef.current = false;
      const nextOriginPlan = originAfterSkip({
        lastValidFix: gpsLastFix,
        reconstructedOrigin: reconstructRoutingOrigin({
          itinerary: context.itinerary,
          segments: context.segments,
          completions: tripSession.completedSegments,
          currentSegmentIndex: result.currentSegmentIndex,
        }),
      });
      const retainedOrigin =
        !nextOriginPlan.usedGps &&
        segmentOriginOverride &&
        isRouteableCoordinate(
          segmentOriginOverride.latitude,
          segmentOriginOverride.longitude
        )
          ? segmentOriginOverride
          : nextOriginPlan.origin;
      setSegmentOriginOverride(retainedOrigin);
      setOriginNotice(
        nextOriginPlan.usedGps
          ? `${guard.destinationName} was skipped. Routing continues from your current location.`
          : retainedOrigin?.source === "reached"
            ? `${guard.destinationName} was skipped. Routing continues from ${retainedOrigin.label}.`
            : `${guard.destinationName} was skipped. Using the saved starting location. You can request your current location.`
      );
      setSelectedMode(null);
      resetNavigationState();
      setFlowScreen(
        result.allDestinationsResolved
          ? TRIP_FLOW.COMPLETION_SUMMARY
          : TRIP_FLOW.OVERVIEW
      );
    } catch {
      skippingRef.current = false;
      setSkipping(false);
      setSkipError(SKIP_ERROR);
    }
  }

  function handleStartNavigation() {
    if (finishing || allDestinationsResolved) return;
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
    if (finishing || allDestinationsResolved) return;
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
    if (finishing) return;
    if (completingRef.current || skippingRef.current) return;
    const latch = arrivalLatchRef.current;
    if (!latch || arrivalSavedRef.current) return;
    if (latch.sessionId !== sessionId) return;
    completingRef.current = true;
    setCompleting(true);
    setCompleteError(null);
    const names = currentSegmentNames(context.segments, latch.segmentIndex);
    try {
      const result = await completeCurrentSegment({
        expectedSegmentIndex: latch.segmentIndex,
        originName: names.originName || startLocationName,
        destinationName:
          names.destinationName || latchedDestinationName || firstLiveDestination?.name,
        route: latch.route,
        rankingScore: latch.rankingScore,
      });
      arrivalSavedRef.current = true;
      arrivalResultRef.current = result;
      setArrivalSaved(true);
      setArrivalAckPending(true);
      setCompleting(false);
      completingRef.current = false;
      setSelectedMode(null);
      streaksRef.current = emptyNavigationStreaks();
    } catch {
      setCompleteError(COMPLETE_ERROR);
      completingRef.current = false;
      setCompleting(false);
    }
  }

  function handleAcknowledgeArrival() {
    if (!arrivalSavedRef.current) return;
    const result = arrivalResultRef.current;
    arrivalLatchRef.current = null;
    arrivalResultRef.current = null;
    arrivalSavedRef.current = false;
    setArrivalAckPending(false);
    setArrivalSaved(false);
    setLatchedDestinationName(null);
    setSegmentOriginOverride(null);
    setOriginNotice(null);
    restoreSavedOrigin();
    resetNavigationState();
    setFlowScreen(
      result?.allDestinationsResolved
        ? TRIP_FLOW.COMPLETION_SUMMARY
        : TRIP_FLOW.OVERVIEW
    );
  }

  useEffect(() => {
    if (flowScreen !== TRIP_FLOW.DESTINATION_REACHED) return;
    const latch = arrivalLatchRef.current;
    if (
      !resolveArrivalPersistenceStart({
        reachedScreen: true,
        latch,
        alreadySaving: completingRef.current,
        alreadySaved: arrivalSavedRef.current,
        skipInFlight: skippingRef.current,
      }).startSave
    ) {
      return;
    }
    void handleCompleteDestination();
    // Arrival save is latched through refs so Strict Mode cannot double-write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowScreen, sessionId, currentSegmentIndex, latchedDestinationName]);

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
    if (finishing || completingRef.current || skippingRef.current || arrivalAckPending) {
      return;
    }
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
    skips: tripSession.skippedSegments,
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
    allDestinationsReached: allDestinationsResolved && !arrivalAckPending,
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
            wasteImpact={wasteImpact.impact}
            wasteImpactStatus={wasteImpact.status}
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
            wasteImpact={wasteImpact.impact}
            wasteImpactStatus={wasteImpact.status}
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
                originSource={effectiveOrigin.source}
                nextDestinationName={
                  firstLiveDestination?.name || "Next destination unavailable"
                }
                segmentNumber={currentSegmentIndex + 1}
                totalSegments={totalSegments}
                currentStopIndex={currentSegmentIndex}
                outcomesByIndex={outcomesByIndex}
                firstSegmentDistance={segmentDistance}
                firstSegmentEta={segmentEta}
                locationStatus={locationStatus}
                onUseCurrentLocation={requestCurrentLocation}
                onUseSavedStart={() => {
                  setSegmentOriginOverride(savedStartOrigin(context.itinerary));
                  setOriginNotice(null);
                  restoreSavedOrigin();
                }}
                locationLoading={locationStatus === "loading"}
                startLocation={mapStartLocation}
                destinations={mapDestinationsForMap(context.itinerary, progress)}
                confirmingCancel={confirmingCancel}
                cancelError={CANCEL_MESSAGES[tripAction.error] || null}
                isCancelling={tripAction.status === "cancelling"}
                actionsDisabled={outcomeBusy}
                onGo={handleGo}
                goDisabled={!canRequestCurrentSegment || outcomeBusy}
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
                destinations={mapDestinationsForMap(context.itinerary, progress)}
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
                onBackToTransport={handleBackToTransport}
                onNextNavigation={handleOpenSkipDialog}
                actionsDisabled={outcomeBusy}
              />
            ) : null}

            {flowScreen === TRIP_FLOW.DESTINATION_REACHED ? (
              <DestinationReached
                destinationName={
                  latchedDestinationName ||
                  firstLiveDestination?.name ||
                  "Current destination"
                }
                originName={startLocationName}
                travelModeLabel={
                  TRAVEL_MODE_LABEL[selectedTravelMode] || "Selected transport"
                }
                completing={completing}
                completeError={completeError}
                saved={arrivalSaved}
                onRetry={handleCompleteDestination}
                onAcknowledge={handleAcknowledgeArrival}
                actionsDisabled={skipping}
              />
            ) : null}

            <SkipDestinationDialog
              open={skipDialogOpen}
              destinationName={skipDialogDestination?.name}
              isFinalDestination={Boolean(skipDialogDestination?.isFinal)}
              confirming={skipping}
              error={skipError}
              onKeepNavigating={handleKeepNavigating}
              onSkipDestination={handleConfirmSkip}
            />
          </>
        ) : null}
      </div>
    </Layout>
  );
}
