import { useCallback, useEffect, useRef, useState } from "react";
import {
  ROUTES_CLIENT_ERROR,
  RoutesClientError,
  computeRoute,
} from "../services/googleRoutes/routesApiService";

/**
 * Loads one walking route on demand. Does not request on mount.
 */
export default function useLiveWalkingRoute({ origin, destination }) {
  const originLat = origin?.latitude;
  const originLng = origin?.longitude;
  const destLat = destination?.latitude;
  const destLng = destination?.longitude;
  const routeKey = `${originLat},${originLng},${destLat},${destLng}`;

  const [activeKey, setActiveKey] = useState(routeKey);
  const [status, setStatus] = useState("idle");
  const [route, setRoute] = useState(null);
  const [errorCode, setErrorCode] = useState(null);
  const abortRef = useRef(null);
  const inFlightRef = useRef(false);

  if (activeKey !== routeKey) {
    setActiveKey(routeKey);
    setStatus("idle");
    setRoute(null);
    setErrorCode(null);
  }

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      inFlightRef.current = false;
    };
  }, [routeKey]);

  const loadRoute = useCallback(async () => {
    if (inFlightRef.current) return;

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
        travelMode: "WALK",
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setRoute(result);
      setStatus("success");
    } catch (error) {
      if (
        controller.signal.aborted ||
        error?.code === ROUTES_CLIENT_ERROR.ABORTED
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
      }
      inFlightRef.current = false;
    }
  }, [originLat, originLng, destLat, destLng]);

  return {
    status,
    route,
    errorCode,
    loadRoute,
  };
}
