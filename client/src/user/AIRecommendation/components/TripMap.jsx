import { useEffect, useRef, useState } from "react";
import {
  DEMO_MAP_ID,
  GOOGLE_MAPS_LOAD_ERROR,
  loadGoogleMapsGeometry,
  loadGoogleMapsLibraries,
} from "../services/googleMaps/loadGoogleMaps";

function isValidCoordinate(latitude, longitude) {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function toLatLng(latitude, longitude) {
  return { lat: latitude, lng: longitude };
}

function createPin(PinElement, { background, borderColor, glyphText }) {
  if (typeof PinElement !== "function") return null;
  return new PinElement({
    background,
    borderColor,
    glyphColor: "#ffffff",
    glyphText,
  });
}

function createMarker(AdvancedMarkerElement, PinElement, options) {
  const pin = createPin(PinElement, options.pin);
  return new AdvancedMarkerElement({
    map: options.map,
    position: options.position,
    title: options.title,
    content: pin || undefined,
  });
}

function clearMarkers(markers) {
  markers.forEach((marker) => {
    marker.map = null;
  });
}

function clearGpsOverlay(markerRef, circleRef) {
  if (markerRef.current) {
    markerRef.current.map = null;
    markerRef.current = null;
  }
  if (circleRef.current) {
    circleRef.current.setMap(null);
    circleRef.current = null;
  }
}

function clearPolyline(polylineRef) {
  if (polylineRef.current) {
    polylineRef.current.setMap(null);
    polylineRef.current = null;
  }
}

function polylineColor(travelMode) {
  if (travelMode === "TRANSIT") return "#2563eb";
  if (travelMode === "DRIVE") return "#ea580c";
  return "#16a34a";
}

function destinationPin(outcome) {
  if (outcome === "skipped") {
    return { background: "#6b7280", borderColor: "#4b5563" };
  }
  if (outcome === "reached") {
    return { background: "#16a34a", borderColor: "#15803d" };
  }
  if (outcome === "next") {
    return { background: "#2563eb", borderColor: "#1d4ed8" };
  }
  return { background: "#86efac", borderColor: "#166534" };
}

function polylineLabel(travelMode) {
  if (travelMode === "TRANSIT") return "Public transit (blue)";
  if (travelMode === "DRIVE") return "Driving (orange)";
  return "Walking (green)";
}

export default function TripMap({
  startLocation,
  destinations = [],
  encodedPolyline = null,
  routeTravelMode = null,
  markerSource = "demo",
  currentLocation = null,
  currentLocationAccuracyMeters = null,
  legendLabel = "Displayed selected route",
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const mapsApiRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  const gpsMarkerRef = useRef(null);
  const accuracyCircleRef = useRef(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;

    async function initialiseMap() {
      try {
        const api = await loadGoogleMapsLibraries();
        if (cancelled || !containerRef.current) return;

        mapsApiRef.current = api;

        mapRef.current = new api.Map(containerRef.current, {
          center: { lat: 3.1348, lng: 101.6865 },
          zoom: 13,
          mapId: DEMO_MAP_ID,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: "greedy",
        });

        setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        mapRef.current = null;
        mapsApiRef.current = null;
        setStatus(
          error?.code === GOOGLE_MAPS_LOAD_ERROR.MISSING_API_KEY
            ? "missing-key"
            : "error"
        );
      }
    }

    initialiseMap();

    return () => {
      cancelled = true;
      clearPolyline(polylineRef);
      clearGpsOverlay(gpsMarkerRef, accuracyCircleRef);
      clearMarkers(markersRef.current);
      markersRef.current = [];
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const api = mapsApiRef.current;
    if (status !== "ready" || !map || !api) return;

    try {
      clearMarkers(markersRef.current);
      markersRef.current = [];

      const positions = [];
      const { AdvancedMarkerElement, PinElement, LatLngBounds } = api;

      if (isValidCoordinate(startLocation?.latitude, startLocation?.longitude)) {
        const position = toLatLng(
          startLocation.latitude,
          startLocation.longitude
        );
        markersRef.current.push(
          createMarker(AdvancedMarkerElement, PinElement, {
            map,
            position,
            title: startLocation.label || "Trip starting point",
            pin: {
              background: "#166534",
              borderColor: "#14532d",
              glyphText: "S",
            },
          })
        );
        positions.push(position);
      }

      destinations.forEach((destination, index) => {
        if (!isValidCoordinate(destination?.latitude, destination?.longitude)) {
          return;
        }

        const position = toLatLng(destination.latitude, destination.longitude);
        const number =
          Number.isFinite(destination.plannedOrder) &&
          destination.plannedOrder > 0
            ? destination.plannedOrder
            : index + 1;

        markersRef.current.push(
          createMarker(AdvancedMarkerElement, PinElement, {
            map,
            position,
            title: destination.name || `Destination ${number}`,
            pin: {
              ...destinationPin(destination.outcome),
              glyphText: String(number),
            },
          })
        );
        positions.push(position);
      });

      if (positions.length === 1 && !encodedPolyline) {
        map.setCenter(positions[0]);
        map.setZoom(14);
      } else if (positions.length > 1 && !encodedPolyline) {
        if (typeof LatLngBounds !== "function") {
          throw new Error(GOOGLE_MAPS_LOAD_ERROR.LOAD_FAILED);
        }
        const bounds = new LatLngBounds();
        positions.forEach((position) => bounds.extend(position));
        map.fitBounds(bounds, 64);
      }
    } catch {
      clearMarkers(markersRef.current);
      markersRef.current = [];
      setStatus("error");
    }

    return () => {
      clearMarkers(markersRef.current);
      markersRef.current = [];
    };
  }, [destinations, encodedPolyline, startLocation, status]);

  useEffect(() => {
    const map = mapRef.current;
    const api = mapsApiRef.current;
    if (status !== "ready" || !map || !api) return undefined;

    let cancelled = false;

    async function drawLiveRoute() {
      clearPolyline(polylineRef);

      if (typeof encodedPolyline !== "string" || encodedPolyline.length === 0) {
        return;
      }

      try {
        const geometry = await loadGoogleMapsGeometry();
        if (cancelled || !mapRef.current) return;

        const path = geometry.decodePath(encodedPolyline);
        if (!Array.isArray(path) || path.length < 2) {
          return;
        }

        if (typeof api.Polyline !== "function") return;

        polylineRef.current = new api.Polyline({
          map: mapRef.current,
          path,
          strokeColor: polylineColor(routeTravelMode),
          strokeOpacity: 0.92,
          strokeWeight: 5,
          geodesic: true,
          clickable: false,
          zIndex: 1,
        });

        if (typeof api.LatLngBounds === "function") {
          const bounds = new api.LatLngBounds();
          path.forEach((point) => bounds.extend(point));
          mapRef.current.fitBounds(bounds, 64);
        }
      } catch {
        clearPolyline(polylineRef);
      }
    }

    drawLiveRoute();

    return () => {
      cancelled = true;
      clearPolyline(polylineRef);
    };
  }, [encodedPolyline, routeTravelMode, status]);

  useEffect(() => {
    const map = mapRef.current;
    const api = mapsApiRef.current;
    if (status !== "ready" || !map || !api) return undefined;

    if (
      !isValidCoordinate(currentLocation?.latitude, currentLocation?.longitude)
    ) {
      clearGpsOverlay(gpsMarkerRef, accuracyCircleRef);
      return undefined;
    }

    const position = toLatLng(
      currentLocation.latitude,
      currentLocation.longitude
    );
    const { AdvancedMarkerElement, PinElement, Circle } = api;

    if (gpsMarkerRef.current) {
      gpsMarkerRef.current.position = position;
    } else {
      gpsMarkerRef.current = createMarker(AdvancedMarkerElement, PinElement, {
        map,
        position,
        title: "Current location",
        pin: {
          background: "#2563eb",
          borderColor: "#1d4ed8",
          glyphText: "•",
        },
      });
    }

    if (
      typeof Circle === "function" &&
      typeof currentLocationAccuracyMeters === "number" &&
      Number.isFinite(currentLocationAccuracyMeters) &&
      currentLocationAccuracyMeters > 0
    ) {
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setCenter(position);
        accuracyCircleRef.current.setRadius(currentLocationAccuracyMeters);
      } else {
        accuracyCircleRef.current = new Circle({
          map,
          center: position,
          radius: currentLocationAccuracyMeters,
          fillColor: "#2563eb",
          fillOpacity: 0.12,
          strokeColor: "#1d4ed8",
          strokeOpacity: 0.6,
          strokeWeight: 1,
          clickable: false,
          zIndex: 2,
        });
      }
    } else if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setMap(null);
      accuracyCircleRef.current = null;
    }

    return undefined;
  }, [currentLocation, currentLocationAccuracyMeters, status]);

  const savedMarkers = markerSource === "saved";
  const statusMessage =
    status === "loading"
      ? "Loading Google Map…"
      : status === "missing-key"
        ? "Add VITE_GOOGLE_MAPS_API_KEY to client/.env and restart the Vite dev server to show the map."
        : status === "error"
          ? savedMarkers
            ? "The map could not be loaded. You can keep using the rest of this itinerary."
            : "The map could not be loaded. You can keep using the rest of this demonstration."
          : "";

  return (
    <section className="m2-map" aria-label={savedMarkers ? "Saved itinerary map" : "Demonstration itinerary map"}>
      <div className="m2-map-frame">
        {status !== "ready" ? (
          <div className="m2-map-status" aria-live="polite" role="status">
            <p
              className={
                status === "loading"
                  ? "m2-status m2-status--loading"
                  : "m2-status m2-status--error"
              }
            >
              {statusMessage}
            </p>
          </div>
        ) : (
          <span className="m2-sr-only" aria-live="polite">
            {savedMarkers
              ? "Google Map loaded with saved itinerary markers."
              : "Google Map loaded with demonstration itinerary markers."}
          </span>
        )}
        <div
          ref={containerRef}
          className="m2-map-canvas"
          role="region"
          aria-label={
            savedMarkers
              ? "Map showing the saved starting location and destinations"
              : "Map showing the trip starting point and demonstration destinations"
          }
        />
      </div>
      {encodedPolyline && routeTravelMode ? (
        <p className="m2-route-legend" role="note">
          <span
            className={`m2-route-swatch m2-route-swatch--${routeTravelMode.toLowerCase()}`}
            aria-hidden="true"
          />
          {legendLabel}: {polylineLabel(routeTravelMode)}
        </p>
      ) : null}
      <p className="m2-map-note">
        {encodedPolyline
          ? savedMarkers
            ? "The coloured line is the selected live route for the current unfinished segment. The blue marker is your current GPS location."
            : "The coloured line is the selected live route for the current unfinished segment. The blue marker is your current GPS location."
          : savedMarkers
            ? "Markers use the saved Module 1 starting location and destinations. A live route line is drawn only after a selected route is requested."
            : "The Google basemap is shown when a Maps JavaScript API key is configured. Markers use the demonstration itinerary. A live route line is drawn only after a selected route is available."}
      </p>
    </section>
  );
}
