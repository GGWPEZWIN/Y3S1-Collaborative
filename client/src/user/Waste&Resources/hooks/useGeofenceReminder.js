import { useEffect, useRef, useState } from "react";
import { LODGING } from "../constants/waste";
import {
  clearWatch,
  ensureNotificationPermission,
  ensureServiceWorker,
  haversineM,
  isGeolocationSupported,
  notify,
  watchPosition,
} from "../services/geoService";


const IDLE_WATCH = { denied: false, distance: null };

export default function useGeofenceReminder({ enabled, hasLoggedToday, onTrigger }) {
  // Capability probe runs once, lazily, during the first render.
  // A lazy initialiser is not a setState, so the linter is satisfied and
  // we avoid a render → effect → render round trip just to learn support.
  const [supported] = useState(isGeolocationSupported);

  // Written only from the watchPosition callbacks.
  const [watch, setWatch] = useState(IDLE_WATCH);

  // Reset during render when `enabled` flips, rather than in an effect.
  // React discards this render and re-runs the component immediately, so
  // the user never sees the stale distance and no extra paint happens.
  const [prevEnabled, setPrevEnabled] = useState(enabled);
  if (prevEnabled !== enabled) {
    setPrevEnabled(enabled);
    setWatch(IDLE_WATCH);
  }

  const wasOutside = useRef(true);

  // Held in a ref so a new log or a new callback identity does not tear
  // down and re-register the position watch on every render.
  const latest = useRef({ hasLoggedToday, onTrigger });
  useEffect(() => {
    latest.current = { hasLoggedToday, onTrigger };
  });

  useEffect(() => {
    if (!enabled || !supported) return undefined;

    // Side effects on external systems — the legitimate use of an effect.
    ensureServiceWorker();
    ensureNotificationPermission();
    wasOutside.current = true;

    const id = watchPosition(
      (pos) => {
        const metres = haversineM(
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          LODGING
        );
        setWatch({ denied: false, distance: Math.round(metres) });

        const inside = metres <= LODGING.radiusM;
        if (inside && wasOutside.current && !latest.current.hasLoggedToday) {
          latest.current.onTrigger();
          notify("GreenTrip Malaysia", {
            body: "Back at your lodging. Complete today's waste ledger.",
            tag: "greentrip-daily-ledger",
          });
        }
        wasOutside.current = !inside;
      },
      () => setWatch({ denied: true, distance: null })
    );

    return () => clearWatch(id);
  }, [enabled, supported]);

  // idle | watching | denied | unsupported
  let status = "watching";
  if (!supported) status = "unsupported";
  else if (!enabled) status = "idle";
  else if (watch.denied) status = "denied";

  return { status, distance: watch.distance };
}
