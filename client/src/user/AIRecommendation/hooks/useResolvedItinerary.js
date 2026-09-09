import { useEffect, useState } from "react";
import {
  createDemoItineraryContext,
  createLoadFailedContext,
  createLoadingContext,
  resolveItineraryContext,
} from "../services/itinerary/resolveItinerary.js";

function requestedId(itineraryId) {
  return typeof itineraryId === "string" ? itineraryId.trim() : "";
}

export default function useResolvedItinerary({
  itineraryId = null,
  itinerary = null,
} = {}) {
  const id = requestedId(itineraryId);
  const [activeId, setActiveId] = useState(id);
  const [context, setContext] = useState(() =>
    id ? createLoadingContext(id) : createDemoItineraryContext()
  );

  if (activeId !== id) {
    setActiveId(id);
    setContext(id ? createLoadingContext(id) : createDemoItineraryContext());
  }

  useEffect(() => {
    let cancelled = false;

    resolveItineraryContext({ itineraryId: id || null, itinerary }).then(
      (result) => {
        if (!cancelled) setContext(result);
      },
      () => {
        if (!cancelled) setContext(createLoadFailedContext());
      }
    );

    return () => {
      cancelled = true;
    };
  }, [id, itinerary]);

  return context;
}
