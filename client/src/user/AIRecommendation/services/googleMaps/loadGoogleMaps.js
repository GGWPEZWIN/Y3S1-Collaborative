import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

export const GOOGLE_MAPS_LOAD_ERROR = {
  MISSING_API_KEY: "MISSING_API_KEY",
  LOAD_FAILED: "LOAD_FAILED",
};

export const DEMO_MAP_ID = "DEMO_MAP_ID";

let loadPromise = null;
let optionsConfigured = false;

function createLoadError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function readConfiguredApiKey() {
  const value = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * Loads Maps JavaScript API libraries needed for map display and advanced
 * markers. Uses maps, marker, and core at startup. Geometry is loaded
 * on demand when a live polyline is drawn. Does not load Routes,
 * Directions, Distance Matrix, Places, Geocoding, or transit libraries.
 */
export function loadGoogleMapsLibraries() {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const key = readConfiguredApiKey();
    if (!key) {
      throw createLoadError(GOOGLE_MAPS_LOAD_ERROR.MISSING_API_KEY);
    }

    if (typeof window === "undefined") {
      throw createLoadError(GOOGLE_MAPS_LOAD_ERROR.LOAD_FAILED);
    }

    try {
      if (!optionsConfigured) {
        setOptions({
          key,
          v: "weekly",
        });
        optionsConfigured = true;
      }

      const [mapsLibrary, markerLibrary, coreLibrary] = await Promise.all([
        importLibrary("maps"),
        importLibrary("marker"),
        importLibrary("core"),
      ]);

      const Map = mapsLibrary.Map;
      const Polyline = mapsLibrary.Polyline;
      const AdvancedMarkerElement = markerLibrary.AdvancedMarkerElement;
      const PinElement = markerLibrary.PinElement;
      const LatLngBounds = coreLibrary.LatLngBounds;

      if (
        typeof Map !== "function" ||
        typeof Polyline !== "function" ||
        typeof AdvancedMarkerElement !== "function" ||
        typeof PinElement !== "function" ||
        typeof LatLngBounds !== "function"
      ) {
        throw createLoadError(GOOGLE_MAPS_LOAD_ERROR.LOAD_FAILED);
      }

      return {
        Map,
        Polyline,
        LatLngBounds,
        AdvancedMarkerElement,
        PinElement,
      };
    } catch (error) {
      if (error?.code === GOOGLE_MAPS_LOAD_ERROR.MISSING_API_KEY) {
        throw error;
      }
      throw createLoadError(GOOGLE_MAPS_LOAD_ERROR.LOAD_FAILED);
    }
  })();

  return loadPromise;
}

let geometryPromise = null;

/**
 * Loads the geometry library after the Maps script is configured.
 * Used only to decode an encoded polyline for display.
 */
export function loadGoogleMapsGeometry() {
  if (geometryPromise) return geometryPromise;

  geometryPromise = (async () => {
    await loadGoogleMapsLibraries();
    const geometryLibrary = await importLibrary("geometry");
    const decodePath = geometryLibrary?.encoding?.decodePath;
    if (typeof decodePath !== "function") {
      throw createLoadError(GOOGLE_MAPS_LOAD_ERROR.LOAD_FAILED);
    }
    return {
      decodePath: (encoded) => decodePath.call(geometryLibrary.encoding, encoded),
    };
  })().catch((error) => {
    geometryPromise = null;
    throw error;
  });

  return geometryPromise;
}
