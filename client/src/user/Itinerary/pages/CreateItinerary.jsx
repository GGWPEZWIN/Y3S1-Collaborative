import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Pencil } from "lucide-react";
import ItineraryShell from "../components/ItineraryShell";
import StepProgress from "../components/StepProgress";
import Step1TripDetails from "../components/Step1TripDetails";
import Step2Destination from "../components/Step2Destination";
import Step3Activities from "../components/Step3Activities";
import Step4Accommodation from "../components/Step4Accommodation";
import Step5Review from "../components/Step5Review";
import {
  getAccommodationsForMany,
  getActivitiesForMany,
  getDestination,
  getStartLocation,
  orderDestinationsByProximity,
  assignDays,
  tripDayCount,
} from "../constants/itineraryData";
import {
  getItinerary,
  saveItinerary,
  updateItinerary,
} from "../../../firebase/itineraryService";

const TOTAL_STEPS = 5;

/** A blank draft. Kept as a factory so each wizard run starts clean. */
function emptyDraft() {
  return {
    name: "",
    startDate: "",
    endDate: "",
    travellers: "2 Adults",
    budget: 800,
    travellerStyle: "Budget",
    // Module 1: starting location + the (possibly multiple) chosen destinations.
    startLocationId: null,
    destinationIds: [],
    // Kept in sync with destinationIds[0] so the Activities / Accommodation
    // steps, which were built around a single destination, keep working.
    destinationId: null,
    destinationName: "",
    activityIds: [],
    accommodationId: null,
    // null => auto nearest-neighbour order; an array of destinationIds once the
    // traveller has nudged the order by hand in step 5.
    destinationOrder: null,
  };
}

/**
 * Rebuilds the wizard's working draft from a saved Firestore itinerary, so the
 * Edit flow opens the form pre-filled with exactly what was stored. This is the
 * inverse of the mapping saveItinerary/updateItinerary apply on the way out.
 */
function savedDocToDraft(docData) {
  const base = emptyDraft();

  const destinations = Array.isArray(docData.destinations)
    ? [...docData.destinations].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];
  const destinationIds = destinations
    .map((d) => d.destinationId)
    .filter(Boolean);

  return {
    ...base,
    name: docData.title ?? "",
    startDate: docData.dates?.startDate ?? "",
    endDate: docData.dates?.endDate ?? "",
    travellers: docData.travellers ?? base.travellers,
    budget: docData.budget != null ? Number(docData.budget) : base.budget,
    travellerStyle: docData.travellerStyle ?? base.travellerStyle,
    startLocationId: docData.startLocation?.locationId ?? null,
    destinationIds,
    destinationId: destinationIds[0] ?? null,
    destinationName: getDestination(destinationIds[0])?.name ?? "",
    activityIds: Array.isArray(docData.activityIds) ? docData.activityIds : [],
    accommodationId: docData.accommodation?.accommodationId ?? null,
    // Keep the saved visiting order so the review step doesn't reshuffle it.
    destinationOrder: destinationIds.length > 1 ? destinationIds : null,
  };
}

/**
 * CreateItinerary
 *
 * Container for the 5-step wizard. It owns the draft and the current step;
 * each step component is presentational and reports changes upward.
 *
 * Module 1 scope: trip input, starting location, destination selection, route
 * ordering, and saving the finished itinerary to Firebase. It does NOT do any
 * transport carbon / eco-score work — that is Module 2, reached afterwards via
 * the "Get Green Recommendation" button.
 *
 * The same component powers the Edit flow: pass `editItineraryId` and it loads
 * that itinerary, pre-fills every step, and saves changes back to the SAME
 * document via updateItinerary instead of creating a new one.
 *
 * Props:
 * - onNavigate(route, id) — hash router callback from App.jsx
 * - onSave(itinerary)     — optional; receives { id } after a successful save.
 * - editItineraryId       — when set, edit that itinerary instead of creating one.
 */
