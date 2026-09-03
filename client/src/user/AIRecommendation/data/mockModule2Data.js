/**
 * Frontend-only demonstration data for Module 2.
 * Not live Module 1 output, Google Routes results, or calculated Eco-Scores.
 */

export const mockItinerary = {
  itineraryId: "demo-itinerary-kl-green-day",
  ownerId: "demo-owner",
  title: "KL City Green Day Trip",
  date: "2026-09-12",
  startLocation: {
    name: "KL Sentral",
    latitude: 3.1348,
    longitude: 101.6865,
  },
  destinations: [
    {
      destinationId: "dest-perdana-botanical-garden",
      name: "Perdana Botanical Garden",
      latitude: 3.1426,
      longitude: 101.6849,
      plannedOrder: 1,
      estimatedVisitMinutes: 60,
    },
    {
      destinationId: "dest-central-market",
      name: "Central Market",
      latitude: 3.1458,
      longitude: 101.6958,
      plannedOrder: 2,
      estimatedVisitMinutes: 45,
    },
    {
      destinationId: "dest-klcc-park",
      name: "KLCC Park",
      latitude: 3.157,
      longitude: 101.7123,
      plannedOrder: 3,
      estimatedVisitMinutes: 50,
    },
  ],
  departureTime: "09:00",
  source: "demo",
};

export const mockGreenRecommendation = {
  recommendationId: "demo-rec-kl-public-transit",
  itineraryId: "demo-itinerary-kl-green-day",
  recommendedMode: "public_transit",
  recommendedDestinationOrder: [
    {
      stopId: "start-kl-sentral",
      name: "KL Sentral",
      kind: "start",
    },
    {
      stopId: "dest-perdana-botanical-garden",
      name: "Perdana Botanical Garden",
      kind: "destination",
    },
    {
      stopId: "dest-central-market",
      name: "Central Market",
      kind: "destination",
    },
    {
      stopId: "dest-klcc-park",
      name: "KLCC Park",
      kind: "destination",
    },
  ],
  transportationOptions: [
    {
      mode: "walking",
      label: "Walking",
      estimatedDurationMinutes: 95,
      estimatedDistanceKm: 6.8,
      estimatedCarbonKg: 0.1,
      demoEcoScore: 96,
      advantages: [
        "Lowest demonstration carbon figure",
        "No fare or parking",
        "Fits short inner-city hops",
      ],
      limitations: [
        "Longest demonstration duration",
        "Less comfortable in heat or rain",
        "Not ideal with luggage",
      ],
      isRecommended: false,
    },
    {
      mode: "public_transit",
      label: "Public transit",
      estimatedDurationMinutes: 48,
      estimatedDistanceKm: 8.2,
      estimatedCarbonKg: 1.4,
      demoEcoScore: 88,
      advantages: [
        "Balanced time and demonstration carbon",
        "Uses rail and short walks",
        "Avoids city-centre parking",
      ],
      limitations: [
        "Includes transfer time in the estimate",
        "Depends on service frequency",
        "Last stretch is still a short walk",
      ],
      isRecommended: true,
    },
    {
      mode: "driving",
      label: "Driving",
      estimatedDurationMinutes: 32,
      estimatedDistanceKm: 9.1,
      estimatedCarbonKg: 2.8,
      demoEcoScore: 54,
      advantages: [
        "Shortest demonstration duration",
        "Door-to-door flexibility",
        "Useful in heavy rain",
      ],
      limitations: [
        "Highest demonstration carbon figure",
        "Parking near KLCC is limited",
        "Traffic can erase the time gain",
      ],
      isRecommended: false,
    },
  ],
  totalDistanceKm: 8.2,
  estimatedTotalDurationMinutes: 48,
  estimatedCarbonKg: 1.4,
  demoEcoScore: 88,
  recommendationExplanation:
    "Public transit is the demonstration pick for this KL day trip: it keeps most of the walk-score benefit while cutting the 95-minute walking estimate almost in half. These figures are prototype estimates, not Google Routes, GPS, or live carbon results.",
  routeSegments: [
    {
      segmentId: "seg-1",
      origin: "KL Sentral",
      destination: "Perdana Botanical Garden",
      mode: "public_transit",
      modeLabel: "Public transit",
      estimatedDistanceKm: 1.6,
      estimatedDurationMinutes: 12,
      estimatedCarbonKg: 0.3,
    },
    {
      segmentId: "seg-2",
      origin: "Perdana Botanical Garden",
      destination: "Central Market",
      mode: "public_transit",
      modeLabel: "Public transit",
      estimatedDistanceKm: 2.4,
      estimatedDurationMinutes: 16,
      estimatedCarbonKg: 0.5,
    },
    {
      segmentId: "seg-3",
      origin: "Central Market",
      destination: "KLCC Park",
      mode: "public_transit",
      modeLabel: "Public transit",
      estimatedDistanceKm: 4.2,
      estimatedDurationMinutes: 20,
      estimatedCarbonKg: 0.6,
    },
  ],
  source: "demo",
  isDemo: true,
};
