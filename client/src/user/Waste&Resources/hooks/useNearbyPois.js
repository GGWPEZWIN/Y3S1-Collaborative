import { useEffect, useState } from "react";
import { LODGING } from "../constants/waste";
import { getCurrentPosition } from "../services/geoService";
import { fetchNearbyPois } from "../services/poiService";

/**
 * Resolves the user's position, then queries OpenStreetMap for nearby
 * points of interest of the given kind.
 *
 * Falls back to the registered lodging when location is unavailable or
 * declined, so the feature degrades rather than disappearing.
 *
 * @param {'refill'|'zeroWaste'|null} kind  null skips the fetch entirely
 * @param {boolean} enabled                 defer until the card is opened
 */
export default function useNearbyPois(kind, enabled) {
  const [state, setState] = useState({ status: "idle", pois: [], centre: null });

  useEffect(() => {
    if (!kind || !enabled) return undefined;

    const controller = new AbortController();
    let cancelled = false;

    // All setState calls happen in async continuations, never synchronously
    // in the effect body.
    (async () => {
      if (!cancelled) setState((s) => ({ ...s, status: "loading" }));

      const position = await getCurrentPosition();
      const centre = position || { lat: LODGING.lat, lng: LODGING.lng };
      if (cancelled) return;

      try {
        const pois = await fetchNearbyPois(kind, centre, { signal: controller.signal });
        if (!cancelled) {
          setState({
            status: pois.length ? "ready" : "empty",
            pois,
            centre,
            approximate: !position,
          });
        }
      } catch {
        if (!cancelled) setState({ status: "error", pois: [], centre });
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [kind, enabled]);

  return state;
}
