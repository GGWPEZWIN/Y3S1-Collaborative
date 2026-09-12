/* ==================================================================
   PLATFORM ADAPTERS FOR THE GEOFENCE  (F4)
   ------------------------------------------------------------------
   Every browser API touched by the geofence is wrapped here, so the
   hook stays pure React and unit tests can stub a single module.
   ================================================================== */

export function haversineM(a, b) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Capability probe. Safe to call during render — reads only, never writes. */
export function isGeolocationSupported() {
  return typeof navigator !== "undefined" && Boolean(navigator.geolocation);
}

/**
 * The PWA build registers a service worker so the position watch survives
 * backgrounding. Guarded so it is a no-op in a plain browser tab.
 */
export function ensureServiceWorker() {
  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.serviceWorker &&
      !navigator.serviceWorker.controller
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  } catch {
    /* service workers unavailable in this context */
  }
}

export function ensureNotificationPermission() {
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}

export function notify(title, options) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      // Windows/Chrome auto-dismiss a plain toast after a few seconds, easy
      // to miss if you're not looking right at that moment. requireInteraction
      // keeps it on screen until the traveller actually dismisses it.
      new Notification(title, { requireInteraction: true, ...options });
    }
  } catch {
    /* notification blocked */
  }
}

// Keyed by the native watch id, so clearWatch() can cancel a still-pending
// watchdog alongside the underlying watch.
const geofenceWatchdogs = new Map();

export function watchPosition(onPosition, onError) {
  const id = navigator.geolocation.watchPosition(
    (pos) => {
      const w = geofenceWatchdogs.get(id);
      if (w) clearTimeout(w);
      geofenceWatchdogs.delete(id);
      onPosition(pos);
    },
    (err) => {
      const w = geofenceWatchdogs.get(id);
      if (w) clearTimeout(w);
      geofenceWatchdogs.delete(id);
      onError(err);
    },
    { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 }
  );

  // See watchPositionLoose for why this is needed: the native `timeout`
  // option is not honoured everywhere (observed hanging indefinitely when
  // the OS-level location service is off), so without an independent
  // watchdog the distance readout and geofence trigger can get stuck
  // forever waiting on a fix that never arrives.
  const watchdog = setTimeout(() => {
    geofenceWatchdogs.delete(id);
    onError();
  }, 12000);
  geofenceWatchdogs.set(id, watchdog);

  return id;
}

export function clearWatch(id) {
  if (id === null || id === undefined) return;
  const w = geofenceWatchdogs.get(id);
  if (w) clearTimeout(w);
  geofenceWatchdogs.delete(id);
  navigator.geolocation.clearWatch(id);
}

/**
 * One-shot position read, used to seed a new lodging in LodgingForm.
 * Resolves to { lat, lng } on success, or { error } on failure rather than
 * rejecting — error is "denied" | "timeout" | "unavailable" | "unsupported"
 * so the caller can show something more actionable than a generic failure.
 */
export function getCurrentPosition({ timeout = 8000 } = {}) {
  return new Promise((resolve) => {
    if (!isGeolocationSupported()) {
      resolve({ error: "unsupported" });
      return;
    }

    // As with watchPositionLoose, the `timeout` option is a request the
    // browser can silently ignore (observed when the OS-level location
    // service is off) — this watchdog is what actually bounds the wait,
    // so "Use my current location" can't get stuck on "Locating…" forever.
    let resolved = false;
    const watchdog = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      resolve({ error: "timeout" });
    }, timeout + 2000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(watchdog);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(watchdog);
        const error =
          err.code === err.PERMISSION_DENIED
            ? "denied"
            : err.code === err.TIMEOUT
            ? "timeout"
            : "unavailable";
        resolve({ error });
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout }
    );
  });
}

/**
 * Watches position for as long as the returned unsubscribe is unused.
 *
 * Unlike watchPosition(), a missing or denied geolocation is reported
 * through onUnavailable asynchronously rather than throwing, so callers
 * can fall back without a synchronous setState in an effect body.
 *
 * @returns {Function} unsubscribe
 */
export function watchPositionLoose(onPosition, onUnavailable) {
  if (!isGeolocationSupported()) {
    const t = setTimeout(onUnavailable, 0);
    return () => clearTimeout(t);
  }

  // The `timeout` option below is a request to the browser, not a
  // guarantee — when the OS-level location service is off (observed on
  // Windows even while the site's own permission shows "granted"), Chrome
  // can leave watchPosition hanging with neither callback ever firing,
  // no matter what timeout is passed. This watchdog is what actually
  // bounds the wait, so the caller always reaches a terminal state.
  let resolved = false;
  const watchdog = setTimeout(() => {
    if (resolved) return;
    resolved = true;
    onUnavailable();
  }, 12000);

  const id = navigator.geolocation.watchPosition(
    (pos) => {
      resolved = true;
      clearTimeout(watchdog);
      onPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    },
    () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(watchdog);
      onUnavailable();
    },
    { enableHighAccuracy: false, maximumAge: 30000, timeout: 10000 }
  );

  return () => {
    clearTimeout(watchdog);
    navigator.geolocation.clearWatch(id);
  };
}
