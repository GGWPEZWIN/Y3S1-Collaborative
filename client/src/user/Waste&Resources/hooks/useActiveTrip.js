import { useEffect, useState } from "react";
import { subscribeActiveTripLock } from "../../../firebase/tripSessionService";

/**
 * Whichever itinerary the traveller currently has active (Module 2's
 * one-trip-at-a-time lock), so a waste/resource log can be auto-tagged
 * with the trip it was logged during. Reads only the lock — the full
 * session/segment machinery in useActiveTripSession is not needed here.
 *
 * @returns {{ loading: boolean, tripId: string|null, tripTitle: string|null }}
 */
export default function useActiveTrip() {
  const [lock, setLock] = useState(undefined); // undefined = loading, null = none active

  useEffect(() => subscribeActiveTripLock((nextLock) => setLock(nextLock)), []);

  return {
    loading: lock === undefined,
    tripId: lock ? lock.itineraryId : null,
    tripTitle: lock ? lock.itineraryTitle : null,
  };
}
