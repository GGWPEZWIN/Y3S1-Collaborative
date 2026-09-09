import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Navigation,
  Users,
  Leaf,
  Cloud,
  Wallet,
  BedDouble,
  Clock,
  Sparkles,
  Pencil,
} from "lucide-react";
import ItineraryShell from "../components/ItineraryShell";
import EcoScoreBadge from "../components/EcoScoreBadge";
import useMediaQuery, { BREAKPOINTS } from "../hooks/useMediaQuery";
import {
  MOCK_ITINERARIES,
  getAccommodationsFor,
  getActivitiesFor,
  getActivitiesForMany,
  nightsBetween,
  formatDate,
  estimateItineraryCost,
  evaluateBudget,
} from "../constants/itineraryData";
import { getItinerary } from "../../../firebase/itineraryService";

function statusPillStyle(status) {
  if (status === "Active") return { background: "#dcfce7", color: "#15803d" };
  if (status === "Completed") return { background: "#e0e7ff", color: "#4338ca" };
  return { background: "#fef3c7", color: "#b45309" };
}

/**
 * ItineraryDetails
 *
 * Read-only view of one saved itinerary, opened from a card on the list page.
 *
 * Props:
 * - itineraryId — id taken from the URL hash by App.jsx
 * - itineraries — optional override of the source list
 * - onNavigate(route, id)
 */
