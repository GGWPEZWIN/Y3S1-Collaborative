import React from "react";
import { ArrowRight, Leaf, AlertCircle } from "lucide-react";
import {
  TRAVELLER_STYLES,
  START_LOCATIONS,
  formatDate,
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
 */
export default function Step1TripDetails({
  draft,
  onChange,
  onNext,
  datesStatus = "ready",
  datesError = null,
  dateConflict = null,
}) {
  const isPhone = useMediaQuery(BREAKPOINTS.phone);

  // The native date input can't express "end must not precede start", so the
  // rule lives here and is mirrored onto the input's `min` attribute.
  const datesValid =
    !draft.startDate || !draft.endDate || draft.endDate >= draft.startDate;

  const checkingDates = datesStatus === "loading";

  const canContinue =
    draft.name.trim() !== "" &&
    draft.startDate &&
    draft.endDate &&
    datesValid &&
    Boolean(draft.startLocationId) &&
    !dateConflict &&
    !checkingDates;

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
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. Penang Heritage & Nature Trip"
            style={styles.input}
          />
        </label>

        <div style={twoCol}>
          <label style={styles.field}>
            <span style={styles.label}>Start Date</span>
            <input
              type="date"
              value={draft.startDate}
              onChange={(e) => onChange({ startDate: e.target.value })}
              style={styles.input}
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>End Date</span>
            <input
              type="date"
              value={draft.endDate}
              min={draft.startDate || undefined}
              onChange={(e) => onChange({ endDate: e.target.value })}
              style={styles.input}
            />
          </label>
        </div>

        {!datesValid && (
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
            <select
              value={draft.travellers}
              onChange={(e) => onChange({ travellers: e.target.value })}
              style={styles.input}
            >
              {["1 Adult", "2 Adults", "3 Adults", "4 Adults", "Family (2+2)"].map(
                (option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                )
              )}
            </select>
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
