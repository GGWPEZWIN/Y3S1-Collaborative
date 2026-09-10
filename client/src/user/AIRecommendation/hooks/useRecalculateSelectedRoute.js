import { useCallback, useEffect, useRef, useState } from "react";
import {
  ROUTES_CLIENT_ERROR,
  RoutesClientError,
  computeRoute,
} from "../services/googleRoutes/routesApiService";

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

/**
 * Recalculates only the selected mode for the current destination.
 * Keeps the previous route visible until a successful replacement.
 * GPS updates must call this explicitly — never automatically.
 */
export default function useRecalculateSelectedRoute(contextKey = "") {
  const [status, setStatus] = useState("idle");
  const [errorCode, setErrorCode] = useState(null);
  const abortRef = useRef(null);
  const inFlightRef = useRef(false);
  const generationRef = useRef(0);

  useEffect(() => {
    generationRef.current += 1;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    inFlightRef.current = false;
    return () => {
      generationRef.current += 1;
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      inFlightRef.current = false;
    };
  }, [contextKey]);

  const reset = useCallback(() => {
    generationRef.current += 1;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    inFlightRef.current = false;
    setStatus("idle");
    setErrorCode(null);
  }, []);

  const recalculate = useCallback(async ({ origin, destination, travelMode }) => {
    if (inFlightRef.current) {
      return { ok: false, skipped: true };
    }

    const generation = generationRef.current + 1;
    generationRef.current = generation;
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
        origin: {
          latitude: origin.latitude,
          longitude: origin.longitude,
        },
        destination: {
          latitude: destination.latitude,
          longitude: destination.longitude,
        },
        travelMode,
        signal: controller.signal,
      });
      if (
        controller.signal.aborted ||
        generationRef.current !== generation
      ) {
        return { ok: false, skipped: true };
      }
      if (result.travelMode !== travelMode) {
        setStatus("error");
        setErrorCode(ROUTES_CLIENT_ERROR.UNAVAILABLE);
        return { ok: false, errorCode: ROUTES_CLIENT_ERROR.UNAVAILABLE };
      }
      setStatus("success");
      return { ok: true, route: keepReusableRoute(result) };
    } catch (error) {
      if (
        controller.signal.aborted ||
        error?.code === ROUTES_CLIENT_ERROR.ABORTED ||
        generationRef.current !== generation
      ) {
        return { ok: false, skipped: true };
      }
      const code =
        error instanceof RoutesClientError
          ? error.code
          : ROUTES_CLIENT_ERROR.UNAVAILABLE;
      setStatus("error");
      setErrorCode(code);
      return { ok: false, errorCode: code };
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        inFlightRef.current = false;
      }
    }
  }, []);

  return {
    status,
    errorCode,
    recalculate,
    reset,
  };
}
