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

function clearPolyline(polylineRef) {
  if (polylineRef.current) {
    polylineRef.current.setMap(null);
    polylineRef.current = null;
  }
}

export default function TripMap({
  startLocation,
  destinations = [],
  encodedPolyline = null,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const mapsApiRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
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
              background: "#16a34a",
              borderColor: "#15803d",
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
          strokeColor: "#16a34a",
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
  }, [encodedPolyline, status]);

  const statusMessage =
    status === "loading"
      ? "Loading Google Map…"
      : status === "missing-key"
        ? "Add VITE_GOOGLE_MAPS_API_KEY to client/.env and restart the Vite dev server to show the map."
        : status === "error"
          ? "The map could not be loaded. You can keep using the rest of this demonstration."
          : "";

  return (
    <section className="m2-map" aria-label="Demonstration itinerary map">
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
            Google Map loaded with demonstration itinerary markers.
          </span>
        )}
        <div
          ref={containerRef}
          className="m2-map-canvas"
          role="region"
          aria-label="Map showing the trip starting point and demonstration destinations"
        />
      </div>
      <p className="m2-map-note">
        {encodedPolyline
          ? "The green line is a live walking route for the first itinerary segment only. Other markers remain demonstration destinations."
          : "The Google basemap is shown when a Maps JavaScript API key is configured. Markers use the demonstration itinerary. A live walking line is drawn only after you load the first segment."}
      </p>
    </section>
  );
}
