import {
  getAccommodationsFor,
  MOCK_ITINERARIES,
} from "../../../Itinerary/constants/itineraryData.js";
import { mockItinerary } from "../../data/mockModule2Data.js";
import { buildOrderedSegments } from "./buildRouteSegments.js";
import { normalizeModule1Itinerary } from "./normalizeItinerary.js";

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

function withModule1Accommodation(raw) {
  if (Array.isArray(raw.accommodations) || !raw.accommodationId) {
    return raw;
  }
  const match = getAccommodationsFor(raw.destinationId).find(
    (item) => item.id === raw.accommodationId
  );
  if (!match) {
    return {
      ...raw,
      accommodations: [
        {
          accommodationId: raw.accommodationId,
          name: raw.accommodationId,
        },
      ],
    };
  }
  return {
    ...raw,
    accommodations: [
      {
        accommodationId: match.id,
        name: match.name,
        sustainability: {
          ecoScore: match.ecoScore,
          certification: Array.isArray(match.certifications)
            ? match.certifications.join(", ")
            : null,
          source: "module1",
        },
      },
    ],
  };
}

function packResult(source, raw) {
  const { itinerary, issues } = normalizeModule1Itinerary(raw);
  const segments = buildOrderedSegments(itinerary);
  return {
    source,
    itinerary,
    issues,
    segments,
    routeableSegmentCount: segments.filter((segment) => segment.routeable).length,
  };
}

/**
 * Resolves the itinerary Module 2 should display.
 * Uses the existing hash itinerary ID and Module 1 mock list.
 * Does not create a new Firestore collection or mix demo stops into a
 * Module 1 itinerary.
 */
export function resolveItineraryContext({
  itineraryId = null,
  itinerary = null,
} = {}) {
  if (itinerary != null && typeof itinerary === "object") {
    return packResult("module1", withModule1Accommodation(itinerary));
  }

  if (typeof itineraryId === "string" && itineraryId.trim() !== "") {
    const match = MOCK_ITINERARIES.find((item) => item.id === itineraryId);
    if (match) {
      return packResult("module1", withModule1Accommodation(match));
    }
    return {
      source: "module1",
      itinerary: null,
      issues: [
        {
          code: "itinerary_unavailable",
          destinationId: null,
          name: null,
          message:
            "The selected itinerary could not be loaded. Demonstration destinations were not added.",
        },
      ],
      segments: [],
      routeableSegmentCount: 0,
    };
  }

  return packResult("demo", demoRawItinerary());
}
