import React, { useState } from "react";
import { ArrowRight, Leaf, AlertCircle, Minus, Plus } from "lucide-react";
import {
  TRAVELLER_STYLES,
  START_LOCATIONS,
  formatDate,
  todayLocalDateString,
  isStartDateNotPast,
  MIN_TRAVELLERS,
  MAX_TRAVELLERS,
  clampTravellerCount,
  validateTripName,
  TRIP_NAME_MAX_LENGTH,
} from "../constants/itineraryData";
import useMediaQuery, { BREAKPOINTS } from "../hooks/useMediaQuery";
import * as w from "./wizardStyles";

/**
 * Step 1 — Trip Details
 *
 * Name, dates, party size, budget and travel style. This is the only step
 * with free-text input, so it owns the "you can't continue yet" validation.
 *
 * Props:
 * - draft    — the wizard's working itinerary object
 * - onChange(patch) — shallow-merges the patch into the draft
 * - onNext   — advance to step 2
 * - datesStatus  — "loading" | "ready" | "error": state of the check that loads
 *                  the traveller's existing itineraries for overlap detection
 * - datesError   — message when datesStatus === "error" (non-blocking)
 * - dateConflict — an existing itinerary { title, startDate, endDate } whose
 *                  dates overlap the ones entered here, or null
 * - originalStartDate — when editing, the start date the itinerary was
 *                  loaded with. An already-past-dated Active/Completed trip
 *                  stays editable as long as this field isn't changed to a
 *                  new past date. null when creating a new itinerary.
 */
