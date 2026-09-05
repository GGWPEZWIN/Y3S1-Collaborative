import React, { useMemo, useState } from "react";
import { ArrowRight, Check, Clock } from "lucide-react";
import {
  ACTIVITY_CATEGORIES,
  getActivitiesFor,
  getDestination,
} from "../constants/itineraryData";
import EcoScoreBadge from "./EcoScoreBadge";
import useMediaQuery, { BREAKPOINTS } from "../hooks/useMediaQuery";
import * as w from "./wizardStyles";

/**
 * Step 3 — Select Activities
 *
 * Multi-select list of eco-friendly things to do at the chosen destination,
 * filtered by category chips. At least one activity is required to continue.
 *
 * Props: draft, onChange(patch), onNext, onBack
 */
export default function Step3Activities({ draft, onChange, onNext, onBack }) {
  const [category, setCategory] = useState("All");
  const isPhone = useMediaQuery(BREAKPOINTS.phone);

  const destination = getDestination(draft.destinationId);
  const all = useMemo(
    () => getActivitiesFor(draft.destinationId),
    [draft.destinationId]
  );

  const visible = useMemo(
    () => (category === "All" ? all : all.filter((a) => a.category === category)),
    [all, category]
  );

  const toggle = (activityId) => {
    const selected = draft.activityIds.includes(activityId)
      ? draft.activityIds.filter((id) => id !== activityId)
      : [...draft.activityIds, activityId];
    onChange({ activityIds: selected });
  };

  const selectedCount = draft.activityIds.length;

  return (
    <>
      <div style={w.stepHead}>
        <span style={w.stepBadge}>3</span>
        <div>
          <h2 style={w.stepTitle}>Select Activities</h2>
          <p style={w.stepSub}>
            Choose eco-friendly activities for your trip
            {destination ? ` in ${destination.name}` : ""}
          </p>
        </div>
      </div>

      <div style={{ ...w.card, ...(isPhone ? w.cardPhone : null) }}>
        <div style={{ ...styles.chipRow, ...(isPhone ? styles.chipRowPhone : null) }}>
          {ACTIVITY_CATEGORIES.map((c) => {
            const isActive = c === category;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                style={{ ...styles.chip, ...(isActive ? styles.chipActive : {}) }}
              >
                {c}
              </button>
            );
          })}
        </div>

        {visible.length === 0 ? (
          <div style={w.emptyState}>
            No {category.toLowerCase()} activities listed for this destination yet.
          </div>
        ) : (
          <div style={styles.list}>
            {visible.map((a) => {
              const isSelected = draft.activityIds.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggle(a.id)}
                  aria-pressed={isSelected}
                  style={{
                    ...styles.row,
                    ...(isPhone ? styles.rowPhone : null),
                    ...(isSelected ? styles.rowActive : {}),
                  }}
                >
                  <span
                    style={{
                      ...styles.checkbox,
                      ...(isSelected ? styles.checkboxOn : {}),
                    }}
                  >
                    {isSelected && <Check size={13} color="#fff" strokeWidth={3} />}
                  </span>

                  {/* The thumbnail is decoration next to the title and the
                      eco score; on a phone it costs width those need more. */}
                  {!isPhone && (
                    <img src={a.imageUrl} alt={a.title} style={styles.thumb} />
                  )}

                  <div style={styles.rowText}>
                    <div style={styles.rowTitle}>{a.title}</div>
                    <div style={styles.rowDesc}>{a.description}</div>
                    <div style={styles.rowMeta}>
                      <span style={styles.metaItem}>
                        <Clock size={12} /> {a.durationHours}h
                      </span>
                      <span style={styles.metaDot}>·</span>
                      <span style={styles.metaItem}>
                        {a.priceMyr === 0 ? "Free" : `RM ${a.priceMyr}`}
                      </span>
                      <span style={styles.metaDot}>·</span>
                      <span style={styles.metaItem}>{a.category}</span>
                    </div>
                  </div>

                  <EcoScoreBadge score={a.ecoScore} size={isPhone ? "sm" : "md"} />
                </button>
              );
            })}
          </div>
        )}

        <p style={styles.countLine}>
          {selectedCount === 0
            ? "Select at least one activity to continue."
            : `${selectedCount} ${selectedCount === 1 ? "activity" : "activities"} selected`}
        </p>
      </div>

      <div style={{ ...w.footer, ...(isPhone ? w.footerPhone : null) }}>
        <button type="button" onClick={onBack} style={{ ...w.backBtn, ...(isPhone ? w.btnPhone : null) }}>
          Back
        </button>
        <button
          type="button"
          disabled={selectedCount === 0}
          onClick={onNext}
          style={{
            ...w.nextBtn,
            ...(isPhone ? w.btnPhone : null),
            ...(selectedCount === 0 ? w.nextBtnDisabled : {}),
          }}
        >
          Next: Accommodation <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}

const styles = {
  chipRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 },
  // Five category chips wrap to three rows on a phone and push the list far
  // down the screen; scrolling them sideways keeps them to one row.
  chipRowPhone: {
    flexWrap: "nowrap",
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
    scrollbarWidth: "none",
    marginBottom: 14,
  },
  chip: {
    padding: "6px 16px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#374151",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  chipActive: { background: "#dcfce7", color: "#15803d", borderColor: "#bbf7d0" },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: 12,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
  },
  rowPhone: { gap: 10, padding: 11, alignItems: "flex-start" },
  rowActive: { borderColor: "#22c55e", background: "#f0fdf4" },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    border: "1.5px solid #d1d5db",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkboxOn: { background: "#22c55e", borderColor: "#22c55e" },
  thumb: {
    width: 78,
    height: 58,
    borderRadius: 8,
    objectFit: "cover",
    flexShrink: 0,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontWeight: 700, fontSize: 14.5 },
  rowDesc: { color: "#6b7280", fontSize: 13, marginTop: 2 },
  rowMeta: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    color: "#9ca3af",
    fontSize: 12,
    flexWrap: "wrap",
  },
  metaItem: { display: "inline-flex", alignItems: "center", gap: 4 },
  metaDot: { color: "#d1d5db" },
  countLine: { fontSize: 13, color: "#6b7280", margin: "16px 0 0" },
};
