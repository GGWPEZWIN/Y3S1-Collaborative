function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export const TRAVEL_MODE_LABEL = {
  WALK: "Walking",
  TRANSIT: "Public transit",
  DRIVE: "Driving",
};

export function formatScore(value, unavailableLabel = "Unavailable") {
  if (!isFiniteNumber(value)) return unavailableLabel;
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 10) / 10);
}

export function formatCarbonKg(value, unavailableLabel = "Unavailable") {
  if (!isFiniteNumber(value)) return unavailableLabel;
  if (value === 0) return "0 kg CO₂e";
  if (value < 1) return `${value.toFixed(3)} kg CO₂e`;
  return `${value.toFixed(2)} kg CO₂e`;
}

export function formatDistanceMeters(value, unavailableLabel = "Unavailable") {
  if (!isFiniteNumber(value)) return unavailableLabel;
  const kilometres = value / 1000;
  return `${kilometres.toFixed(1)} km`;
}

export function formatDurationSeconds(value, unavailableLabel = "Unavailable") {
  if (!isFiniteNumber(value)) return unavailableLabel;
  if (value >= 0 && value < 60) return "< 1 min";
  return `${Math.round(value / 60)} min`;
}

export function formatCompletionDate(value, unavailableLabel = "Unavailable") {
  if (value == null) return unavailableLabel;
  let date = null;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value?.toDate === "function") {
    try {
      date = value.toDate();
    } catch {
      return unavailableLabel;
    }
  } else if (typeof value === "string") {
    const parsed = new Date(value);
    date = Number.isNaN(parsed.getTime()) ? null : parsed;
  } else if (typeof value?.seconds === "number" && Number.isFinite(value.seconds)) {
    date = new Date(value.seconds * 1000);
  }
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return unavailableLabel;
  }
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function travelModeLabel(travelMode) {
  return TRAVEL_MODE_LABEL[travelMode] || "Unavailable";
}

export function visibilityLabel(visibility) {
  return visibility === "public" ? "Public" : "Private";
}
