import React, { useMemo } from "react";
import {
  Check,
  Calendar,
  MapPin,
  Users,
  Wallet,
  Leaf,
  Cloud,
  BedDouble,
} from "lucide-react";
import {
  getAccommodationsFor,
  getActivitiesFor,
  getDestination,
  nightsBetween,
  calcEcoScore,
  calcCarbon,
  formatDate,
} from "../constants/itineraryData";
import useMediaQuery, { BREAKPOINTS } from "../hooks/useMediaQuery";
import * as w from "./wizardStyles";

/**
 * Step 5 — Review & Save
 *
 * Read-only summary of everything chosen in steps 1–4, with the trip's eco
 * score and estimated carbon computed from the actual selections rather than
 * hardcoded, plus a rough cost so the plan can be checked against the budget.
 *
 * Props: draft, onSave, onBack
 */
export default function Step5Review({ draft, onSave, onBack }) {
  const isPhone = useMediaQuery(BREAKPOINTS.phone);

  const destination = getDestination(draft.destinationId);
  const nights = nightsBetween(draft.startDate, draft.endDate);

  const activities = useMemo(
    () =>
      getActivitiesFor(draft.destinationId).filter((a) =>
        draft.activityIds.includes(a.id)
      ),
    [draft.destinationId, draft.activityIds]
  );

  const accommodation = useMemo(
    () =>
      getAccommodationsFor(draft.destinationId).find(
        (a) => a.id === draft.accommodationId
      ) ?? null,
    [draft.destinationId, draft.accommodationId]
  );

  const ecoScore = calcEcoScore(activities, accommodation);
  const carbonKg = calcCarbon(activities, nights);

  const activityCost = activities.reduce((sum, a) => sum + a.priceMyr, 0);
  const stayCost = accommodation ? accommodation.pricePerNight * nights : 0;
  const totalCost = activityCost + stayCost;
  const overBudget = draft.budget > 0 && totalCost > draft.budget;

  return (
    <>
      <div style={w.stepHead}>
        <span style={w.stepBadge}>5</span>
        <div>
          <h2 style={w.stepTitle}>Review Your Itinerary</h2>
          <p style={w.stepSub}>Check everything over, then save your trip</p>
        </div>
      </div>

      {/* Impact summary — the headline numbers for the whole trip. */}
      <div style={{ ...styles.impactRow, ...(isPhone ? styles.impactRowPhone : null) }}>
        <div style={styles.impactCard}>
          <div style={styles.impactLabel}>
            <Leaf size={14} color="#15803d" /> Eco Score
          </div>
          <div style={{ ...styles.impactValue, color: "#15803d" }}>{ecoScore}</div>
          <div style={styles.impactSub}>Average across your choices</div>
        </div>

        <div style={styles.impactCard}>
          <div style={styles.impactLabel}>
            <Cloud size={14} color="#2563eb" /> Est. Carbon
          </div>
          <div style={{ ...styles.impactValue, color: "#2563eb" }}>
            {carbonKg} kg
          </div>
          <div style={styles.impactSub}>CO₂ for the full trip</div>
        </div>

        <div style={styles.impactCard}>
          <div style={styles.impactLabel}>
            <Wallet size={14} color="#b45309" /> Est. Cost
          </div>
          <div
            style={{ ...styles.impactValue, color: overBudget ? "#b91c1c" : "#111827" }}
          >
            RM {totalCost}
          </div>
          <div style={styles.impactSub}>
            {overBudget
              ? `RM ${totalCost - draft.budget} over budget`
              : `Budget RM ${draft.budget}`}
          </div>
        </div>
      </div>

      <div style={{ ...w.card, ...(isPhone ? w.cardPhone : null), marginTop: 16 }}>
        <h3 style={styles.blockTitle}>{draft.name || "Untitled trip"}</h3>

        <div style={styles.detailGrid}>
          <Detail icon={MapPin} label="Destination" value={destination?.name ?? "—"} />
          <Detail
            icon={Calendar}
            label="Dates"
            value={`${formatDate(draft.startDate)} – ${formatDate(draft.endDate)}`}
          />
          <Detail icon={Users} label="Travelers" value={draft.travellers} />
          <Detail icon={Leaf} label="Style" value={draft.travellerStyle} />
        </div>

        <h4 style={styles.sectionHead}>
          Activities ({activities.length})
        </h4>
        <div style={styles.summaryList}>
          {activities.map((a) => (
            <div key={a.id} style={styles.summaryRow}>
              <span style={styles.tick}>
                <Check size={12} color="#15803d" strokeWidth={3} />
              </span>
              <span style={styles.summaryName}>{a.title}</span>
              <span style={styles.summaryMeta}>
                {a.priceMyr === 0 ? "Free" : `RM ${a.priceMyr}`}
              </span>
            </div>
          ))}
        </div>

        <h4 style={styles.sectionHead}>Accommodation</h4>
        {accommodation ? (
          <div style={styles.summaryRow}>
            <span style={styles.tick}>
              <BedDouble size={12} color="#15803d" />
            </span>
            <span style={styles.summaryName}>
              {accommodation.name}
              <span style={styles.summarySub}>
                {" "}
                · {nights} {nights === 1 ? "night" : "nights"}
              </span>
            </span>
            <span style={styles.summaryMeta}>RM {stayCost}</span>
          </div>
        ) : (
          <div style={styles.summarySub}>No stay selected.</div>
        )}
      </div>

      <div style={{ ...w.footer, ...(isPhone ? w.footerPhone : null) }}>
        <button type="button" onClick={onBack} style={{ ...w.backBtn, ...(isPhone ? w.btnPhone : null) }}>
          Back
        </button>
        <button
          type="button"
          onClick={onSave}
          style={{ ...w.nextBtn, ...(isPhone ? w.btnPhone : null) }}
        >
          <Check size={16} /> Save Itinerary
        </button>
      </div>
    </>
  );
}

function Detail({ icon: Icon, label, value }) {
  return (
    <div>
      <div style={styles.detailLabel}>
        <Icon size={13} color="#9ca3af" /> {label}
      </div>
      <div style={styles.detailValue}>{value}</div>
    </div>
  );
}

const styles = {
  impactRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 },
  // Three cards across a phone leaves each about 110px — too narrow for
  // "RM 1,240". One row of three becomes a single stacked column.
  impactRowPhone: { gridTemplateColumns: "1fr", gap: 10 },
  impactCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 18,
  },
  summaryRowWrap: { flexWrap: "wrap" },
  impactLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12.5,
    fontWeight: 700,
    color: "#6b7280",
  },
  impactValue: { fontSize: 26, fontWeight: 800, marginTop: 8 },
  impactSub: { fontSize: 12, color: "#9ca3af", marginTop: 3 },
  blockTitle: { fontSize: 18, fontWeight: 800, margin: "0 0 16px" },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 16,
    paddingBottom: 18,
    borderBottom: "1px solid #f3f4f6",
  },
  detailLabel: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 12,
    fontWeight: 600,
    color: "#9ca3af",
  },
  detailValue: { fontWeight: 700, fontSize: 14.5, marginTop: 4 },
  sectionHead: { fontSize: 14, fontWeight: 800, margin: "18px 0 10px" },
  summaryList: { display: "flex", flexDirection: "column", gap: 8 },
  summaryRow: { display: "flex", alignItems: "center", gap: 10, fontSize: 13.5 },
  tick: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: "#dcfce7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  summaryName: { flex: 1, fontWeight: 600 },
  summarySub: { color: "#9ca3af", fontWeight: 500, fontSize: 13 },
  summaryMeta: { color: "#6b7280", fontWeight: 600 },
};
