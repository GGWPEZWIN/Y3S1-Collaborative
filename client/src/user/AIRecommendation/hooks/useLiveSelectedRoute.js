import { useCallback, useEffect, useRef, useState } from "react";
import {
  ROUTES_CLIENT_ERROR,
  RoutesClientError,
  computeRoute,
} from "../services/googleRoutes/routesApiService";

export const SELECTABLE_TRAVEL_MODES = ["WALK", "TRANSIT", "DRIVE"];

const SUPPORTED_MODES = new Set(SELECTABLE_TRAVEL_MODES);

function isSupportedTravelMode(travelMode) {
  return typeof travelMode === "string" && SUPPORTED_MODES.has(travelMode);
}

/**
 * Loads one first-segment route for the currently selected travel mode.
 * Does not request on mount or when the mode/origin changes.
 */
export default function useLiveSelectedRoute({
  origin,
  destination,
  travelMode,
}) {
  const originLat = origin?.latitude;
  const originLng = origin?.longitude;
  const destLat = destination?.latitude;
  const destLng = destination?.longitude;
  const selectedMode = isSupportedTravelMode(travelMode) ? travelMode : null;
  const routeKey = `${originLat},${originLng},${destLat},${destLng},${selectedMode}`;

  const [activeKey, setActiveKey] = useState(routeKey);
  const [status, setStatus] = useState("idle");
  const [route, setRoute] = useState(null);
  const [errorCode, setErrorCode] = useState(null);
  const abortRef = useRef(null);
  const inFlightRef = useRef(false);
  const requestIdRef = useRef(0);

  if (activeKey !== routeKey) {
    setActiveKey(routeKey);
    setStatus("idle");
    setRoute(null);
    setErrorCode(null);
  }

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      inFlightRef.current = false;
    };
  }, [routeKey]);

  const loadRoute = useCallback(async () => {
    if (inFlightRef.current) return;
    if (!isSupportedTravelMode(selectedMode)) return;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    inFlightRef.current = true;
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setErrorCode(null);

    try {
      const result = await computeRoute({
        origin: { latitude: originLat, longitude: originLng },
        destination: { latitude: destLat, longitude: destLng },
        travelMode: selectedMode,
        signal: controller.signal,
      });
      if (
        controller.signal.aborted ||
        requestIdRef.current !== requestId ||
        result.travelMode !== selectedMode
      ) {
        return;
      }
      setRoute(result);
      setStatus("success");
    } catch (error) {
      if (
        controller.signal.aborted ||
        error?.code === ROUTES_CLIENT_ERROR.ABORTED ||
        requestIdRef.current !== requestId
      ) {
        return;
      }
      const code =
        error instanceof RoutesClientError
          ? error.code
          : ROUTES_CLIENT_ERROR.UNAVAILABLE;
      setRoute(null);
      setErrorCode(code);
      setStatus("error");
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        inFlightRef.current = false;
      }
    }
  }, [originLat, originLng, destLat, destLng, selectedMode]);

  return {
    status,
    route,
    errorCode,
    loadRoute,
  };
}
