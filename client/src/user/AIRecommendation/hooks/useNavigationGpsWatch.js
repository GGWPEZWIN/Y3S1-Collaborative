import { useCallback, useEffect, useRef, useState } from "react";
import { readGpsFix } from "../services/navigation/coordinates.js";
import { isUsableGpsAccuracy } from "../services/navigation/coordinates.js";

const WATCH_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
};

export const GPS_WATCH_STATUS = {
  IDLE: "idle",
  REQUESTING: "requesting",
  TRACKING: "tracking",
  PERMISSION_DENIED: "permission_denied",
  TEMPORARILY_UNAVAILABLE: "temporarily_unavailable",
  POOR_ACCURACY: "poor_accuracy",
};

function mapWatchError(error) {
  if (error?.code === 1) return GPS_WATCH_STATUS.PERMISSION_DENIED;
  return GPS_WATCH_STATUS.TEMPORARILY_UNAVAILABLE;
}

function gpsAvailabilityStatus() {
  if (typeof window !== "undefined" && window.isSecureContext === false) {
    return GPS_WATCH_STATUS.TEMPORARILY_UNAVAILABLE;
  }
  if (
    typeof navigator === "undefined" ||
    !navigator.geolocation ||
    typeof navigator.geolocation.watchPosition !== "function"
  ) {
    return GPS_WATCH_STATUS.TEMPORARILY_UNAVAILABLE;
  }
  return null;
}

/**
 * Starts watchPosition only while enabled. Keeps the latest valid fix in memory.
 * Does not log coordinates, persist GPS history, or call Google Routes.
 */
export default function useNavigationGpsWatch(enabled, resetKey = "") {
  const [status, setStatus] = useState(GPS_WATCH_STATUS.IDLE);
  const [lastFix, setLastFix] = useState(null);
  const [activeKey, setActiveKey] = useState(resetKey);
  const watchIdRef = useRef(null);
  const availabilityBlock = gpsAvailabilityStatus();

  if (activeKey !== resetKey) {
    setActiveKey(resetKey);
    setLastFix(null);
    setStatus(GPS_WATCH_STATUS.IDLE);
  }

  useEffect(() => {
    if (!enabled || availabilityBlock) {
      if (watchIdRef.current != null && typeof navigator !== "undefined") {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return undefined;
    }

    let cancelled = false;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (cancelled) return;
        const fix = readGpsFix(position);
        if (!fix) return;
        setLastFix(fix);
        setStatus(
          isUsableGpsAccuracy(fix.accuracyMeters)
            ? GPS_WATCH_STATUS.TRACKING
            : GPS_WATCH_STATUS.POOR_ACCURACY
        );
      },
      (error) => {
        if (cancelled) return;
        setStatus(mapWatchError(error));
      },
      WATCH_OPTIONS
    );

    watchIdRef.current = watchId;

    return () => {
      cancelled = true;
      if (watchId != null) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (watchIdRef.current === watchId) {
        watchIdRef.current = null;
      }
    };
  }, [enabled, availabilityBlock]);

  const reset = useCallback(() => {
    setLastFix(null);
    setStatus(GPS_WATCH_STATUS.IDLE);
  }, []);

  const visibleStatus = !enabled
    ? GPS_WATCH_STATUS.IDLE
    : availabilityBlock ||
      (status === GPS_WATCH_STATUS.IDLE
        ? GPS_WATCH_STATUS.REQUESTING
        : status);

  return {
    status: visibleStatus,
    lastFix,
    reset,
  };
}
