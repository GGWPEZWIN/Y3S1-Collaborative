import React, { useMemo } from "react";
import {
  Check,
  Calendar,
  MapPin,
  Navigation,
  Users,
  Wallet,
  Leaf,
  Cloud,
  BedDouble,
  ArrowUp,
  ArrowDown,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import {
  getActivitiesForMany,
  nightsBetween,
  calcEcoScore,
  calcCarbon,
  formatDate,
  formatTravellers,
  estimateItineraryCost,
  evaluateBudget,
} from "../constants/itineraryData";
import useMediaQuery, { BREAKPOINTS } from "../hooks/useMediaQuery";
import * as w from "./wizardStyles";

/**
 * Step 5 — Review, Order & Save
 *
 * Read-only summary of steps 1–4, plus the route order the wizard produced for
 * the chosen destinations (nearest-neighbour from the starting location, with a
 * day assigned to each stop). The traveller can nudge the order by hand.
 *
 * "Save Itinerary" writes the whole thing to Firebase via the container. Module
 * 1 stops there — transport carbon / eco recommendations are Module 2, reached
 * with "Get Green Recommendation" once the itinerary has an id.
 *
 * Props:
 * - draft, startLocation, orderedDestinations, dayAssignments, dayRanges
 * - onMoveDestination(index, direction)
 * - onSave({ ecoScore }), onBack
 * - saveState: { status: "idle"|"saving"|"saved"|"error", id, error }
 * - onGetRecommendation
 * - isEditing — true when the wizard is editing an existing itinerary
 * - onReviewAndAdjust — jump back to the activities step to trim the trip
 * - onNavigate(route, id) — hash router callback
 */
export default function Step5Review({
  draft,
  startLocation,
  orderedDestinations = [],
  dayAssignments = [],
  dayRanges = [],
  onMoveDestination,
  onSave,
  onBack,
  saveState = { status: "idle", id: null, error: null },
  onGetRecommendation,
  isEditing = false,
  onReviewAndAdjust,
  onNavigate,
}) {
  const isPhone = useMediaQuery(BREAKPOINTS.phone);

  const nights = nightsBetween(draft.startDate, draft.endDate);
  const destinationIds = useMemo(
    () => draft.destinationIds ?? [],
    [draft.destinationIds]
  );

  const accommodationByDestination = useMemo(
    () => draft.accommodationByDestination ?? {},
    [draft.accommodationByDestination]
  );

  const activities = useMemo(
    () =>
      getActivitiesForMany(destinationIds).filter((a) =>
        draft.activityIds.includes(a.id)
      ),
    [destinationIds, draft.activityIds]
  );

  // One stop per ordered destination — its own activities and its own
  // accommodation, never another destination's. This is what the route below
  // actually renders, and what gets saved.
  const stops = useMemo(
    () =>
      orderedDestinations.map((destination, index) => ({
        destination,
        day: dayAssignments[index] ?? 1,
        dayRange: dayRanges[index] ?? null,
        activities: activities.filter(
          (a) => a.destinationId === destination.id
        ),
        accommodation: accommodationByDestination[destination.id] ?? null,
      })),
    [orderedDestinations, dayAssignments, dayRanges, activities, accommodationByDestination]
  );

  // Every selected stay, each tagged with the nights actually spent at its
  // own destination — used for the cost/eco totals below.
  const accommodationsForTotals = useMemo(
    () =>
      stops
        .filter((s) => s.accommodation)
        .map((s) => ({
          ...s.accommodation,
          nights: s.dayRange?.nights ?? nights,
        })),
    [stops, nights]
  );

  // Activity / accommodation estimates only. Transport is not part of Module 1.
  const ecoScore = calcEcoScore(activities, accommodationsForTotals);
  const carbonKg = calcCarbon(activities, nights);

  const { total: totalCost } = estimateItineraryCost({
    activities,
    accommodations: accommodationsForTotals,
    nights,
  });
  const budgetStatus = evaluateBudget(totalCost, draft.budget);
  const overBudget = budgetStatus.overBudget;

  const saved = saveState.status === "saved";
  const saving = saveState.status === "saving";

  return (
    <>
      <div style={w.stepHead}>
        <span style={w.stepBadge}>5</span>
        <div>
          <h2 style={w.stepTitle}>Review Your Itinerary</h2>
          <p style={w.stepSub}>
            Check the route order, then save your trip
          </p>
        </div>
      </div>

      {/* Route order — the Module 1 deliverable. Each stop carries its OWN
          activities and accommodation, never another destination's. */}
      <div style={{ ...w.card, ...(isPhone ? w.cardPhone : null) }}>
        <h3 style={styles.blockTitle}>Route Order</h3>
        <p style={styles.helpText}>
          Ordered from your starting point so nearby stops sit together. Use the
          arrows to adjust. Module 2 uses these coordinates for transport.
        </p>

        <div style={styles.routeList}>
          <div style={styles.routeRow}>
            <span style={{ ...styles.orderDot, ...styles.orderDotStart }}>
              <Navigation size={13} color="#fff" />
            </span>
            <div style={styles.routeText}>
              <div style={styles.routeName}>
                {startLocation ? startLocation.name : "No starting location"}
              </div>
              <div style={styles.routeMeta}>Starting location</div>
            </div>
          </div>

          {stops.map(({ destination: d, day, dayRange, activities: stopActivities, accommodation: stopAccommodation }, index) => (
            <div key={d.id} style={styles.routeRow}>
              <span style={styles.orderDot}>{index + 1}</span>
              <div style={styles.routeText}>
                <div style={styles.routeName}>
                  Stop {index + 1} · {d.name}
                </div>
                <div style={styles.routeMeta}>
                  {dayRange && dayRange.endDay > dayRange.startDay
                    ? `Day ${dayRange.startDay}–${dayRange.endDay}`
                    : `Day ${day}`}{" "}
                  · {Number(d.latitude).toFixed(4)}, {Number(d.longitude).toFixed(4)}
                </div>

                <div style={styles.routeDetailLine}>
                  <Sparkles size={11} color="#9ca3af" />
                  <span>
                    Activities:{" "}
                    {stopActivities.length > 0
                      ? stopActivities.map((a) => a.title).join(", ")
                      : "None selected"}
                  </span>
                </div>
                <div style={styles.routeDetailLine}>
                  <BedDouble size={11} color="#9ca3af" />
                  <span>
                    Accommodation:{" "}
                    {stopAccommodation ? stopAccommodation.name : "None selected"}
                  </span>
                </div>
              </div>
              <div style={styles.orderBtns}>
                <button
                  type="button"
                  aria-label={`Move ${d.name} earlier`}
                  disabled={index === 0 || saved}
                  onClick={() => onMoveDestination?.(index, -1)}
                  style={{
                    ...styles.orderBtn,
                    ...(index === 0 || saved ? styles.orderBtnOff : null),
                  }}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${d.name} later`}
                  disabled={index === orderedDestinations.length - 1 || saved}
                  onClick={() => onMoveDestination?.(index, 1)}
                  style={{
                    ...styles.orderBtn,
                    ...(index === orderedDestinations.length - 1 || saved
                      ? styles.orderBtnOff
                      : null),
                  }}
                >
                  <ArrowDown size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Impact summary — activity & stay estimates only (not transport). */}
      <div
        style={{
          ...styles.impactRow,
          ...(isPhone ? styles.impactRowPhone : null),
          marginTop: 16,
        }}
      >
        <div style={styles.impactCard}>
          <div style={styles.impactLabel}>
            <Leaf size={14} color="#15803d" /> Eco Score
          </div>
          <div style={{ ...styles.impactValue, color: "#15803d" }}>{ecoScore}</div>
          <div style={styles.impactSub}>Activities &amp; stay average</div>
        </div>

        <div style={styles.impactCard}>
          <div style={styles.impactLabel}>
            <Cloud size={14} color="#2563eb" /> Est. Carbon
          </div>
          <div style={{ ...styles.impactValue, color: "#2563eb" }}>
            {carbonKg} kg
          </div>
          <div style={styles.impactSub}>Activities &amp; stay only</div>
        </div>

        <div style={styles.impactCard}>
          <div style={styles.impactLabel}>
            <Wallet size={14} color="#b45309" /> Est. Cost
          </div>
          <div
            style={{
              ...styles.impactValue,
              color: overBudget ? "#b91c1c" : "#111827",
            }}
          >
            RM {totalCost}
          </div>
          <div style={styles.impactSub}>
            {overBudget
              ? `RM ${budgetStatus.overBy} over budget`
              : `Budget RM ${budgetStatus.budget}`}
          </div>
        </div>
      </div>

      {overBudget && (
        <div style={styles.budgetWarn}>
          <div style={styles.budgetWarnHead}>
            <AlertCircle size={18} color="#b45309" />
            <span>Your itinerary exceeds your selected budget.</span>
          </div>

          <div style={styles.budgetWarnGrid}>
            <div>
              <div style={styles.budgetWarnLabel}>Budget</div>
              <div style={styles.budgetWarnValue}>RM {budgetStatus.budget}</div>
            </div>
            <div>
              <div style={styles.budgetWarnLabel}>Estimated total</div>
              <div style={styles.budgetWarnValue}>RM {budgetStatus.total}</div>
            </div>
            <div>
              <div style={styles.budgetWarnLabel}>Over budget</div>
              <div style={{ ...styles.budgetWarnValue, color: "#b91c1c" }}>
                RM {budgetStatus.overBy}
              </div>
            </div>
          </div>

          <p style={styles.budgetWarnHint}>
            You can go back and trim activities or pick a cheaper stay, or
            continue and save anyway.
          </p>

          {onReviewAndAdjust && (
            <button
              type="button"
              onClick={onReviewAndAdjust}
              style={styles.budgetWarnBtn}
            >
              Review &amp; Adjust
            </button>
          )}
        </div>
      )}

      <div style={{ ...w.card, ...(isPhone ? w.cardPhone : null), marginTop: 16 }}>
        <h3 style={styles.blockTitle}>{draft.name || "Untitled trip"}</h3>

        <div style={styles.detailGrid}>
          <Detail
            icon={Navigation}
            label="Starting from"
            value={startLocation?.name ?? "—"}
          />
          <Detail
            icon={MapPin}
            label="Destinations"
            value={
              orderedDestinations.length
                ? orderedDestinations.map((d) => d.name).join(", ")
                : "—"
            }
          />
          <Detail
            icon={Calendar}
            label="Dates"
            value={`${formatDate(draft.startDate)} – ${formatDate(draft.endDate)}`}
          />
          <Detail
            icon={Users}
            label="Travelers"
            value={formatTravellers(draft.travellers)}
          />
          <Detail icon={Leaf} label="Style" value={draft.travellerStyle} />
        </div>

        <h4 style={styles.sectionHead}>
          Activities &amp; Accommodation by Stop
        </h4>
        <div style={styles.stopSummaryList}>
          {stops.map(({ destination: d, activities: stopActivities, accommodation: stopAccommodation, dayRange }) => (
            <div key={d.id} style={styles.stopSummaryBlock}>
              <div style={styles.stopSummaryTitle}>{d.name}</div>

              {stopActivities.length > 0 ? (
                stopActivities.map((a) => (
                  <div key={a.id} style={styles.summaryRow}>
                    <span style={styles.tick}>
                      <Check size={12} color="#15803d" strokeWidth={3} />
                    </span>
                    <span style={styles.summaryName}>{a.title}</span>
                    <span style={styles.summaryMeta}>
                      {a.priceMyr === 0 ? "Free" : `RM ${a.priceMyr}`}
                    </span>
                  </div>
                ))
              ) : (
                <div style={styles.summarySub}>No activities selected.</div>
              )}

              {stopAccommodation ? (
                <div style={styles.summaryRow}>
                  <span style={styles.tick}>
                    <BedDouble size={12} color="#15803d" />
                  </span>
                  <span style={styles.summaryName}>
                    {stopAccommodation.name}
                    {dayRange?.nights ? (
                      <span style={styles.summarySub}>
                        {" "}
                        · {dayRange.nights}{" "}
                        {dayRange.nights === 1 ? "night" : "nights"}
                      </span>
                    ) : null}
                  </span>
                  {stopAccommodation.pricePerNight != null && (
                    <span style={styles.summaryMeta}>
                      RM {stopAccommodation.pricePerNight * (dayRange?.nights ?? nights)}
                    </span>
                  )}
                </div>
              ) : (
                <div style={styles.summarySub}>No stay selected.</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {saveState.status === "error" && (
        <div style={styles.errorBox}>
          <AlertCircle size={16} color="#b91c1c" />
          <span>{saveState.error}</span>
        </div>
      )}

      {saved ? (
        <div style={styles.successBox}>
          <div style={styles.successHead}>
            <span style={styles.successTick}>
              <Check size={16} color="#fff" strokeWidth={3} />
            </span>
            <div>
              <div style={styles.successTitle}>
                {isEditing ? "Changes saved" : "Itinerary saved"}
              </div>
              <div style={styles.successSub}>
                ID <code style={styles.code}>{saveState.id}</code>
              </div>
            </div>
          </div>
          <p style={styles.successText}>
            {isEditing
              ? "Your itinerary has been updated."
              : "Your itinerary is saved. Start your trip to open the recommendation tab from your starting location."}
          </p>
          {isEditing ? (
            <button
              type="button"
              onClick={() => onNavigate?.("/itinerary/details", saveState.id)}
              style={{ ...w.nextBtn, ...(isPhone ? w.btnPhone : null) }}
            >
              View updated itinerary
            </button>
          ) : (
            <button
              type="button"
              onClick={onGetRecommendation}
              style={{ ...w.nextBtn, ...(isPhone ? w.btnPhone : null) }}
            >
              <Sparkles size={16} /> Start Trip
            </button>
          )}
        </div>
      ) : (
        <div style={{ ...w.footer, ...(isPhone ? w.footerPhone : null) }}>
          <button
            type="button"
            onClick={onBack}
            disabled={saving}
            style={{ ...w.backBtn, ...(isPhone ? w.btnPhone : null) }}
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => onSave({ ecoScore })}
            disabled={saving}
            style={{
              ...w.nextBtn,
              ...(isPhone ? w.btnPhone : null),
              ...(saving ? w.nextBtnDisabled : null),
            }}
          >
            <Check size={16} />{" "}
            {saving
              ? isEditing
                ? "Saving changes…"
                : "Saving…"
              : isEditing
              ? "Save Changes"
              : "Save Itinerary"}
          </button>
        </div>
      )}
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
  impactRowPhone: { gridTemplateColumns: "1fr", gap: 10 },
  impactCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 18,
  },
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
  blockTitle: { fontSize: 18, fontWeight: 800, margin: "0 0 8px" },
  helpText: { fontSize: 12.5, color: "#6b7280", margin: "0 0 16px" },

  routeList: { display: "flex", flexDirection: "column", gap: 8 },
  routeRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
  },
  routeDetailLine: {
    display: "flex",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 5,
    color: "#6b7280",
    fontSize: 12,
    lineHeight: 1.4,
  },
  orderDot: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "#22c55e",
    color: "#fff",
    fontWeight: 800,
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  orderDotStart: { background: "#0ea5e9" },
  routeText: { flex: 1, minWidth: 0 },
  routeName: { fontWeight: 700, fontSize: 14 },
  routeMeta: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  orderBtns: { display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 },
  orderBtn: {
    width: 28,
    height: 22,
    borderRadius: 6,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },
  orderBtnOff: { opacity: 0.4, cursor: "not-allowed" },

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
  stopSummaryList: { display: "flex", flexDirection: "column", gap: 16 },
  stopSummaryBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    paddingBottom: 14,
    borderBottom: "1px solid #f3f4f6",
  },
  stopSummaryTitle: { fontWeight: 800, fontSize: 13.5, color: "#374151" },
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

  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    borderRadius: 12,
    padding: "12px 14px",
    fontSize: 13,
    marginTop: 16,
  },
  budgetWarn: {
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: 14,
    padding: 18,
    marginTop: 16,
  },
  budgetWarnHead: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 800,
    fontSize: 14,
    color: "#92400e",
  },
  budgetWarnGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
    margin: "14px 0 10px",
  },
  budgetWarnLabel: { fontSize: 12, fontWeight: 600, color: "#a16207" },
  budgetWarnValue: {
    fontSize: 16,
    fontWeight: 800,
    color: "#111827",
    marginTop: 3,
  },
  budgetWarnHint: {
    fontSize: 12.5,
    color: "#92400e",
    margin: "0 0 12px",
  },
  budgetWarnBtn: {
    background: "#fff",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    padding: "9px 16px",
    fontSize: 13.5,
    fontWeight: 700,
    color: "#374151",
    cursor: "pointer",
  },
  successBox: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 14,
    padding: 20,
    marginTop: 16,
    marginBottom: 32,
  },
  successHead: { display: "flex", alignItems: "center", gap: 12 },
  successTick: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: "#22c55e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  successTitle: { fontWeight: 800, fontSize: 15.5 },
  successSub: { fontSize: 12.5, color: "#6b7280", marginTop: 2 },
  code: {
    background: "#dcfce7",
    padding: "1px 6px",
    borderRadius: 5,
    fontSize: 12,
  },
  successText: { fontSize: 13.5, color: "#374151", margin: "14px 0" },
};
