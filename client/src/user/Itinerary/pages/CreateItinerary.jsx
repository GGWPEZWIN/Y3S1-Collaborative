import React, { useState } from "react";
import ItineraryShell from "../components/ItineraryShell";
import StepProgress from "../components/StepProgress";
import Step1TripDetails from "../components/Step1TripDetails";
import Step2Destination from "../components/Step2Destination";
import Step3Activities from "../components/Step3Activities";
import Step4Accommodation from "../components/Step4Accommodation";
import Step5Review from "../components/Step5Review";
import {
  getAccommodationsFor,
  getActivitiesFor,
  getDestination,
  nightsBetween,
  calcEcoScore,
  calcCarbon,
} from "../constants/itineraryData";

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
    destinationId: null,
    destinationName: "",
    activityIds: [],
    accommodationId: null,
  };
}

/**
 * CreateItinerary
 *
 * Container for the 5-step wizard. It owns the draft and the current step;
 * each step component is presentational and reports changes upward. Holding
 * the draft here is what lets the user step backwards without losing input.
 *
 * Props:
 * - onNavigate(route, id) — hash router callback from App.jsx
 * - onSave(itinerary)     — optional; receives the finished itinerary so the
 *   parent can add it to the list. Without it the wizard just returns to the
 *   list page, which is the current mock-data behaviour.
 */
export default function CreateItinerary({ onNavigate, onSave }) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(emptyDraft);

  const update = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

  const goNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  /** Builds the finished record from the draft, then hands it to the parent. */
  const handleSave = () => {
    const activities = getActivitiesFor(draft.destinationId).filter((a) =>
      draft.activityIds.includes(a.id)
    );
    const accommodation =
      getAccommodationsFor(draft.destinationId).find(
        (a) => a.id === draft.accommodationId
      ) ?? null;
    const nights = nightsBetween(draft.startDate, draft.endDate);
    const destination = getDestination(draft.destinationId);

    const itinerary = {
      ...draft,
      id: `itn-${Date.now()}`,
      status: "Planning",
      destinationName: destination?.name ?? draft.destinationName,
      ecoScore: calcEcoScore(activities, accommodation),
      carbonKg: calcCarbon(activities, nights),
      imageUrl: destination?.imageUrl ?? "",
    };

    onSave?.(itinerary);
    onNavigate?.("/itinerary");
  };

  return (
    <ItineraryShell onNavigate={onNavigate} activeRoute="/itinerary">
      {/* Steps already completed stay clickable so a traveller can correct
          an earlier answer without restarting the wizard. */}
      <StepProgress current={step} total={TOTAL_STEPS} onStepClick={setStep} />

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
        <Step5Review draft={draft} onSave={handleSave} onBack={goBack} />
      )}
    </ItineraryShell>
  );
}