export default function CreateItinerary({
  onNavigate,
  onSave,
  editItineraryId = null,
}) {
  const isEditing = Boolean(editItineraryId);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(emptyDraft);
  const [loadState, setLoadState] = useState({
    // ready | loading | error — non-edit runs start ready.
    status: isEditing ? "loading" : "ready",
    error: null,
  });
  const [saveState, setSaveState] = useState({
    status: "idle", // idle | saving | saved | error
    id: null,
    error: null,
  });

  // Edit mode: pull the existing itinerary and rebuild the draft from it.
  // loadState already starts at "loading" when editItineraryId is set, so the
  // effect only needs to resolve it once the fetch settles.
  useEffect(() => {
    if (!editItineraryId) return undefined;

    let active = true;

    getItinerary(editItineraryId)
      .then((docData) => {
        if (!active) return;
        if (!docData) {
          setLoadState({
            status: "error",
            error: "That itinerary could not be found. It may have been deleted.",
          });
          return;
        }
        setDraft(savedDocToDraft(docData));
        setLoadState({ status: "ready", error: null });
      })
      .catch((err) => {
        if (!active) return;
        setLoadState({
          status: "error",
          error:
            err?.message ||
            "Could not load this itinerary for editing. Please try again.",
        });
      });

    return () => {
      active = false;
    };
  }, [editItineraryId]);

  /**
   * Shallow-merge a patch into the draft. Selecting/deselecting destinations
   * has knock-on effects (the single-destination mirror, orphaned activity /
   * accommodation picks, a stale manual order), so those are reconciled here.
   */
  const update = (patch) =>
    setDraft((prev) => {
      const next = { ...prev, ...patch };

      if ("destinationIds" in patch) {
        next.destinationId = next.destinationIds[0] ?? null;
        next.destinationName = getDestination(next.destinationId)?.name ?? "";

        const validActivityIds = new Set(
          getActivitiesForMany(next.destinationIds).map((a) => a.id)
        );
        next.activityIds = next.activityIds.filter((id) =>
          validActivityIds.has(id)
        );

        const accommodationStillValid = getAccommodationsForMany(
          next.destinationIds
        ).some((a) => a.id === next.accommodationId);
        if (!accommodationStillValid) next.accommodationId = null;

        // The chosen set changed — drop any hand-tuned ordering.
        next.destinationOrder = null;
      }

      return next;
    });

  const goNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  // --- Derived route data -------------------------------------------------

  const startLocation = getStartLocation(draft.startLocationId);

  const selectedDestinations = useMemo(
    () => draft.destinationIds.map(getDestination).filter(Boolean),
    [draft.destinationIds]
  );

  const orderedDestinations = useMemo(() => {
    if (
      Array.isArray(draft.destinationOrder) &&
      draft.destinationOrder.length === selectedDestinations.length
    ) {
      const byId = new Map(selectedDestinations.map((d) => [d.id, d]));
      const manual = draft.destinationOrder
        .map((id) => byId.get(id))
        .filter(Boolean);
      if (manual.length === selectedDestinations.length) return manual;
    }
    return orderDestinationsByProximity(startLocation, selectedDestinations);
  }, [draft.destinationOrder, selectedDestinations, startLocation]);

  const tripDays = tripDayCount(draft.startDate, draft.endDate);

  const dayAssignments = useMemo(
    () => assignDays(orderedDestinations.length, tripDays),
    [orderedDestinations.length, tripDays]
  );

  /** Swap a destination with its neighbour in the visiting order. */
  const moveDestination = (index, direction) => {
    const ids = orderedDestinations.map((d) => d.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    update({ destinationOrder: ids });
  };

  // --- Save + handoff ---------------------------------------------------

  const handleSave = async (reviewEstimates) => {
    if (saveState.status === "saving" || saveState.status === "saved") return;

    setSaveState({ status: "saving", id: null, error: null });

    try {
      const accommodation =
        getAccommodationsForMany(draft.destinationIds).find(
          (a) => a.id === draft.accommodationId
        ) ?? null;

      const input = {
        title: draft.name,
        startDate: draft.startDate,
        endDate: draft.endDate,
        startLocation,
        orderedDestinations,
        dayAssignments,
        accommodation,
        meta: {
          travellers: draft.travellers,
          budget: draft.budget,
          travellerStyle: draft.travellerStyle,
          activityIds: draft.activityIds,
          // Plan-level Eco Score already computed by Step5Review via
          // calcEcoScore(activities, accommodation) — persisted as-is, not
          // recalculated here.
          ecoScore: reviewEstimates?.ecoScore ?? null,
        },
      };

      // Edit → write back to the same document; Create → new document.
      const id = isEditing
        ? await updateItinerary(editItineraryId, input)
        : await saveItinerary(input);

      setSaveState({ status: "saved", id, error: null });
      onSave?.({ id });
    } catch (err) {
      setSaveState({
        status: "error",
        id: null,
        error:
          err?.message ||
          (isEditing
            ? "Could not update itinerary. Please try again."
            : "Could not save the itinerary. Please check your connection and try again."),
      });
    }
  };

  const handleGetRecommendation = () => {
    if (saveState.id) onNavigate?.("/recommendations", saveState.id);
  };

  // Edit mode is still loading or failed to load — don't render the wizard yet.
  if (isEditing && loadState.status !== "ready") {
    return (
      <ItineraryShell onNavigate={onNavigate} activeRoute="/itinerary">
        <button
          type="button"
          style={styles.backLink}
          onClick={() => onNavigate?.("/itinerary")}
        >
          Back to itineraries
        </button>

        {loadState.status === "loading" ? (
          <div style={styles.loadingCard}>Loading itinerary for editing…</div>
        ) : (
          <div style={styles.errorCard}>
            <AlertCircle size={18} color="#b91c1c" />
            <div>
              <div style={{ fontWeight: 700 }}>Could not open this itinerary</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                {loadState.error}
              </div>
            </div>
          </div>
        )}
      </ItineraryShell>
    );
  }

  return (
    <ItineraryShell onNavigate={onNavigate} activeRoute="/itinerary">
      {isEditing && (
        <div style={styles.editBanner}>
          <Pencil size={15} color="#15803d" />
          <span>
            Editing <strong>{draft.name || "your itinerary"}</strong> — saving
            updates the existing itinerary, no copy is created.
          </span>
        </div>
      )}

      <StepProgress
        current={step}
        total={TOTAL_STEPS}
        onStepClick={setStep}
        allowJump={isEditing}
      />

      {step === 1 && (
        <Step1TripDetails draft={draft} onChange={update} onNext={goNext} />
      )}

      {step === 2 && (
        <Step2Destination
          draft={draft}
          onChange={update}
          onNext={goNext}
          onBack={goBack}
        />
      )}

      {step === 3 && (
        <Step3Activities
          draft={draft}
          onChange={update}
          onNext={goNext}
          onBack={goBack}
        />
      )}

      {step === 4 && (
        <Step4Accommodation
          draft={draft}
          onChange={update}
          onNext={goNext}
          onBack={goBack}
        />
      )}

      {step === 5 && (
        <Step5Review
          draft={draft}
          startLocation={startLocation}
          orderedDestinations={orderedDestinations}
          dayAssignments={dayAssignments}
          onMoveDestination={moveDestination}
          onSave={handleSave}
          onBack={goBack}
          saveState={saveState}
          onGetRecommendation={handleGetRecommendation}
          onNavigate={onNavigate}
          isEditing={isEditing}
          onReviewAndAdjust={() => setStep(3)}
        />
      )}
    </ItineraryShell>
  );
}

const styles = {
  backLink: {
    background: "transparent",
    border: "none",
    color: "#6b7280",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
    marginBottom: 16,
  },
  loadingCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: "40px 24px",
    textAlign: "center",
    fontWeight: 700,
    color: "#374151",
  },
  errorCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 14,
    padding: "18px 20px",
  },
  editBanner: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#15803d",
    borderRadius: 12,
    padding: "11px 16px",
    fontSize: 13.5,
    marginBottom: 16,
  },
};
