import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Pencil } from "lucide-react";

import Layout from "../../../shared/components/Layout";

import StepProgress from "../components/StepProgress";
import Step1TripDetails from "../components/Step1TripDetails";
import Step2Destination from "../components/Step2Destination";
import Step3Activities from "../components/Step3Activities";
import Step4Accommodation from "../components/Step4Accommodation";
import Step5Review from "../components/Step5Review";

import {
  getActivitiesForMany,
  getDestination,
  getStartLocation,
  orderDestinationsByProximity,
  assignDays,
  assignDayRanges,
  tripDayCount,
  findDateConflict,
  parseTravellerCount,
  isStartDateNotPast,
  validateTripName,
} from "../constants/itineraryData";

import {
  getItinerary,
  getMyItineraryDateRanges,
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
    // Numeric traveller count from Step 1's +/- counter (was a fixed
    // dropdown string like "2 Adults" — see parseTravellerCount for how an
    // older saved value is read back).
    travellers: 2,
    budget: 800,
    travellerStyle: "Budget",

    // Module 1: starting location + the (possibly multiple) chosen destinations.
    startLocationId: null,
    destinationIds: [],

    // Kept in sync with destinationIds[0] so any older code reading a single
    // destination off the draft keeps working.
    destinationId: null,
    destinationName: "",

    activityIds: [],

    // One selected stay PER destination: { [destinationId]: accommodationObject }.
    // Each value is the full stay object (static catalogue entry OR an
    // approved Firebase hotel) with an `id` matching its catalogue/document id.
    accommodationByDestination: {},

    // null => auto nearest-neighbour/shortest-route order;
    // an array of destinationIds once the traveller has nudged the order by hand in step 5.
    destinationOrder: null,
  };
}

/**
 * Rebuilds the wizard's working draft from a saved Firestore itinerary,
 * so the Edit flow opens the form pre-filled with exactly what was stored.
 */
function savedDocToDraft(docData) {
  const base = emptyDraft();

  const destinations = Array.isArray(docData.destinations)
    ? [...docData.destinations].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      )
    : [];

  const destinationIds = destinations
    .map((d) => d.destinationId)
    .filter(Boolean);

  return {
    ...base,

    name: docData.title ?? "",
    startDate: docData.dates?.startDate ?? "",
    endDate: docData.dates?.endDate ?? "",
    travellers: parseTravellerCount(
      docData.travellers ?? base.travellers
    ),

    budget:
      docData.budget != null
        ? Number(docData.budget)
        : base.budget,

    travellerStyle:
      docData.travellerStyle ?? base.travellerStyle,

    startLocationId:
      docData.startLocation?.locationId ?? null,

    destinationIds,

    destinationId:
      destinationIds[0] ?? null,

    destinationName:
      getDestination(destinationIds[0])?.name ?? "",

    activityIds: Array.isArray(docData.activityIds)
      ? docData.activityIds
      : [],

    // Prefer the new per-destination `accommodations` array; fall back to
    // the legacy single `accommodation` field (attached to whichever
    // destination it actually names, or the first/only destination on an
    // older single-destination itinerary) so an older saved doc still loads
    // instead of losing its stay or crashing the edit flow.
    accommodationByDestination: buildAccommodationByDestinationFromDoc(
      docData,
      destinationIds
    ),

    // Keep the saved visiting order so the review step doesn't reshuffle it.
    destinationOrder:
      destinationIds.length > 1
        ? destinationIds
        : null,
  };
}

/** See `savedDocToDraft` above — reconstructs the per-destination
 * accommodation map from either schema without ever throwing. */
function buildAccommodationByDestinationFromDoc(docData, destinationIds) {
  const map = {};

  const list =
    Array.isArray(docData.accommodations) && docData.accommodations.length > 0
      ? docData.accommodations
      : docData.accommodation
      ? [docData.accommodation]
      : [];

  list.forEach((entry, index) => {
    if (!entry) return;

    const destinationId =
      entry.destinationId && destinationIds.includes(entry.destinationId)
        ? entry.destinationId
        : destinationIds[index] ?? destinationIds[0] ?? null;

    if (!destinationId) return;

    map[destinationId] = {
      ...entry,
      id: entry.accommodationId ?? entry.id ?? null,
    };
  });

  return map;
}