export default function ItineraryDetails({
  itineraryId,
  itineraries = MOCK_ITINERARIES,
  onNavigate,
}) {
  const isPhone = useMediaQuery(BREAKPOINTS.phone);
  const itinerary = itineraries.find((it) => it.id === itineraryId) ?? null;

  // Anything not in the mock list is looked up in Firebase — that's where the
  // itineraries saved by the Create wizard (Module 1) live.
  const [savedDoc, setSavedDoc] = useState(null);
  const [triedFetch, setTriedFetch] = useState(false);

  useEffect(() => {
    if (itinerary || !itineraryId) return undefined;
    let active = true;
    getItinerary(itineraryId)
      .then((doc) => {
        if (active) setSavedDoc(doc);
      })
      .catch((err) => {
        console.warn("Could not load itinerary:", err);
      })
      .finally(() => {
        if (active) setTriedFetch(true);
      });
    return () => {
      active = false;
    };
  }, [itinerary, itineraryId]);

  const loadingSaved = !itinerary && !triedFetch;

  const activities = useMemo(() => {
    if (!itinerary) return [];
    return getActivitiesFor(itinerary.destinationId).filter((a) =>
      itinerary.activityIds.includes(a.id)
    );
  }, [itinerary]);

  const accommodation = useMemo(() => {
    if (!itinerary) return null;
    return (
      getAccommodationsFor(itinerary.destinationId).find(
        (a) => a.id === itinerary.accommodationId
      ) ?? null
    );
  }, [itinerary]);

  // Not a mock itinerary — show the Firebase-backed view (or loading / 404).
  if (!itinerary) {
    return (
      <ItineraryShell onNavigate={onNavigate} activeRoute="/itinerary">
        <button
          type="button"
          style={styles.backLink}
          onClick={() => onNavigate?.("/itinerary")}
        >
          <ArrowLeft size={16} /> Back to itineraries
        </button>

        {loadingSaved ? (
          <div style={styles.notFound}>
            <div style={{ fontWeight: 700 }}>Loading itinerary…</div>
          </div>
        ) : savedDoc ? (
          <SavedItineraryView
            doc={savedDoc}
            isPhone={isPhone}
            onNavigate={onNavigate}
          />
        ) : (
          <div style={styles.notFound}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🧭</div>
            <div style={{ fontWeight: 700 }}>Itinerary not found</div>
            <div style={{ color: "#6b7280", fontSize: 13.5, marginTop: 4 }}>
              It may have been removed. Head back to the list to pick another.
            </div>
          </div>
        )}
      </ItineraryShell>
    );
  }

  const nights = nightsBetween(itinerary.startDate, itinerary.endDate);
  const stayCost = accommodation ? accommodation.pricePerNight * nights : 0;
  const activityCost = activities.reduce((sum, a) => sum + a.priceMyr, 0);

  return (
    <ItineraryShell onNavigate={onNavigate} activeRoute="/itinerary">
      <button
        type="button"
        style={styles.backLink}
        onClick={() => onNavigate?.("/itinerary")}
      >
        <ArrowLeft size={16} /> Back to itineraries
      </button>

      <div style={styles.hero}>
        <img src={itinerary.imageUrl} alt={itinerary.name} style={styles.heroImage} />
        <div style={styles.heroBody}>
          <div style={styles.heroTitleRow}>
            <h1 style={{ ...styles.title, ...(isPhone ? styles.titlePhone : null) }}>
              {itinerary.name}
            </h1>
            <span style={{ ...styles.pill, ...statusPillStyle(itinerary.status) }}>
              {itinerary.status}
            </span>
          </div>

          <div style={styles.metaGrid}>
            <Meta icon={MapPin} label="Destination" value={itinerary.destinationName} />
            <Meta
              icon={Calendar}
              label="Dates"
              value={`${formatDate(itinerary.startDate)} – ${formatDate(itinerary.endDate)}`}
            />
            <Meta icon={Users} label="Travelers" value={itinerary.travellers} />
            <Meta icon={Leaf} label="Style" value={itinerary.travellerStyle} />
          </div>
        </div>
      </div>

      <div style={{ ...styles.impactRow, ...(isPhone ? styles.impactRowPhone : null) }}>
        <Impact
          icon={Leaf}
          color="#15803d"
          label="Eco Score"
          value={itinerary.ecoScore}
          sub="Trip average"
        />
        <Impact
          icon={Cloud}
          color="#2563eb"
          label="Carbon"
          value={`${itinerary.carbonKg} kg`}
          sub="Estimated CO₂"
        />
        <Impact
          icon={Wallet}
          color="#b45309"
          label="Est. Cost"
          value={`RM ${activityCost + stayCost}`}
          sub={`Budget RM ${itinerary.budget}`}
        />
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Activities ({activities.length})</h3>
        {activities.length === 0 ? (
          <p style={styles.muted}>No activities added to this trip yet.</p>
        ) : (
          <div style={styles.list}>
            {activities.map((a) => (
              <div key={a.id} style={{ ...styles.row, ...(isPhone ? styles.rowPhone : null) }}>
                {!isPhone && (
                  <img src={a.imageUrl} alt={a.title} style={styles.thumb} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.rowTitle}>{a.title}</div>
                  <div style={styles.rowDesc}>{a.description}</div>
                  <div style={styles.rowMeta}>
                    <Clock size={12} /> {a.durationHours}h ·{" "}
                    {a.priceMyr === 0 ? "Free" : `RM ${a.priceMyr}`} · {a.category}
                  </div>
                </div>
                <EcoScoreBadge score={a.ecoScore} size="sm" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ ...styles.card, marginBottom: 32 }}>
        <h3 style={styles.cardTitle}>Accommodation</h3>
        {accommodation ? (
          <div style={{ ...styles.row, ...(isPhone ? styles.rowPhone : null) }}>
            {!isPhone && (
              <img
                src={accommodation.imageUrl}
                alt={accommodation.name}
                style={styles.thumb}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.rowTitle}>{accommodation.name}</div>
              <div style={styles.rowDesc}>{accommodation.description}</div>
              <div style={styles.rowMeta}>
                <BedDouble size={12} /> {accommodation.type} · {nights}{" "}
                {nights === 1 ? "night" : "nights"} · RM {stayCost} total
              </div>
            </div>
            <EcoScoreBadge score={accommodation.ecoScore} size="sm" />
          </div>
        ) : (
          <p style={styles.muted}>No stay selected for this trip.</p>
        )}
      </div>
    </ItineraryShell>
  );
}

/**
 * Read-only view of an itinerary saved by Module 1's Create wizard. Kept
 * deliberately simple — it shows the route the way Module 2 will consume it
 * (ordered stops, day, coordinates) and links onward to the recommendation.
 */
function SavedItineraryView({ doc, isPhone, onNavigate }) {
  const destinations = Array.isArray(doc.destinations) ? doc.destinations : [];
  const start = doc.startLocation;
  const id = doc.itineraryId || doc.id;

  // Estimated cost + budget status, from the same data the wizard captured.
  const nights = nightsBetween(doc.dates?.startDate, doc.dates?.endDate);
  const destinationIds = destinations.map((d) => d.destinationId).filter(Boolean);
  const activities = getActivitiesForMany(destinationIds).filter((a) =>
    Array.isArray(doc.activityIds) ? doc.activityIds.includes(a.id) : false
  );
  const cost = estimateItineraryCost({
    activities,
    accommodation: doc.accommodation,
    nights,
  });
  const budgetStatus = evaluateBudget(cost.total, doc.budget);

  return (
    <>
      <div style={styles.hero}>
        <div style={styles.heroBody}>
          <div style={styles.heroTitleRow}>
            <h1 style={{ ...styles.title, ...(isPhone ? styles.titlePhone : null) }}>
              {doc.title || "Untitled trip"}
            </h1>
            <span style={{ ...styles.pill, background: "#fef3c7", color: "#b45309" }}>
              {doc.status || "Planning"}
            </span>
            <button
              type="button"
              onClick={() => onNavigate?.("/itinerary/edit", id)}
              style={styles.editBtn}
            >
              <Pencil size={14} /> Edit Itinerary
            </button>
          </div>

          <div style={styles.metaGrid}>
            <Meta
              icon={Navigation}
              label="Starting from"
              value={start?.name ?? "—"}
            />
            <Meta
              icon={Calendar}
              label="Dates"
              value={`${formatDate(doc.dates?.startDate)} – ${formatDate(
                doc.dates?.endDate
              )}`}
            />
            <Meta
              icon={Users}
              label="Travelers"
              value={doc.travellers ?? "—"}
            />
            <Meta icon={Leaf} label="Style" value={doc.travellerStyle ?? "—"} />
          </div>
        </div>
      </div>

      {doc.ecoScore != null && (
        <div style={{ ...styles.card, marginTop: 16 }}>
          <h3 style={styles.cardTitle}>Eco Score</h3>
          <EcoScoreBadge score={doc.ecoScore} />
          <p style={{ ...styles.muted, marginTop: 10 }}>
            Average of the selected activities and accommodation. The
            transport-inclusive score is added by the recommendation step.
          </p>
        </div>
      )}

      <div style={{ ...styles.card, marginTop: 16 }}>
        <h3 style={styles.cardTitle}>Route ({destinations.length} stops)</h3>
        <div style={styles.list}>
          {start && (
            <div style={styles.row}>
              <span style={{ ...styles.orderDot, background: "#0ea5e9" }}>
                <Navigation size={12} color="#fff" />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.rowTitle}>{start.name}</div>
                <div style={styles.rowMeta}>
                  Starting location · {Number(start.latitude)},{" "}
                  {Number(start.longitude)}
                </div>
              </div>
            </div>
          )}
          {destinations.map((d) => (
            <div key={d.destinationId || d.order} style={styles.row}>
              <span style={styles.orderDot}>{d.order}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.rowTitle}>{d.name}</div>
                <div style={styles.rowMeta}>
                  Day {d.day} · {Number(d.latitude)}, {Number(d.longitude)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {doc.accommodation && (
        <div style={{ ...styles.card, marginTop: 16 }}>
          <h3 style={styles.cardTitle}>Accommodation</h3>
          <div style={styles.row}>
            <span style={styles.tickDot}>
              <BedDouble size={12} color="#15803d" />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.rowTitle}>{doc.accommodation.name}</div>
              <div style={styles.rowMeta}>
                {doc.accommodation.type || "Stay"}
                {doc.accommodation.pricePerNight != null
                  ? ` · RM ${doc.accommodation.pricePerNight} / night`
                  : ""}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ ...styles.card, marginTop: 16 }}>
        <div style={styles.budgetHead}>
          <h3 style={{ ...styles.cardTitle, margin: 0 }}>Budget</h3>
          {budgetStatus.hasBudget && (
            <span
              style={{
                ...styles.pill,
                ...(budgetStatus.overBudget
                  ? { background: "#fee2e2", color: "#b91c1c" }
                  : { background: "#dcfce7", color: "#15803d" }),
              }}
            >
              {budgetStatus.overBudget ? "Over Budget" : "Within Budget"}
            </span>
          )}
        </div>

        <div style={styles.budgetGrid}>
          <div>
            <div style={styles.metaLabel}>Budget</div>
            <div style={styles.metaValue}>
              {budgetStatus.hasBudget ? `RM ${budgetStatus.budget}` : "Not set"}
            </div>
          </div>
          <div>
            <div style={styles.metaLabel}>Estimated</div>
            <div style={styles.metaValue}>RM {cost.total}</div>
          </div>
          {budgetStatus.overBudget && (
            <div>
              <div style={styles.metaLabel}>Over budget</div>
              <div style={{ ...styles.metaValue, color: "#b91c1c" }}>
                RM {budgetStatus.overBy}
              </div>
            </div>
          )}
        </div>

        <p style={{ ...styles.muted, marginTop: 12 }}>
          Estimated from activities and accommodation. Transport is added by the
          recommendation step.
        </p>
      </div>

      <div style={{ ...styles.card, marginTop: 16, marginBottom: 32 }}>
        <h3 style={styles.cardTitle}>Next step</h3>
        <p style={{ ...styles.muted, marginBottom: 14 }}>
          Transport options and eco score are added by the recommendation step.
        </p>
        <button
          type="button"
          onClick={() => onNavigate?.("/recommendations", id)}
          style={styles.recBtn}
        >
          <Sparkles size={16} /> Get Green Recommendation
        </button>
      </div>
    </>
  );
}

function Meta({ icon: Icon, label, value }) {
  return (
    <div>
      <div style={styles.metaLabel}>
        <Icon size={13} color="#9ca3af" /> {label}
      </div>
      <div style={styles.metaValue}>{value}</div>
    </div>
  );
}

function Impact({ icon: Icon, color, label, value, sub }) {
  return (
    <div style={styles.impactCard}>
      <div style={styles.impactLabel}>
        <Icon size={14} color={color} /> {label}
      </div>
      <div style={{ ...styles.impactValue, color }}>{value}</div>
      <div style={styles.impactSub}>{sub}</div>
    </div>
  );
}

const styles = {
  backLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "transparent",
    border: "none",
    color: "#6b7280",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
    marginBottom: 16,
  },
  hero: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    overflow: "hidden",
  },
  heroImage: { width: "100%", height: 200, objectFit: "cover", display: "block" },
  heroBody: { padding: 22 },
  titlePhone: { fontSize: 19, lineHeight: 1.25 },
  heroTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: 800, margin: 0 },
  pill: { fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 999 },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 16,
  },
  metaLabel: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 12,
    fontWeight: 600,
    color: "#9ca3af",
  },
  metaValue: { fontWeight: 700, fontSize: 14.5, marginTop: 4 },
  impactRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
    margin: "16px 0",
  },
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
  impactValue: { fontSize: 24, fontWeight: 800, marginTop: 8 },
  impactSub: { fontSize: 12, color: "#9ca3af", marginTop: 3 },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 15.5, fontWeight: 800, margin: "0 0 14px" },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  row: { display: "flex", alignItems: "center", gap: 14 },
  rowPhone: { alignItems: "flex-start", gap: 10 },
  thumb: {
    width: 78,
    height: 58,
    borderRadius: 8,
    objectFit: "cover",
    flexShrink: 0,
  },
  rowTitle: { fontWeight: 700, fontSize: 14.5 },
  rowDesc: { color: "#6b7280", fontSize: 13, marginTop: 2 },
  rowMeta: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    color: "#9ca3af",
    fontSize: 12,
  },
  muted: { color: "#9ca3af", fontSize: 13.5, margin: 0 },
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
  tickDot: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "#dcfce7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  recBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "#22c55e",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "12px 20px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  editBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "#fff",
    color: "#15803d",
    border: "1px solid #86efac",
    borderRadius: 999,
    padding: "6px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    marginLeft: "auto",
  },
  budgetHead: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  budgetGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 16,
  },
  notFound: {
    background: "#fff",
    border: "1px dashed #d1d5db",
    borderRadius: 16,
    padding: "48px 24px",
    textAlign: "center",
  },
};
