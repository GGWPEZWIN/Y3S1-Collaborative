import React, { useMemo } from "react";
import { ArrowRight, Check, BedDouble } from "lucide-react";
import {
  getAccommodationsForMany,
  nightsBetween,
} from "../constants/itineraryData";
import EcoScoreBadge from "./EcoScoreBadge";
import useMediaQuery, { BREAKPOINTS } from "../hooks/useMediaQuery";
import * as w from "./wizardStyles";

/**
 * Step 4 — Select Accommodation
 *
 * Single-select list of certified eco-stays at the chosen destination. The
 * total shown on each card is nightly rate × nights from step 1, so the cost
 * the traveller sees matches the trip they actually configured.
 *
 * Props: draft, onChange(patch), onNext, onBack
 */
export default function Step4Accommodation({ draft, onChange, onNext, onBack }) {
  const isPhone = useMediaQuery(BREAKPOINTS.phone);

  const destinationIds = useMemo(
    () => draft.destinationIds ?? [],
    [draft.destinationIds]
  );
  const options = useMemo(
    () => getAccommodationsForMany(destinationIds),
    [destinationIds]
  );
  const nights = nightsBetween(draft.startDate, draft.endDate);

  return (
    <>
      <div style={w.stepHead}>
        <span style={w.stepBadge}>4</span>
        <div>
          <h2 style={w.stepTitle}>Select Accommodation</h2>
          <p style={w.stepSub}>
            Certified eco-stays across your destinations
            {nights > 0 ? ` · ${nights} ${nights === 1 ? "night" : "nights"}` : ""}
          </p>
        </div>
      </div>

      <div style={{ ...w.card, ...(isPhone ? w.cardPhone : null) }}>
        {options.length === 0 ? (
          <div style={w.emptyState}>
            No eco-certified stays listed for this destination yet.
          </div>
        ) : (
          <div style={styles.list}>
            {options.map((a) => {
              const isSelected = a.id === draft.accommodationId;
              return (
                <button
                  key={a.id}
                  type="button"
                  // Re-clicking the chosen stay clears it, so a traveller can
                  // undo without a separate "none" option.
                  onClick={() =>
                    onChange({ accommodationId: isSelected ? null : a.id })
                  }
                  aria-pressed={isSelected}
                  style={{
                    ...styles.row,
                    ...(isPhone ? styles.rowPhone : null),
                    ...(isSelected ? styles.rowActive : {}),
                  }}
                >
                  <span
                    style={{
                      ...styles.radio,
                      ...(isSelected ? styles.radioOn : {}),
                    }}
                  >
                    {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                  </span>

                  {!isPhone && (
                    <img src={a.imageUrl} alt={a.name} style={styles.thumb} />
                  )}

                  <div style={styles.rowText}>
                    <div style={styles.rowTitleLine}>
                      <span style={styles.rowTitle}>{a.name}</span>
                      <span style={styles.typePill}>
                        <BedDouble size={11} /> {a.type}
                      </span>
                    </div>
                    <div style={styles.rowDesc}>{a.description}</div>

                    <div style={styles.certRow}>
                      {a.certifications.map((cert) => (
                        <span key={cert} style={styles.certPill}>
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Price sits in a right-hand column on desktop; on a phone
                      it becomes a row beneath the description, because a
                      third column leaves the name about 90px to wrap in. */}
                  <div
                    style={{
                      ...styles.priceCol,
                      ...(isPhone ? styles.priceColPhone : null),
                    }}
                  >
                    <EcoScoreBadge score={a.ecoScore} size="sm" />

                    {isPhone ? (
                      // Laid out side by side, "per night" reads better folded
                      // into the price than stranded as its own column.
                      <div style={styles.priceInline}>
                        <span style={{ ...styles.price, ...styles.priceFlat }}>
                          RM {a.pricePerNight}
                        </span>
                        <span style={styles.priceSub}> / night</span>
                      </div>
                    ) : (
                      <>
                        <div style={styles.price}>RM {a.pricePerNight}</div>
                        <div style={styles.priceSub}>per night</div>
                      </>
                    )}

                    {nights > 0 && (
                      <div
                        style={{
                          ...styles.priceTotal,
                          ...(isPhone ? styles.priceFlat : null),
                        }}
                      >
                        RM {a.pricePerNight * nights} total
                      </div>
                    )}
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
          disabled={!draft.accommodationId}
          onClick={onNext}
          style={{
            ...w.nextBtn,
            ...(isPhone ? w.btnPhone : null),
            ...(draft.accommodationId ? {} : w.nextBtnDisabled),
          }}
        >
          Next: Review <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}

const styles = {
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
  rowPhone: { flexWrap: "wrap", gap: 10, padding: 12, alignItems: "flex-start" },
  rowActive: { borderColor: "#22c55e", background: "#f0fdf4" },
  radio: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    border: "1.5px solid #d1d5db",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioOn: { background: "#22c55e", borderColor: "#22c55e" },
  thumb: {
    width: 88,
    height: 66,
    borderRadius: 8,
    objectFit: "cover",
    flexShrink: 0,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitleLine: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  rowTitle: { fontWeight: 700, fontSize: 14.5 },
  typePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 999,
    background: "#f3f4f6",
    color: "#6b7280",
  },
  rowDesc: { color: "#6b7280", fontSize: 13, marginTop: 3 },
  certRow: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 },
  certPill: {
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 9px",
    borderRadius: 999,
    background: "#dbeafe",
    color: "#2563eb",
  },
  priceCol: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 2,
    flexShrink: 0,
  },
  priceColPhone: {
    // flexBasis 100% pushes this onto its own line inside the wrapping row.
    flexBasis: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingTop: 10,
    marginTop: 2,
    borderTop: "1px solid #f3f4f6",
  },
  price: { fontWeight: 800, fontSize: 15.5, marginTop: 6 },
  priceSub: { color: "#9ca3af", fontSize: 11.5 },
  priceTotal: { color: "#15803d", fontSize: 12, fontWeight: 700, marginTop: 3 },
  // On the phone row the three price bits sit side by side, so their
  // desktop top-margins have to come off.
  priceFlat: { marginTop: 0 },
  priceInline: { display: "flex", alignItems: "baseline", gap: 2 },
};