/**
 * CreateItinerary
 *
 * Container for the 5-step wizard.
 *
 * Uses the SAME global Layout.jsx as the rest of the application.
 *
 * The global Layout provides:
 * - GreenTrip Malaysia header
 * - User profile
 * - Eco Score
 * - Global sidebar
 * - Active Itinerary navigation
 *
 * Module 1 scope:
 * - Trip input
 * - Starting location
 * - Destination selection
 * - Route ordering
 * - Activities
 * - Accommodation
 * - Saving itinerary
 *
 * It does NOT do any transport carbon / eco-score work —
 * that is Module 2, reached afterwards via the
 * "Get Green Recommendation" button.
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
    // ready | loading | error
    status: isEditing ? "loading" : "ready",
    error: null,
  });

  const [saveState, setSaveState] = useState({
    // idle | saving | saved | error
    status: "idle",
    id: null,
    error: null,
  });

  // The signed-in user's other saved itineraries' date ranges,
  // used to stop a second itinerary being booked over an existing one.
  const [datesState, setDatesState] = useState({
    status: "loading",
    ranges: [],
    error: null,
  });

  // The start date this itinerary was loaded with, when editing. The
  // "start date can't be in the past" rule only applies when the traveller
  // actually changes the date — an already-past-dated Active/Completed trip
  // must stay editable without being forced onto a new date.
  const [originalStartDate, setOriginalStartDate] = useState(null);

  // ============================================================
  // EDIT MODE
  // ============================================================

  useEffect(() => {
    if (!editItineraryId) {
      return undefined;
    }

    let active = true;

    getItinerary(editItineraryId)
      .then((docData) => {
        if (!active) return;

        if (!docData) {
          setLoadState({
            status: "error",
            error:
              "That itinerary could not be found. It may have been deleted.",
          });

          return;
        }

        setDraft(savedDocToDraft(docData));
        setOriginalStartDate(docData.dates?.startDate ?? null);

        setLoadState({
          status: "ready",
          error: null,
        });
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

  // ============================================================
  // LOAD USER'S EXISTING ITINERARY DATE RANGES
  // ============================================================

  useEffect(() => {
    let active = true;

    getMyItineraryDateRanges()
      .then((ranges) => {
        if (!active) return;

        setDatesState({
          status: "ready",
          ranges,
          error: null,
        });
      })
      .catch((err) => {
        if (!active) return;

        setDatesState({
          status: "error",
          ranges: [],
          error:
            err?.message ||
            "We couldn't check your existing itineraries right now.",
        });
      });

    return () => {
      active = false;
    };
  }, []);

  // ============================================================
  // UPDATE DRAFT
  // ============================================================

  const update = (patch) =>
    setDraft((prev) => {
      const next = {
        ...prev,
        ...patch,
      };

      if ("destinationIds" in patch) {
        next.destinationId =
          next.destinationIds[0] ?? null;

        next.destinationName =
          getDestination(
            next.destinationId
          )?.name ?? "";

        const validActivityIds = new Set(
          getActivitiesForMany(
            next.destinationIds
          ).map((a) => a.id)
        );

        next.activityIds =
          next.activityIds.filter((id) =>
            validActivityIds.has(id)
          );

        // Each accommodation pick is already keyed by its own destination —
        // just drop any destination that's no longer selected.
        const nextAccommodationByDestination = {};
        next.destinationIds.forEach((destId) => {
          if (prev.accommodationByDestination?.[destId]) {
            nextAccommodationByDestination[destId] =
              prev.accommodationByDestination[destId];
          }
        });
        next.accommodationByDestination = nextAccommodationByDestination;

        // The chosen set changed — drop any hand-tuned ordering.
        next.destinationOrder = null;
      }

      return next;
    });

  const goNext = () =>
    setStep((s) =>
      Math.min(s + 1, TOTAL_STEPS)
    );

  const goBack = () =>
    setStep((s) =>
      Math.max(s - 1, 1)
    );

  // ============================================================
  // DERIVED ROUTE DATA
  // ============================================================

  const startLocation = getStartLocation(
    draft.startLocationId
  );

  const selectedDestinations = useMemo(
    () =>
      draft.destinationIds
        .map(getDestination)
        .filter(Boolean),
    [draft.destinationIds]
  );

  const orderedDestinations = useMemo(() => {
    if (
      Array.isArray(
        draft.destinationOrder
      ) &&
      draft.destinationOrder.length ===
        selectedDestinations.length
    ) {
      const byId = new Map(
        selectedDestinations.map((d) => [
          d.id,
          d,
        ])
      );

      const manual =
        draft.destinationOrder
          .map((id) => byId.get(id))
          .filter(Boolean);

      if (
        manual.length ===
        selectedDestinations.length
      ) {
        return manual;
      }
    }

    return orderDestinationsByProximity(
      startLocation,
      selectedDestinations
    );
  }, [
    draft.destinationOrder,
    selectedDestinations,
    startLocation,
  ]);

  // ============================================================
  // DATE CONFLICT
  // ============================================================

  const dateConflict = useMemo(
    () =>
      findDateConflict(
        draft.startDate,
        draft.endDate,
        datesState.ranges,
        editItineraryId
      ),
    [
      draft.startDate,
      draft.endDate,
      datesState.ranges,
      editItineraryId,
    ]
  );

  const tripDays = tripDayCount(
    draft.startDate,
    draft.endDate
  );

  const dayAssignments = useMemo(
    () =>
      assignDays(
        orderedDestinations.length,
        tripDays
      ),
    [
      orderedDestinations.length,
      tripDays,
    ]
  );

  // One contiguous day range (and a nights estimate) per ordered
  // destination — used for the Step 5 "Day range" display and to split
  // accommodation cost across each stop instead of billing every night to
  // one trip-wide stay.
  const dayRanges = useMemo(
    () =>
      assignDayRanges(
        orderedDestinations.length,
        tripDays
      ),
    [
      orderedDestinations.length,
      tripDays,
    ]
  );

  // Requirement: more destinations than trip days must block continuing.
  const tooManyDestinations =
    orderedDestinations.length > 0 &&
    tripDays > 0 &&
    orderedDestinations.length > tripDays;

  // ============================================================
  // DESTINATION ORDERING
  // ============================================================

  const moveDestination = (
    index,
    direction
  ) => {
    const ids =
      orderedDestinations.map(
        (d) => d.id
      );

    const target =
      index + direction;

    if (
      target < 0 ||
      target >= ids.length
    ) {
      return;
    }

    [ids[index], ids[target]] = [
      ids[target],
      ids[index],
    ];

    update({
      destinationOrder: ids,
    });
  };

  // ============================================================
  // SAVE
  // ============================================================

  const handleSave = async (
    reviewEstimates
  ) => {
    if (
      saveState.status === "saving" ||
      saveState.status === "saved"
    ) {
      return;
    }

    setSaveState({
      status: "saving",
      id: null,
      error: null,
    });

    try {
      // Final trip name check — must hold before saving even if Step 1 was
      // somehow bypassed (e.g. jumping steps while editing).
      const nameValidation = validateTripName(draft.name);
      if (!nameValidation.valid) {
        setStep(1);

        setSaveState({
          status: "error",
          id: null,
          error: nameValidation.error,
        });

        return;
      }

      // Final "no past start date" check. Only enforced on create, or on
      // edit when the traveller actually changed the start date — an
      // already-past-dated Active/Completed trip must stay editable.
      const startDateChanged =
        !isEditing || draft.startDate !== originalStartDate;

      if (
        startDateChanged &&
        !isStartDateNotPast(draft.startDate)
      ) {
        setStep(1);

        setSaveState({
          status: "error",
          id: null,
          error:
            "The start date can't be in the past. Please choose today or a later date.",
        });

        return;
      }

      if (draft.endDate && draft.endDate < draft.startDate) {
        setStep(1);

        setSaveState({
          status: "error",
          id: null,
          error: "The end date must be on or after the start date.",
        });

        return;
      }

      // Final "not more destinations than trip days" check.
      if (tooManyDestinations) {
        setStep(2);

        setSaveState({
          status: "error",
          id: null,
          error:
            "You have more destinations than trip days. Increase your trip duration or remove a destination.",
        });

        return;
      }

      // Re-check the date overlap against fresh Firestore data at save time.
      try {
        const freshRanges =
          await getMyItineraryDateRanges();

        setDatesState({
          status: "ready",
          ranges: freshRanges,
          error: null,
        });

        const conflict =
          findDateConflict(
            draft.startDate,
            draft.endDate,
            freshRanges,
            editItineraryId
          );

        if (conflict) {
          setStep(1);

          setSaveState({
            status: "error",
            id: null,
            error:
              "You already have an itinerary during these dates. Please choose different dates.",
          });

          return;
        }
      } catch {
        // Fresh check failed — fall back to whatever was loaded on mount.
        if (dateConflict) {
          setStep(1);

          setSaveState({
            status: "error",
            id: null,
            error:
              "You already have an itinerary during these dates. Please choose different dates.",
          });

          return;
        }
      }

      // One accommodation entry per ordered destination — each pick was
      // already stored keyed by its own destinationId in Step 4, so there's
      // no cross-destination lookup/guessing needed here.
      const destinationAccommodations = orderedDestinations.map(
        (destination, index) => ({
          destinationId: destination.id,
          accommodation:
            draft.accommodationByDestination[destination.id] ?? null,
          day: dayAssignments[index] ?? 1,
          nights: dayRanges[index]?.nights ?? null,
        })
      );

      // The selected activities, resolved to full objects (each already
      // carries its own destinationId) so they're saved destination-tagged
      // rather than as bare ids only.
      const allActivities = getActivitiesForMany(draft.destinationIds);
      const selectedActivities = draft.activityIds
        .map((id) => allActivities.find((a) => a.id === id))
        .filter(Boolean);

      const input = {
        title: draft.name.trim(),
        startDate: draft.startDate,
        endDate: draft.endDate,
        startLocation,
        orderedDestinations,
        dayAssignments,
        destinationAccommodations,

        meta: {
          travellers: draft.travellers,
          budget: draft.budget,
          travellerStyle:
            draft.travellerStyle,

          activityIds:
            draft.activityIds,
          activities: selectedActivities,

          // Plan-level Eco Score already computed by Step5Review.
          ecoScore:
            reviewEstimates?.ecoScore ??
            null,
        },
      };

      // Edit → update same document.
      // Create → create new document.
      const id = isEditing
        ? await updateItinerary(
            editItineraryId,
            input
          )
        : await saveItinerary(input);

      setSaveState({
        status: "saved",
        id,
        error: null,
      });

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

  // ============================================================
  // GET GREEN RECOMMENDATION
  // ============================================================

  const handleGetRecommendation = () => {
    if (saveState.id) {
      onNavigate?.(
        "/recommendations",
        saveState.id
      );
    }
  };

  // ============================================================
  // LOADING / ERROR
  // ============================================================

  if (
    isEditing &&
    loadState.status !== "ready"
  ) {
    return (
      <Layout
        active="itinerary"
        onNavigate={onNavigate}
      >
        <div style={styles.pageContent}>
          <button
            type="button"
            style={styles.backLink}
            onClick={() =>
              onNavigate?.("/itinerary")
            }
          >
            Back to itineraries
          </button>

          {loadState.status ===
          "loading" ? (
            <div
              style={styles.loadingCard}
            >
              Loading itinerary for editing…
            </div>
          ) : (
            <div
              style={styles.errorCard}
            >
              <AlertCircle
                size={18}
                color="#b91c1c"
              />

              <div>
                <div
                  style={{
                    fontWeight: 700,
                  }}
                >
                  Could not open this itinerary
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: "#6b7280",
                    marginTop: 2,
                  }}
                >
                  {loadState.error}
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // ============================================================
  // MAIN CREATE / EDIT ITINERARY PAGE
  // ============================================================

  return (
    <Layout
      active="itinerary"
      onNavigate={onNavigate}
    >
      <div style={styles.pageContent}>
        {isEditing && (
          <div style={styles.editBanner}>
            <Pencil
              size={15}
              color="#15803d"
            />

            <span>
              Editing{" "}
              <strong>
                {draft.name ||
                  "your itinerary"}
              </strong>{" "}
              — saving updates the existing
              itinerary, no copy is created.
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
          <Step1TripDetails
            draft={draft}
            onChange={update}
            onNext={goNext}
            datesStatus={
              datesState.status
            }
            datesError={
              datesState.error
            }
            dateConflict={
              dateConflict
            }
            originalStartDate={
              isEditing ? originalStartDate : null
            }
          />
        )}

        {step === 2 && (
          <Step2Destination
            draft={draft}
            onChange={update}
            onNext={goNext}
            onBack={goBack}
            tripDays={tripDays}
            tooManyDestinations={tooManyDestinations}
          />
        )}

        {step === 3 && (
          <Step3Activities
            draft={draft}
            onChange={update}
            onNext={goNext}
            onBack={goBack}
            orderedDestinations={
              orderedDestinations
            }
            dayAssignments={
              dayAssignments
            }
          />
        )}

        {step === 4 && (
          <Step4Accommodation
            draft={draft}
            onChange={update}
            onNext={goNext}
            onBack={goBack}
            orderedDestinations={
              orderedDestinations
            }
            dayAssignments={
              dayAssignments
            }
            dayRanges={dayRanges}
          />
        )}

        {step === 5 && (
          <Step5Review
            draft={draft}
            startLocation={
              startLocation
            }
            orderedDestinations={
              orderedDestinations
            }
            dayAssignments={
              dayAssignments
            }
            dayRanges={dayRanges}
            onMoveDestination={
              moveDestination
            }
            onSave={handleSave}
            onBack={goBack}
            saveState={saveState}
            onGetRecommendation={
              handleGetRecommendation
            }
            onNavigate={onNavigate}
            isEditing={isEditing}
            onReviewAndAdjust={() =>
              setStep(3)
            }
          />
        )}
      </div>
    </Layout>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = {
  pageContent: {
    width: "100%",
    maxWidth: 1000,
    margin: "0 auto",
    padding: "40px 40px 60px",
    boxSizing: "border-box",
  },

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