import { useCallback, useEffect, useState } from "react";
import { saveLodging, subscribeToLodging } from "../services/lodgingService";

/**
 * Owns the signed-in traveller's registered lodging (name + coordinates),
 * used as the geofence centre and the nearby-POI fallback.
 *
 * @param {string|null} uid
 */
export default function useLodging(uid) {
  const [lodging, setLodging] = useState(null); // null = unset or still loading
  const [loading, setLoading] = useState(true);

  // Reset during render when the account changes, rather than in an effect —
  // same pattern as useWasteLedger, so the previous user's lodging is never
  // shown to the next one and no setState happens synchronously in an effect.
  const [prevUid, setPrevUid] = useState(uid);
  if (prevUid !== uid) {
    setPrevUid(uid);
    setLodging(null);
    setLoading(Boolean(uid));
  }

  useEffect(() => {
    if (!uid) return undefined;
    return subscribeToLodging(
      uid,
      (data) => {
        setLodging(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, [uid]);

  const save = useCallback(
    (next) => {
      if (!uid) return Promise.resolve();
      return saveLodging(uid, next);
    },
    [uid]
  );

  return { lodging, loading, save };
}
