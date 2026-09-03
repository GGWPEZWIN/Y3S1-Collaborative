import { useCallback, useState } from "react";
import { mockItinerary } from "../data/mockModule2Data";
import {
  DEVICE_LOCATION_ERROR,
  getCurrentDeviceLocation,
} from "../services/deviceLocationService";

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

export default function useCurrentLocation() {
  const [location, setLocation] = useState(createDemoLocation);
  const [status, setStatus] = useState("idle");
  const [errorCode, setErrorCode] = useState(null);

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
      setLocation(createDemoLocation());
      setErrorCode(code);
      setStatus(statusFromErrorCode(code));
    }
  }, [status]);

  const useDemoLocation = useCallback(() => {
    setLocation(createDemoLocation());
    setStatus("idle");
    setErrorCode(null);
  }, []);

  return {
    location,
    status,
    errorCode,
    requestCurrentLocation,
    useDemoLocation,
  };
}
