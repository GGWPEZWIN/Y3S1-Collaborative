import { useCallback, useEffect, useState } from "react";
import { saveReminderPref, subscribeToReminderPref } from "../services/lodgingService";

/**
 * Owns the signed-in traveller's "logging reminders" toggle. Persisted per
 * user (not local component state) so it survives a reload or a return
 * visit to the Waste page instead of silently resetting to off.
 *
 * @param {string|null} uid
 * @returns {[boolean, (next: boolean) => Promise<void>]}
 */
export default function useReminderPref(uid) {
  const [enabled, setEnabled] = useState(false);

  // Reset during render when the account changes, rather than in an effect —
  // same pattern as useLodging/useWasteLedger.
  const [prevUid, setPrevUid] = useState(uid);
  if (prevUid !== uid) {
    setPrevUid(uid);
    setEnabled(false);
  }

  useEffect(() => {
    if (!uid) return undefined;
    return subscribeToReminderPref(uid, setEnabled, () => {});
  }, [uid]);

  // No local state update is needed — the onSnapshot subscription echoes
  // the write back immediately via latency compensation.
  const setPref = useCallback(
    (next) => {
      if (!uid) return Promise.resolve();
      return saveReminderPref(uid, next);
    },
    [uid]
  );

  return [enabled, setPref];
}