export default function Step1TripDetails({
  draft,
  onChange,
  onNext,
  datesStatus = "ready",
  datesError = null,
  dateConflict = null,
  originalStartDate = null,
}) {
  const isPhone = useMediaQuery(BREAKPOINTS.phone);
  const today = todayLocalDateString();

  // Trip name error only shows once the traveller has actually interacted
  // with the field — not on first render before they've typed anything.
  const [nameTouched, setNameTouched] = useState(false);
  const nameValidation = validateTripName(draft.name);
  const showNameError = nameTouched && !nameValidation.valid;

  // The native date input can't express "end must not precede start", so the
  // rule lives here and is mirrored onto the input's `min` attribute.
  const datesValid =
    !draft.startDate || !draft.endDate || draft.endDate >= draft.startDate;

  // Only block a past start date when it's actually being set/changed here —
  // editing an already-past-dated trip without touching its date must keep
  // working.
  const startDateChanged =
    originalStartDate == null || draft.startDate !== originalStartDate;
  const startDateValid =
    !startDateChanged || isStartDateNotPast(draft.startDate, today);

  const checkingDates = datesStatus === "loading";

  const canContinue =
    nameValidation.valid &&
    draft.startDate &&
    draft.endDate &&
    datesValid &&
    startDateValid &&
    Boolean(draft.startLocationId) &&
    !dateConflict &&
    !checkingDates;

  const handleStartDateChange = (value) => {
    const patch = { startDate: value };
    // If the new start date pushes past the current end date, clear the end
    // date rather than leave an invalid (end < start) pair sitting in state.
    if (draft.endDate && value && draft.endDate < value) {
      patch.endDate = "";
    }
    onChange(patch);
  };

  const twoCol = { ...styles.twoCol, ...(isPhone ? styles.twoColPhone : null) };

  return (
    <>
      <div style={w.stepHead}>
        <span style={w.stepBadge}>1</span>
        <div>
          <h2 style={w.stepTitle}>Trip Details</h2>
          <p style={w.stepSub}>Let's start planning your sustainable trip</p>
        </div>
      </div>

      <div
        style={{
          ...w.card,
          ...(isPhone ? w.cardPhone : null),
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <label style={styles.field}>
          <span style={styles.label}>Trip Name</span>
          <input
            type="text"
            value={draft.name}
            maxLength={TRIP_NAME_MAX_LENGTH}
            onChange={(e) => {
              setNameTouched(true);
              onChange({ name: e.target.value });
            }}
            onBlur={() => setNameTouched(true)}
            placeholder="e.g. Penang Heritage & Nature Trip"
            style={styles.input}
          />
          <p style={styles.charCount}>
            {draft.name.length} / {TRIP_NAME_MAX_LENGTH}
          </p>
          {showNameError && (
            <p style={styles.error}>{nameValidation.error}</p>
          )}
        </label>

        <div style={twoCol}>
          <label style={styles.field}>
            <span style={styles.label}>Start Date</span>
            <input
              type="date"
              value={draft.startDate}
              min={today}
              onChange={(e) => handleStartDateChange(e.target.value)}
              style={styles.input}
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>End Date</span>
            <input
              type="date"
              value={draft.endDate}
              min={draft.startDate || today}
              onChange={(e) => onChange({ endDate: e.target.value })}
              style={styles.input}
            />
          </label>
        </div>

        {!startDateValid && (
          <p style={styles.error}>
            Start date can&apos;t be in the past. Please choose today or a
            later date.
          </p>
        )}

        {startDateValid && !datesValid && (
          <p style={styles.error}>End date must be on or after the start date.</p>
        )}

        {checkingDates && (
          <p style={styles.checkingLine}>Checking your existing itineraries…</p>
        )}

        {datesValid && dateConflict && (
          <div style={styles.conflictBox}>
            <AlertCircle size={16} color="#b91c1c" />
            <div>
              <div style={{ fontWeight: 700 }}>
                You already have an itinerary during these dates. Please choose
                different dates.
              </div>
              <div style={styles.conflictSub}>
                Clashes with{" "}
                <strong>{dateConflict.title || "an existing itinerary"}</strong>{" "}
                ({formatDate(dateConflict.startDate)} –{" "}
                {formatDate(dateConflict.endDate)}).
              </div>
            </div>
          </div>
        )}

        {datesStatus === "error" && (
          <div style={styles.softWarnBox}>
            <AlertCircle size={15} color="#b45309" />
            <span>
              {datesError ||
                "We couldn't check your existing itineraries right now."}{" "}
              You can continue — we'll check again when you save.
            </span>
          </div>
        )}

        <label style={styles.field}>
          <span style={styles.label}>Starting Location</span>
          <select
            value={draft.startLocationId || ""}
            onChange={(e) =>
              onChange({ startLocationId: e.target.value || null })
            }
            style={styles.input}
          >
            <option value="">Select where you're starting from…</option>
            {START_LOCATIONS.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
                {loc.state ? ` — ${loc.state}` : ""}
              </option>
            ))}
          </select>
        </label>

        <div style={twoCol}>
          <label style={styles.field}>
            <span style={styles.label}>Travelers</span>
            <div style={styles.counterRow}>
              <button
                type="button"
                aria-label="Decrease travellers"
                disabled={draft.travellers <= MIN_TRAVELLERS}
                onClick={() =>
                  onChange({
                    travellers: clampTravellerCount(
                      draft.travellers - 1
                    ),
                  })
                }
                style={{
                  ...styles.counterBtn,
                  ...(draft.travellers <= MIN_TRAVELLERS
                    ? styles.counterBtnOff
                    : null),
                }}
              >
                <Minus size={15} />
              </button>

              <span style={styles.counterValue}>
                {draft.travellers}{" "}
                {draft.travellers === 1 ? "Traveller" : "Travellers"}
              </span>

              <button
                type="button"
                aria-label="Increase travellers"
                disabled={draft.travellers >= MAX_TRAVELLERS}
                onClick={() =>
                  onChange({
                    travellers: clampTravellerCount(
                      draft.travellers + 1
                    ),
                  })
                }
                style={{
                  ...styles.counterBtn,
                  ...(draft.travellers >= MAX_TRAVELLERS
                    ? styles.counterBtnOff
                    : null),
                }}
              >
                <Plus size={15} />
              </button>
            </div>
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Budget (per person)</span>
            <div style={styles.inputPrefixWrap}>
              <span style={styles.inputPrefix}>RM</span>
              <input
                type="number"
                min={0}
                step={50}
                value={draft.budget}
                onChange={(e) => onChange({ budget: Number(e.target.value) })}
                style={{ ...styles.input, border: "none", paddingLeft: 4 }}
              />
            </div>
          </label>
        </div>

        <div style={styles.field}>
          <span style={styles.label}>Traveler Style</span>
          <div style={styles.styleRow}>
            {TRAVELLER_STYLES.map((style) => {
              const isActive = style === draft.travellerStyle;
              return (
                <button
                  key={style}
                  type="button"
                  onClick={() => onChange({ travellerStyle: style })}
                  style={{
                    ...styles.styleBtn,
                    ...(isActive ? styles.styleBtnActive : {}),
                  }}
                >
                  {isActive ? (
                    <Leaf size={14} color="#15803d" />
                  ) : (
                    <span style={styles.radioDot} />
                  )}
                  {style}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ ...w.footer, ...(isPhone ? w.footerPhone : null) }}>
        {!isPhone && <span />}
        <button
          type="button"
          disabled={!canContinue}
          onClick={onNext}
          style={{
            ...w.nextBtn,
            ...(isPhone ? w.btnPhone : null),
            ...(canContinue ? {} : w.nextBtnDisabled),
          }}
        >
          Next: Select Destination <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}

const styles = {
  field: { display: "flex", flexDirection: "column", gap: 7 },
  label: { fontSize: 13.5, fontWeight: 700, color: "#374151" },
  input: {
    width: "100%",
    padding: "11px 14px",
    // 16px prevents iOS Safari from zooming the viewport when a field is
    // focused — the single most common "feels broken" bug in an installed PWA.
    fontSize: 16,
    borderRadius: 8,
    border: "1px solid #d1d5db",
    outline: "none",
    background: "#fff",
    color: "#111827",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  inputPrefixWrap: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    border: "1px solid #d1d5db",
    borderRadius: 8,
    paddingLeft: 14,
    background: "#fff",
  },
  inputPrefix: { fontSize: 14, color: "#6b7280", fontWeight: 600 },
  counterRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: "6px 10px",
    background: "#fff",
    boxSizing: "border-box",
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#f9fafb",
    color: "#374151",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    padding: 0,
  },
  counterBtnOff: { opacity: 0.4, cursor: "not-allowed" },
  counterValue: {
    flex: 1,
    textAlign: "center",
    fontSize: 14.5,
    fontWeight: 700,
    color: "#111827",
  },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  // Two date pickers side by side are unusably narrow on a phone.
  twoColPhone: { gridTemplateColumns: "1fr", gap: 14 },
  styleRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  styleBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "9px 16px",
    borderRadius: 999,
    border: "1px solid #d1d5db",
    background: "#fff",
    fontSize: 13.5,
    fontWeight: 600,
    color: "#374151",
    cursor: "pointer",
  },
  styleBtnActive: {
    background: "#dcfce7",
    borderColor: "#86efac",
    color: "#15803d",
  },
  radioDot: {
    width: 13,
    height: 13,
    borderRadius: "50%",
    border: "1.5px solid #d1d5db",
    display: "inline-block",
  },
  error: { color: "#b91c1c", fontSize: 13, margin: 0 },
  charCount: {
    alignSelf: "flex-end",
    fontSize: 11.5,
    color: "#9ca3af",
    margin: 0,
  },
  checkingLine: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "#6b7280",
    fontSize: 12.5,
    margin: 0,
  },
  conflictBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 10,
    padding: "12px 14px",
    color: "#b91c1c",
    fontSize: 13,
  },
  conflictSub: { color: "#6b7280", fontSize: 12.5, marginTop: 3 },
  softWarnBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: 10,
    padding: "10px 13px",
    color: "#92400e",
    fontSize: 12.5,
  },
};
