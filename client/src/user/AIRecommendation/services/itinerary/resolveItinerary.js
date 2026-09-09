import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../../../firebase/config";
import { getItinerary } from "../../../../firebase/itineraryService";
import { mockItinerary } from "../../data/mockModule2Data.js";
import { buildOrderedSegments } from "./buildRouteSegments.js";
import { normalizeModule1Itinerary } from "./normalizeItinerary.js";

export const ITINERARY_LOAD_STATUS = {
  LOADING: "loading",
  SUCCESS: "success",
  DEMO: "demo",
  NOT_FOUND: "not_found",
  UNAUTHORIZED: "unauthorized",
  INVALID: "invalid",
  LOAD_FAILED: "load_failed",
};

const SAFE_MESSAGES = {
  loading: "Loading your saved itinerary…",
  not_found: "This itinerary could not be found.",
  unauthorized: "You do not have access to this itinerary.",
  invalid:
    "This itinerary is missing required details and cannot be used for recommendations.",
  load_failed: "The itinerary could not be loaded. Please try again.",
};

function emptyPack(status, message, extraIssues = []) {
  return {
    status,
    source: status === ITINERARY_LOAD_STATUS.DEMO ? "demo" : "module1",
    itinerary: null,
    issues: extraIssues,
    segments: [],
    routeableSegmentCount: 0,
    message,
  };
}

function demoRawItinerary() {
  return {
    itineraryId: mockItinerary.itineraryId,
    userId: mockItinerary.ownerId ?? null,
    title: mockItinerary.title,
    startDate: mockItinerary.date ?? null,
    endDate: null,
    startLocation: {
      locationId: "start-kl-sentral",
      name: mockItinerary.startLocation.name,
      latitude: mockItinerary.startLocation.latitude,
      longitude: mockItinerary.startLocation.longitude,
    },
    destinations: mockItinerary.destinations.map((destination) => ({
      destinationId: destination.destinationId,
      name: destination.name,
      latitude: destination.latitude,
      longitude: destination.longitude,
      order: destination.plannedOrder,
      day: 1,
    })),
  };
}

function packResult(status, source, raw) {
  const { itinerary, issues } = normalizeModule1Itinerary(raw);
  if (!itinerary) {
    return emptyPack(
      ITINERARY_LOAD_STATUS.INVALID,
      SAFE_MESSAGES.invalid,
      issues
    );
  }

  const segments = buildOrderedSegments(itinerary);
  return {
    status,
    source,
    itinerary,
    issues,
    segments,
    routeableSegmentCount: segments.filter((segment) => segment.routeable)
      .length,
    message: null,
  };
}

function waitForSignedInUser() {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user || null);
    });
  });
}

function firebaseErrorCode(error) {
  return typeof error?.code === "string" ? error.code : "";
}

function mapFirestoreFailure(error) {
  const code = firebaseErrorCode(error);
  if (code === "permission-denied" || code === "unauthenticated") {
    return emptyPack(
      ITINERARY_LOAD_STATUS.UNAUTHORIZED,
      SAFE_MESSAGES.unauthorized
    );
  }
  if (code === "not-found") {
    return emptyPack(ITINERARY_LOAD_STATUS.NOT_FOUND, SAFE_MESSAGES.not_found);
  }
  return emptyPack(
    ITINERARY_LOAD_STATUS.LOAD_FAILED,
    SAFE_MESSAGES.load_failed
  );
}

async function resolveSavedItinerary(itineraryId) {
  const user = await waitForSignedInUser();
  if (!user) {
    return emptyPack(
      ITINERARY_LOAD_STATUS.UNAUTHORIZED,
      SAFE_MESSAGES.unauthorized
    );
  }

  let document;
  try {
    document = await getItinerary(itineraryId);
  } catch (error) {
    return mapFirestoreFailure(error);
  }

  if (!document) {
    return emptyPack(ITINERARY_LOAD_STATUS.NOT_FOUND, SAFE_MESSAGES.not_found);
  }

  if (!document.userId || document.userId !== user.uid) {
    return emptyPack(
      ITINERARY_LOAD_STATUS.UNAUTHORIZED,
      SAFE_MESSAGES.unauthorized
    );
  }

  return packResult(ITINERARY_LOAD_STATUS.SUCCESS, "module1", document);
}

export function createLoadingContext(itineraryId) {
  return {
    ...emptyPack(ITINERARY_LOAD_STATUS.LOADING, SAFE_MESSAGES.loading),
    requestedId: itineraryId,
  };
}

export function createDemoItineraryContext() {
  return packResult(ITINERARY_LOAD_STATUS.DEMO, "demo", demoRawItinerary());
}

export function createLoadFailedContext() {
  return emptyPack(
    ITINERARY_LOAD_STATUS.LOAD_FAILED,
    SAFE_MESSAGES.load_failed
  );
}

/**
 * Resolves the itinerary Module 2 should display.
 * Demonstration data is used only when no itinerary ID was provided.
 * A real ID never falls back to demonstration destinations.
 */
export async function resolveItineraryContext({
  itineraryId = null,
  itinerary = null,
} = {}) {
  const requestedId =
    typeof itineraryId === "string" ? itineraryId.trim() : "";

  if (requestedId) {
    return resolveSavedItinerary(requestedId);
  }

  if (itinerary != null && typeof itinerary === "object") {
    return packResult(ITINERARY_LOAD_STATUS.SUCCESS, "module1", itinerary);
  }

  return packResult(ITINERARY_LOAD_STATUS.DEMO, "demo", demoRawItinerary());
}
