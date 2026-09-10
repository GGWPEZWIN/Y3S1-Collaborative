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
      new Notification(title, options);
    }
  } catch {
    /* notification blocked */
  }
}

export function watchPosition(onPosition, onError) {
  return navigator.geolocation.watchPosition(onPosition, onError, {
    enableHighAccuracy: true,
    maximumAge: 30000,
    timeout: 20000,
  });
}

export function clearWatch(id) {
  if (id !== null && id !== undefined) navigator.geolocation.clearWatch(id);
}

/**
 * One-shot position read, used to centre the nudge map. Resolves to null
 * rather than rejecting, so callers can fall back to the lodging without
 * treating a declined permission as an error.
 */
export function getCurrentPosition({ timeout = 8000 } = {}) {
  return new Promise((resolve) => {
    if (!isGeolocationSupported()) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
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
  const id = navigator.geolocation.watchPosition(
    (pos) => onPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    onUnavailable,
    { enableHighAccuracy: false, maximumAge: 30000, timeout: 10000 }
  );
  return () => navigator.geolocation.clearWatch(id);
}
