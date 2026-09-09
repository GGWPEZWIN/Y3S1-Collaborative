import React, { useMemo, useState } from "react";
import { Search, ArrowRight, Check } from "lucide-react";
import { DESTINATIONS } from "../constants/itineraryData";
import useMediaQuery, { BREAKPOINTS } from "../hooks/useMediaQuery";
import * as w from "./wizardStyles";

/**
 * Step 2 — Select Destinations
 *
 * A searchable grid of popular Malaysian destinations. One or more can be
 * picked; step 5 orders them into a route and steps 3–4 load their options
 * from whichever destinations are chosen.
 *
 * Props: draft, onChange(patch), onNext, onBack
 */
export default function Step2Destination({ draft, onChange, onNext, onBack }) {
  const [search, setSearch] = useState("");
  const isPhone = useMediaQuery(BREAKPOINTS.phone);

  const selectedIds = draft.destinationIds ?? [];

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return DESTINATIONS;
    return DESTINATIONS.filter(
      (d) =>
        d.name.toLowerCase().includes(needle) ||
        d.state.toLowerCase().includes(needle)
    );
  }, [search]);

  // Toggle a destination in/out of the selection. The container reconciles any
  // activity / accommodation picks that no longer have a matching destination.
  const toggleDestination = (destination) => {
    const next = selectedIds.includes(destination.id)
      ? selectedIds.filter((id) => id !== destination.id)
      : [...selectedIds, destination.id];
    onChange({ destinationIds: next });
  };

  return (
    <>
      <div style={w.stepHead}>
        <span style={w.stepBadge}>2</span>
        <div>
          <h2 style={w.stepTitle}>Select Destinations</h2>
          <p style={w.stepSub}>
            Pick every place you'd like to visit — we'll order them into a route
          </p>
        </div>
      </div>

      <div style={{ ...w.card, ...(isPhone ? w.cardPhone : null) }}>
        <div style={w.searchBox}>
          <Search size={16} color="#9ca3af" />
          <input
            type="text"
            placeholder="Search destinations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={w.searchInput}
          />
        </div>

        <p style={w.sectionLabel}>
          Popular Destinations
          {selectedIds.length > 0 ? ` · ${selectedIds.length} selected` : ""}
        </p>

        {visible.length === 0 ? (
          <div style={w.emptyState}>
            No destination matches "{search}". Try another name or state.
          </div>
        ) : (
          <div style={{ ...styles.grid, ...(isPhone ? styles.gridPhone : null) }}>
            {visible.map((d) => {
              const isSelected = selectedIds.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDestination(d)}
                  aria-pressed={isSelected}
                  style={{
                    ...styles.destCard,
                    ...(isSelected ? styles.destCardActive : {}),
                  }}
                >
                  <div style={styles.imageWrap}>
                    <img src={d.imageUrl} alt={d.name} style={styles.image} />
                    {isSelected && (
                      <span style={styles.checkBadge}>
                        <Check size={13} color="#fff" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div style={styles.destBody}>
                    <div style={styles.destName}>{d.name}</div>
                    <div style={styles.destState}>{d.state}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ ...w.footer, ...(isPhone ? w.footerPhone : null) }}>
        <button type="button" onClick={onBack} style={{ ...w.backBtn, ...(isPhone ? w.btnPhone : null) }}>
          Back
        </button>
        <button
          type="button"
          disabled={selectedIds.length === 0}
          onClick={onNext}
          style={{
            ...w.nextBtn,
            ...(isPhone ? w.btnPhone : null),
            ...(selectedIds.length > 0 ? {} : w.nextBtnDisabled),
          }}
        >
          Next: Activities <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 16,
  },
  // Two per row on a phone: destination tiles stay recognisable at this size,
  // and a single column would make the list far too long to scan.
  gridPhone: { gridTemplateColumns: "1fr 1fr", gap: 10 },
  destCard: {
    border: "2px solid #e5e7eb",
    borderRadius: 12,
    overflow: "hidden",
    background: "#fff",
    padding: 0,
    cursor: "pointer",
    textAlign: "left",
    display: "block",
    width: "100%",
  },
  destCardActive: { borderColor: "#22c55e", background: "#f0fdf4" },
  imageWrap: { position: "relative", lineHeight: 0 },
  image: { width: "100%", height: 110, objectFit: "cover", display: "block" },
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "#22c55e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  destBody: { padding: "10px 12px 12px" },
  destName: { fontWeight: 700, fontSize: 14 },
  destState: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
};
