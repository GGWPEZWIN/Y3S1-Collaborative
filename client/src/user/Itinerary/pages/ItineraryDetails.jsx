import React, { useMemo } from "react";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Leaf,
  Cloud,
  Wallet,
  BedDouble,
  Clock,
} from "lucide-react";
import ItineraryShell from "../components/ItineraryShell";
import EcoScoreBadge from "../components/EcoScoreBadge";
import useMediaQuery, { BREAKPOINTS } from "../hooks/useMediaQuery";
import {
  MOCK_ITINERARIES,
  getAccommodationsFor,
  getActivitiesFor,
  nightsBetween,
  formatDate,
} from "../constants/itineraryData";

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

  // A stale hash (bookmarked, or an itinerary deleted elsewhere) lands here.
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
        <div style={styles.notFound}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🧭</div>
          <div style={{ fontWeight: 700 }}>Itinerary not found</div>
          <div style={{ color: "#6b7280", fontSize: 13.5, marginTop: 4 }}>
            It may have been removed. Head back to the list to pick another.
          </div>
        </div>
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
  notFound: {
    background: "#fff",
    border: "1px dashed #d1d5db",
    borderRadius: 16,
    padding: "48px 24px",
    textAlign: "center",
  },
};
