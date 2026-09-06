import { useCallback, useState } from "react";
import { mockItinerary } from "../data/mockModule2Data";
import {
  DEVICE_LOCATION_ERROR,
  getCurrentDeviceLocation,
} from "../services/deviceLocationService";
import { isRouteableCoordinate } from "../services/itinerary/normalizeItinerary.js";

function createDemoLocation() {
  return {
    latitude: mockItinerary.startLocation.latitude,
    longitude: mockItinerary.startLocation.longitude,
    accuracyMeters: null,
    capturedAt: null,
    source: "demo",
    label: mockItinerary.startLocation.name,
  };
}

function createFallbackLocation(itineraryKey, savedStart) {
  if (itineraryKey === "demo") {
    return createDemoLocation();
  }
  const routeable = isRouteableCoordinate(
    savedStart?.latitude,
    savedStart?.longitude
  );
  return {
    latitude: routeable ? savedStart.latitude : null,
    longitude: routeable ? savedStart.longitude : null,
    accuracyMeters: null,
    capturedAt: null,
    source: "itinerary",
    label:
      savedStart?.name ||
      (routeable ? "Saved starting location" : "Starting location not provided"),
  };
}

function statusFromErrorCode(code) {
  switch (code) {
    case DEVICE_LOCATION_ERROR.PERMISSION_DENIED:
      return "denied";
    case DEVICE_LOCATION_ERROR.POSITION_UNAVAILABLE:
      return "unavailable";
    case DEVICE_LOCATION_ERROR.TIMEOUT:
      return "timeout";
    case DEVICE_LOCATION_ERROR.UNSUPPORTED:
      return "unsupported";
    case DEVICE_LOCATION_ERROR.INSECURE_CONTEXT:
      return "insecure";
    default:
      return "error";
  }
}

export default function useCurrentLocation({
  savedStart = null,
  itineraryKey = "demo",
} = {}) {
  const [activeKey, setActiveKey] = useState(itineraryKey);
  const [location, setLocation] = useState(() =>
    createFallbackLocation(itineraryKey, savedStart)
  );
  const [status, setStatus] = useState("idle");
  const [errorCode, setErrorCode] = useState(null);

  if (activeKey !== itineraryKey) {
    setActiveKey(itineraryKey);
    setLocation(createFallbackLocation(itineraryKey, savedStart));
    setStatus("idle");
    setErrorCode(null);
  }

  const savedLat = savedStart?.latitude;
  const savedLng = savedStart?.longitude;
  const savedName = savedStart?.name;

  const requestCurrentLocation = useCallback(async () => {
    if (status === "loading") return;

    setStatus("loading");
    setErrorCode(null);

    try {
      const result = await getCurrentDeviceLocation();
      setLocation({
        latitude: result.latitude,
        longitude: result.longitude,
        accuracyMeters: result.accuracyMeters,
        capturedAt: result.capturedAt,
        source: "device",
        label: "Current device location",
      });
      setStatus("success");
    } catch (error) {
      const code = error?.code || DEVICE_LOCATION_ERROR.UNKNOWN;
      setLocation(
        createFallbackLocation(itineraryKey, {
          latitude: savedLat,
          longitude: savedLng,
          name: savedName,
        })
      );
      setErrorCode(code);
      setStatus(statusFromErrorCode(code));
    }
  }, [status, itineraryKey, savedLat, savedLng, savedName]);

  const useSavedStart = useCallback(() => {
    setLocation(
      createFallbackLocation(itineraryKey, {
        latitude: savedLat,
        longitude: savedLng,
        name: savedName,
      })
    );
    setStatus("idle");
    setErrorCode(null);
  }, [itineraryKey, savedLat, savedLng, savedName]);

  return {
    location,
    status,
    errorCode,
    requestCurrentLocation,
    useDemoLocation: useSavedStart,
  };
}
