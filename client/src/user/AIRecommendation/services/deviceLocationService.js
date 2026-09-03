const POSITION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 30000,
};

export const DEVICE_LOCATION_ERROR = {
  PERMISSION_DENIED: "PERMISSION_DENIED",
  POSITION_UNAVAILABLE: "POSITION_UNAVAILABLE",
  TIMEOUT: "TIMEOUT",
  UNSUPPORTED: "UNSUPPORTED",
  INSECURE_CONTEXT: "INSECURE_CONTEXT",
  UNKNOWN: "UNKNOWN",
};

function createLocationError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function mapBrowserError(error) {
  const code = error && error.code;
  if (code === 1) return DEVICE_LOCATION_ERROR.PERMISSION_DENIED;
  if (code === 2) return DEVICE_LOCATION_ERROR.POSITION_UNAVAILABLE;
  if (code === 3) return DEVICE_LOCATION_ERROR.TIMEOUT;
  return DEVICE_LOCATION_ERROR.UNKNOWN;
}

/**
 * One-shot device location. Does not watch position, log coordinates,
 * or send them over the network.
 */
export function getCurrentDeviceLocation() {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      reject(createLocationError(DEVICE_LOCATION_ERROR.INSECURE_CONTEXT));
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.geolocation ||
      typeof navigator.geolocation.getCurrentPosition !== "function"
    ) {
      reject(createLocationError(DEVICE_LOCATION_ERROR.UNSUPPORTED));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
          capturedAt: new Date(position.timestamp).toISOString(),
          source: "device",
        });
      },
      (error) => {
        reject(createLocationError(mapBrowserError(error)));
      },
      POSITION_OPTIONS
    );
  });
}
