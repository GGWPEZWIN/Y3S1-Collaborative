function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Formats kilometres for display. Only finite numbers are formatted.
 * Strings, null, undefined, NaN, Infinity, and other malformed values
 * are not coerced to 0.
 */
export function formatKilometres(
  value,
  unavailableLabel = "Not calculated yet"
) {
  if (!isFiniteNumber(value)) return unavailableLabel;
  return `${value.toFixed(1)} km`;
}

/**
 * Formats minutes for display. Only finite numbers are formatted.
 */
export function formatMinutes(
  value,
  unavailableLabel = "Not calculated yet"
) {
  if (!isFiniteNumber(value)) return unavailableLabel;
  if (value >= 0 && value < 1) return "< 1 min";
  return `${Math.round(value)} min`;
}

export function formatMetersAsKilometres(
  meters,
  unavailableLabel = "Not calculated yet"
) {
  if (!isFiniteNumber(meters)) return unavailableLabel;
  return formatKilometres(meters / 1000, unavailableLabel);
}

export function formatSecondsAsMinutes(
  seconds,
  unavailableLabel = "Not calculated yet"
) {
  if (!isFiniteNumber(seconds)) return unavailableLabel;
  return formatMinutes(seconds / 60, unavailableLabel);
}

export function sumFiniteNumbers(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  if (!values.every(isFiniteNumber)) return null;
  return values.reduce((total, value) => total + value, 0);
}
