function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

export function isFiniteCoordinate(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function isRouteableCoordinate(latitude, longitude) {
  return (
    isFiniteCoordinate(latitude) &&
    isFiniteCoordinate(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function optionalNumber(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function optionalString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function readId(raw, ...keys) {
  for (const key of keys) {
    if (isNonEmptyString(raw?.[key])) return raw[key].trim();
  }
  return null;
}

function normalizeSustainability(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    ecoScore: optionalNumber(source.ecoScore),
    carbonKgCo2e: optionalNumber(
      source.carbonKgCo2e ?? source.carbonKg ?? source.carbon
    ),
    source: optionalString(source.source),
  };
}

function normalizeAccommodationSustainability(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const certification =
    optionalString(source.certification) ||
    (Array.isArray(source.certifications)
      ? optionalString(source.certifications.filter(Boolean).join(", "))
      : null);
  return {
    ecoScore: optionalNumber(source.ecoScore),
    carbonKgCo2ePerNight: optionalNumber(
      source.carbonKgCo2ePerNight ?? source.carbonPerNight
    ),
    certification,
    source: optionalString(source.source),
  };
}

function normalizeStartLocation(rawStart) {
  if (rawStart == null || typeof rawStart !== "object") {
    return { location: null, issue: "missing_start_location" };
  }

  const locationId =
    readId(rawStart, "locationId", "id") || "itinerary-start";
  const name = optionalString(rawStart.name) || "Starting location";
  const latitude = rawStart.latitude;
  const longitude = rawStart.longitude;
  const placeId = optionalString(rawStart.placeId);
  const routeable = isRouteableCoordinate(latitude, longitude);

  return {
    location: {
      locationId,
      name,
      latitude: routeable ? latitude : null,
      longitude: routeable ? longitude : null,
      placeId,
      routeable,
    },
    issue: routeable ? null : "invalid_start_coordinates",
  };
}

function destinationDay(raw) {
  if (isFiniteCoordinate(raw.day)) return raw.day;
  return 1;
}

function destinationOrder(raw, index) {
  if (isFiniteCoordinate(raw.order)) return raw.order;
  if (isFiniteCoordinate(raw.plannedOrder)) return raw.plannedOrder;
  return index + 1;
}

function asDestinationEntries(raw) {
  if (Array.isArray(raw.destinations)) {
    return raw.destinations.map((entry, index) => ({ entry, index }));
  }
  if (raw.destinationId || raw.destinationName) {
    return [
      {
        entry: {
          destinationId: raw.destinationId,
          name: raw.destinationName,
          latitude: raw.destinationLatitude,
          longitude: raw.destinationLongitude,
          placeId: raw.destinationPlaceId,
          order: 1,
          day: 1,
          sustainability: raw.destinationSustainability,
        },
        index: 0,
      },
    ];
  }
  return [];
}

function normalizeDestination(entry, index) {
  if (entry == null || typeof entry !== "object") {
    return {
      destination: null,
      issue: {
        code: "malformed_destination",
        destinationId: null,
        name: null,
        message: "A destination entry is missing or not readable.",
      },
    };
  }

  const destinationId =
    readId(entry, "destinationId", "id") || `destination-${index + 1}`;
  const name = optionalString(entry.name) || `Destination ${index + 1}`;
  const latitude = entry.latitude;
  const longitude = entry.longitude;
  const routeable = isRouteableCoordinate(latitude, longitude);
  const hasAnyCoord =
    entry.latitude != null || entry.longitude != null;
  const issueCode = routeable
    ? null
    : hasAnyCoord
      ? "invalid_coordinates"
      : "missing_coordinates";

  return {
    destination: {
      destinationId,
      name,
      latitude: routeable ? latitude : null,
      longitude: routeable ? longitude : null,
      placeId: optionalString(entry.placeId),
      order: destinationOrder(entry, index),
      day: destinationDay(entry),
      routeable,
      originalIndex: index,
      sustainability: normalizeSustainability(entry.sustainability),
    },
    issue: issueCode
      ? {
          code: issueCode,
          destinationId,
          name,
          message:
            issueCode === "missing_coordinates"
              ? `${name} is missing map coordinates, so it cannot be sent to live routing.`
              : `${name} has invalid map coordinates, so it cannot be sent to live routing.`,
        }
      : null,
  };
}

function normalizeAccommodation(entry, index) {
  if (entry == null || typeof entry !== "object") return null;
  const accommodationId =
    readId(entry, "accommodationId", "id") || `accommodation-${index + 1}`;
  return {
    accommodationId,
    name: optionalString(entry.name) || accommodationId,
    latitude: isRouteableCoordinate(entry.latitude, entry.longitude)
      ? entry.latitude
      : null,
    longitude: isRouteableCoordinate(entry.latitude, entry.longitude)
      ? entry.longitude
      : null,
    day: isFiniteCoordinate(entry.day) ? entry.day : null,
    nights: isFiniteCoordinate(entry.nights) ? entry.nights : null,
    sustainability: normalizeAccommodationSustainability(
      entry.sustainability || entry
    ),
  };
}

/**
 * Pure Module 1 → Module 2 itinerary adapter. Does not mutate input,
 * call APIs, or invent coordinates, scores, or Place IDs.
 */
export function normalizeModule1Itinerary(raw) {
  const issues = [];

  if (raw == null || typeof raw !== "object") {
    return {
      itinerary: null,
      issues: [
        {
          code: "invalid_itinerary",
          destinationId: null,
          name: null,
          message: "No itinerary was supplied.",
        },
      ],
    };
  }

  const itineraryId = readId(raw, "itineraryId", "id");
  const title = optionalString(raw.title) || optionalString(raw.name);
  const userId = readId(raw, "userId", "ownerId");

  if (!itineraryId) {
    issues.push({
      code: "missing_itinerary_id",
      destinationId: null,
      name: null,
      message: "This itinerary is missing an ID.",
    });
  }
  if (!title) {
    issues.push({
      code: "missing_title",
      destinationId: null,
      name: null,
      message: "This itinerary is missing a title.",
    });
  }

  const start = normalizeStartLocation(raw.startLocation);
  if (start.issue === "missing_start_location") {
    issues.push({
      code: "missing_start_location",
      destinationId: null,
      name: null,
      message:
        "This itinerary does not include a starting location, so the first route segment cannot be requested yet.",
    });
  } else if (start.issue === "invalid_start_coordinates") {
    issues.push({
      code: "invalid_start_coordinates",
      destinationId: start.location?.locationId ?? null,
      name: start.location?.name ?? null,
      message:
        "The starting location is missing valid coordinates, so it cannot be sent to live routing.",
    });
  }

  const destinationResults = asDestinationEntries(raw).map(({ entry, index }) =>
    normalizeDestination(entry, index)
  );
  const destinations = destinationResults
    .map((result) => result.destination)
    .filter(Boolean)
    .sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      if (a.order !== b.order) return a.order - b.order;
      return a.originalIndex - b.originalIndex;
    })
    .map((destination) => {
      const normalized = { ...destination };
      delete normalized.originalIndex;
      return normalized;
    });

  destinationResults.forEach((result) => {
    if (result.issue) issues.push(result.issue);
  });

  if (destinations.length === 0) {
    issues.push({
      code: "missing_destinations",
      destinationId: null,
      name: null,
      message: "This itinerary does not include any destinations.",
    });
  }

  const accommodations = Array.isArray(raw.accommodations)
    ? raw.accommodations
        .map((entry, index) => normalizeAccommodation(entry, index))
        .filter(Boolean)
    : [];

  if (!itineraryId || !title) {
    return { itinerary: null, issues };
  }

  return {
    itinerary: {
      itineraryId,
      userId,
      title,
      startDate: optionalString(raw.startDate) || optionalString(raw.date),
      endDate: optionalString(raw.endDate),
      startLocation: start.location,
      destinations,
      accommodations,
    },
    issues,
  };
}
