import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../../../firebase/config";

/* ==================================================================
   PER-USER LODGING  (F4)
   ------------------------------------------------------------------
   The geofence and the nearby-POI fallback both need a "home base" to
   measure against. That base is wherever THIS traveller is staying,
   not a fixed address shared by every account — so it lives on the
   user's own profile document rather than a constant.
   ================================================================== */

export const DEFAULT_RADIUS_M = 120;

function userRef(uid) {
  return doc(db, "users", uid);
}

/** Live subscription to the signed-in user's lodging, or null when unset. */
export function subscribeToLodging(uid, onData, onError) {
  return onSnapshot(
    userRef(uid),
    (snap) => onData(snap.exists() ? snap.data().lodging || null : null),
    onError
  );
}

/**
 * @param {string} uid
 * @param {{name: string, lat: number, lng: number, radiusM?: number}} lodging
 */
export async function saveLodging(uid, lodging) {
  await setDoc(
    userRef(uid),
    {
      lodging: {
        name: lodging.name,
        lat: lodging.lat,
        lng: lodging.lng,
        radiusM: lodging.radiusM || DEFAULT_RADIUS_M,
      },
    },
    { merge: true }
  );
}

export async function clearLodging(uid) {
  await setDoc(userRef(uid), { lodging: null }, { merge: true });
}

/* ==================================================================
   REMINDER TOGGLE  (F4)
   ------------------------------------------------------------------
   Whether the geofence should be watching at all. Stored per-user so
   the toggle survives a reload or a return visit — without this it
   silently falls back to "off" every time WastePage remounts.
   ================================================================== */

/** Live subscription to the signed-in user's reminder toggle, defaulting to off. */
export function subscribeToReminderPref(uid, onData, onError) {
  return onSnapshot(
    userRef(uid),
    (snap) => onData(snap.exists() ? Boolean(snap.data().remindersEnabled) : false),
    onError
  );
}

export async function saveReminderPref(uid, enabled) {
  await setDoc(userRef(uid), { remindersEnabled: enabled }, { merge: true });
}
