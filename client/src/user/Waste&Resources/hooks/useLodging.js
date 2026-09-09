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

  useEffect(() => {
    if (!uid) {
      setLodging(null);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
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
