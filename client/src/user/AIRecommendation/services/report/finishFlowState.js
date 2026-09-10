export const RECOMMENDATION_SURFACE = {
  LOADING: "loading",
  FINISHING: "finishing",
  COMPLETED_REPORT: "completed_report",
  COMPLETION_SUMMARY: "completion_summary",
  ACTIVE_TRIP: "active_trip",
  OTHER_TRIP: "other_trip",
  START_ITINERARY: "start_itinerary",
  NO_ACTIVE_TRIP: "no_active_trip",
  ITINERARY_UNAVAILABLE: "itinerary_unavailable",
  REPORT_UNAUTHORIZED: "report_unauthorized",
  REPORT_ERROR: "report_error",
};

export const FINISH_ERROR_MESSAGE = {
  SEGMENTS_INCOMPLETE: "Complete every destination before finishing your trip.",
  SEGMENT_SKIP: "Complete every destination before finishing your trip.",
  UNAUTHORIZED: "You do not have access to finish this trip.",
  AUTH_REQUIRED: "You do not have access to finish this trip.",
  REPORT_CONFLICT: "A different completed report already exists for this itinerary.",
  REPORT_INCONSISTENT: "Your completed trip record could not be verified.",
};

export const FINISH_ERROR_FALLBACK = "We couldn’t finish your trip. Please try again.";

export const PUBLISH_ERROR_MESSAGE =
  "We couldn’t share this Eco Report. Please try again.";

export const REPORT_LOAD_ERROR_MESSAGE = {
  UNAUTHORIZED: "You do not have access to this Eco Report.",
  ERROR: "We couldn’t load this Eco Report. Please try again.",
};

export function mapFinishError(code) {
  return FINISH_ERROR_MESSAGE[code] || FINISH_ERROR_FALLBACK;
}

export function canBeginFinish(status) {
  return status !== "finishing";
}

export function nextFinishStatus(current, event) {
  if (event === "start") {
    if (current === "finishing") return current;
    return "finishing";
  }
  if (event === "success") return "completed";
  if (event === "fail") return "error";
  if (event === "reset") return "idle";
  return current || "idle";
}

export function resolveRecommendationSurface({
  finishing = false,
  hasCompletedReport = false,
  tripStatus = "no_active_trip",
  allDestinationsReached = false,
  hasItineraryId = false,
  itineraryReady = false,
  itineraryUnavailable = false,
  tripLoading = false,
  reportLoading = false,
  reportUnauthorized = false,
  reportFailed = false,
} = {}) {
  if (finishing) return RECOMMENDATION_SURFACE.FINISHING;
  if (hasCompletedReport) return RECOMMENDATION_SURFACE.COMPLETED_REPORT;
  if (tripLoading || reportLoading) return RECOMMENDATION_SURFACE.LOADING;
  if (tripStatus === "active_current_itinerary" && allDestinationsReached) {
    return RECOMMENDATION_SURFACE.COMPLETION_SUMMARY;
  }
  if (tripStatus === "active_current_itinerary") {
    return RECOMMENDATION_SURFACE.ACTIVE_TRIP;
  }
  if (tripStatus === "active_different_itinerary") {
    return RECOMMENDATION_SURFACE.OTHER_TRIP;
  }
  if (!hasItineraryId) return RECOMMENDATION_SURFACE.NO_ACTIVE_TRIP;
  if (itineraryUnavailable) return RECOMMENDATION_SURFACE.ITINERARY_UNAVAILABLE;
  if (reportUnauthorized) return RECOMMENDATION_SURFACE.REPORT_UNAUTHORIZED;
  if (reportFailed) return RECOMMENDATION_SURFACE.REPORT_ERROR;
  if (itineraryReady) return RECOMMENDATION_SURFACE.START_ITINERARY;
  return RECOMMENDATION_SURFACE.LOADING;
}
