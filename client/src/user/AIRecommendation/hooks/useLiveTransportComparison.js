import { useCallback, useEffect, useRef, useState } from "react";
import {
  ROUTES_CLIENT_ERROR,
  RoutesClientError,
  computeRoute,
} from "../services/googleRoutes/routesApiService";

export const COMPARISON_TRAVEL_MODES = ["WALK", "TRANSIT", "DRIVE"];

function keepReusableRoute(route) {
  return {
    distanceMeters: route.distanceMeters,
    durationSeconds: route.durationSeconds,
    staticDurationSeconds: route.staticDurationSeconds ?? null,
    encodedPolyline: route.encodedPolyline,
    travelMode: route.travelMode,
    trafficAware: Boolean(route.trafficAware),
    source: route.source,
  };
}

function emptyResults() {
  return {
    WALK: null,
    TRANSIT: null,
    DRIVE: null,
  };
}

function isAuthError(code) {
  return (
    code === ROUTES_CLIENT_ERROR.AUTH_REQUIRED ||
    code === ROUTES_CLIENT_ERROR.INVALID_AUTH_TOKEN
  );
}

/**
 * Loads first-segment WALK, TRANSIT, and DRIVE routes on demand.
 * Does not request on mount.
 */
export default function useLiveTransportComparison({
  origin,
  destination,
  contextKey = "",
}) {
  const originLat = origin?.latitude;
  const originLng = origin?.longitude;
  const destLat = destination?.latitude;
  const destLng = destination?.longitude;
  const routeKey = `${contextKey},${originLat},${originLng},${destLat},${destLng}`;

  const [activeKey, setActiveKey] = useState(routeKey);
  const [status, setStatus] = useState("idle");
  const [results, setResults] = useState(emptyResults);
  const [errorCode, setErrorCode] = useState(null);
  const abortRef = useRef(null);
  const inFlightRef = useRef(false);

  if (activeKey !== routeKey) {
    setActiveKey(routeKey);
    setStatus("idle");
    setResults(emptyResults());
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

  const loadComparison = useCallback(async () => {
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setErrorCode(null);

    const originPoint = { latitude: originLat, longitude: originLng };
    const destinationPoint = { latitude: destLat, longitude: destLng };

    try {
      const settled = await Promise.allSettled(
        COMPARISON_TRAVEL_MODES.map((travelMode) =>
          computeRoute({
            origin: originPoint,
            destination: destinationPoint,
            travelMode,
            signal: controller.signal,
          })
        )
      );

      if (controller.signal.aborted) return;

      const nextResults = emptyResults();
      let successCount = 0;
      let authFailureCount = 0;

      settled.forEach((entry, index) => {
        const travelMode = COMPARISON_TRAVEL_MODES[index];
        if (entry.status === "fulfilled") {
          nextResults[travelMode] = {
            status: "success",
            route: keepReusableRoute(entry.value),
          };
          successCount += 1;
          return;
        }

        const code =
          entry.reason instanceof RoutesClientError
            ? entry.reason.code
            : ROUTES_CLIENT_ERROR.UNAVAILABLE;
        if (code === ROUTES_CLIENT_ERROR.ABORTED) {
          nextResults[travelMode] = null;
          return;
        }
        nextResults[travelMode] = { status: "error", code };
        if (isAuthError(code)) authFailureCount += 1;
      });

      setResults(nextResults);

      if (successCount === 0) {
        setErrorCode(
          authFailureCount === COMPARISON_TRAVEL_MODES.length
            ? ROUTES_CLIENT_ERROR.AUTH_REQUIRED
            : ROUTES_CLIENT_ERROR.UNAVAILABLE
        );
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch (error) {
      if (
        controller.signal.aborted ||
        error?.code === ROUTES_CLIENT_ERROR.ABORTED
      ) {
        return;
      }
      setResults(emptyResults());
      setErrorCode(
        isAuthError(error?.code)
          ? ROUTES_CLIENT_ERROR.AUTH_REQUIRED
          : ROUTES_CLIENT_ERROR.UNAVAILABLE
      );
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
    results,
    errorCode,
    loadComparison,
  };
}
