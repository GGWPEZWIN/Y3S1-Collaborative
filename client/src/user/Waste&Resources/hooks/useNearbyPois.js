import { useEffect, useRef, useState } from "react";
import { haversineM, watchPositionLoose } from "../services/geoService";
import { fetchNearbyPois } from "../services/poiService";

/* ==================================================================
   NEARBY POINTS OF INTEREST  (F6)
   ------------------------------------------------------------------
   Tracks position while the card is open and re-queries only after the
   user has actually moved a meaningful distance.

   Throttling by DISTANCE rather than by time is the important choice.
   watchPosition fires every few seconds while walking; querying on each
   fire would exhaust Overpass's shared rate limit within a minute and
   drain the battery for results that had not changed. 500m is roughly
   the point at which a different set of refill points becomes relevant.
   ================================================================== */

const REFRESH_DISTANCE_M = 500;

/**
 * @param {string} kind
 * @param {boolean} enabled
 * @param {{lat: number, lng: number}|null} [fallbackCentre]
 *   Used only when live GPS is unavailable — the traveller's registered
 *   lodging, so the fallback still centres on somewhere relevant to them.
 */
export default function useNearbyPois(kind, enabled, fallbackCentre = null) {
  const [state, setState] = useState({
    status: "idle",
    pois: [],
    centre: null,
    approximate: false,
    live: false,
  });

  // Centre of the last query, so movement can be measured against it.
  const lastQueried = useRef(null);
  const hasFix = useRef(false);

  useEffect(() => {
    if (!kind || !enabled) return undefined;

    let cancelled = false;
    lastQueried.current = null;
    hasFix.current = false;

    // Indoor/desktop fixes from the low-accuracy provider are noisy enough
    // to "move" 500m between two readings of the same spot, so watchPosition
    // can call load() again before the previous Overpass round-trip has
    // finished. Every earlier load() shared one AbortController and raced
    // to setState independently — a late-arriving request would reset the
    // UI to "loading" right after an earlier one had already resolved,
    // which is exactly what made the card look permanently stuck. Track
    // the latest request and abort/ignore anything older than it.
    let requestId = 0;
    let activeController = null;

    const load = async (centre, { approximate, live }) => {
      if (cancelled) return;
      lastQueried.current = centre;
      const id = ++requestId;
      if (activeController) activeController.abort();
      activeController = new AbortController();

      // The map only needs a centre, not the POI list — set it immediately
      // so the map itself renders as soon as we know where the user is,
      // instead of sitting behind Overpass's slow shared public endpoint.
      // Keep the existing pins visible while refreshing after a move —
      // blanking the map mid-walk would be worse than slightly stale pins.
      setState((prev) => ({
        ...prev,
        status: prev.pois.length ? prev.status : "loading",
        centre,
        approximate,
        live,
      }));

      try {
        const pois = await fetchNearbyPois(kind, centre, { signal: activeController.signal });
        if (cancelled || id !== requestId) return;
        setState({
          status: pois.length ? "ready" : "empty",
          pois,
          centre,
          approximate,
          live,
        });
      } catch {
        if (cancelled || id !== requestId) return;
        setState((prev) => ({
          ...prev,
          status: prev.pois.length ? "ready" : "error",
        }));
      }
    };

    const unsubscribe = watchPositionLoose(
      (centre) => {
        hasFix.current = true;
        const previous = lastQueried.current;
        const moved = previous ? haversineM(previous, centre) : Infinity;
        if (moved > REFRESH_DISTANCE_M) {
          load(centre, { approximate: false, live: true });
        }
      },
      () => {
        // A later timeout after a good fix is not a failure — ignore it and
        // keep the results already on screen.
        if (hasFix.current || cancelled) return;
        if (fallbackCentre) {
          load(fallbackCentre, { approximate: true, live: false });
          return;
        }
        // No live fix and no lodging to fall back to — surface an error
        // instead of leaving the caller stuck on "loading" forever.
        setState((prev) => ({
          ...prev,
          status: prev.pois.length ? prev.status : "error",
        }));
      }
    );

    return () => {
      cancelled = true;
      if (activeController) activeController.abort();
      unsubscribe();
    };
  }, [kind, enabled, fallbackCentre]);

  return state;
}
