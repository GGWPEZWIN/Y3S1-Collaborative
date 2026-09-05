import React, { useMemo, useState } from "react";
import { Search, Plus, Calendar, Leaf, Cloud, MapPin } from "lucide-react";
import ItineraryShell from "../components/ItineraryShell";
import useMediaQuery, { BREAKPOINTS } from "../hooks/useMediaQuery";
import {
  ITINERARY_STATUSES,
  MOCK_ITINERARIES,
  formatDate,
} from "../constants/itineraryData";

/** Pill colours per itinerary status, matching the Challenges difficulty pills. */
function statusPillStyle(status) {
  if (status === "Active") return { background: "#dcfce7", color: "#15803d" };
  if (status === "Completed") return { background: "#e0e7ff", color: "#4338ca" };
  return { background: "#fef3c7", color: "#b45309" }; // Planning
}

function ItineraryCard({ itinerary, onOpen }) {
  return (
    <button type="button" style={styles.card} onClick={() => onOpen(itinerary.id)}>
      <img
        src={itinerary.imageUrl}
        alt={itinerary.name}
        style={styles.cardImage}
      />

      <div style={styles.cardBody}>
        <div style={styles.cardTitleRow}>
          <span style={styles.cardTitle}>{itinerary.name}</span>
          <span style={{ ...styles.pill, ...statusPillStyle(itinerary.status) }}>
            {itinerary.status}
          </span>
        </div>

        <div style={styles.cardMetaRow}>
          <MapPin size={13} color="#6b7280" />
          <span>{itinerary.destinationName}</span>
        </div>

        <div style={styles.cardMetaRow}>
          <Calendar size={13} color="#6b7280" />
          <span>
            {formatDate(itinerary.startDate)} – {formatDate(itinerary.endDate)}
          </span>
        </div>

        <div style={styles.cardStats}>
          <div>
            <div style={styles.statLabel}>Eco Score</div>
            <div style={styles.statValueGreen}>
              <Leaf size={14} /> {itinerary.ecoScore}
            </div>
          </div>

          <div>
            <div style={styles.statLabel}>Carbon</div>
            <div style={styles.statValueBlue}>
              <Cloud size={14} /> {itinerary.carbonKg} kg
            </div>
          </div>

          <div>
            <div style={styles.statLabel}>Activities</div>
            <div style={styles.statValue}>{itinerary.activityIds.length}</div>
          </div>
        </div>
      </div>
    </button>
  );
}

/**
 * ItineraryPage — the module's landing screen.
 *
 * Lists every itinerary the traveller has created, filtered by a search box
 * and the All / Planning / Active / Completed tabs. "Create Itinerary" starts
 * the 5-step wizard.
 *
 * Props:
 * - onNavigate(route, id) — hash router callback from App.jsx
 * - itineraries — optional override; defaults to the mock list. Once a wizard
 *   run finishes, App.jsx can pass the accumulated list down here.
 */
export default function ItineraryPage({ onNavigate, itineraries = MOCK_ITINERARIES }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const isPhone = useMediaQuery(BREAKPOINTS.phone);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return itineraries.filter((it) => {
      const matchesStatus = statusFilter === "All" || it.status === statusFilter;
      const matchesSearch =
        needle === "" ||
        it.name.toLowerCase().includes(needle) ||
        it.destinationName.toLowerCase().includes(needle);
      return matchesStatus && matchesSearch;
    });
  }, [itineraries, search, statusFilter]);

  return (
    <ItineraryShell onNavigate={onNavigate} activeRoute="/itinerary">
      <div style={{ ...styles.headerRow, ...(isPhone ? styles.headerRowPhone : null) }}>
        <div>
          <h1 style={{ ...styles.pageTitle, ...(isPhone ? styles.pageTitlePhone : null) }}>
            Sustainable Itinerary Planning
          </h1>
          <p style={styles.pageSubtitle}>
            Create and manage eco-friendly travel plans
          </p>
        </div>

        {/* On a phone the button goes full width beneath the heading rather
            than squeezing onto the same line as a long title. */}
        <button
          type="button"
          style={{ ...styles.createBtn, ...(isPhone ? styles.createBtnPhone : null) }}
          onClick={() => onNavigate?.("/itinerary/create")}
        >
          <Plus size={16} />
          Create Itinerary
        </button>
      </div>

      <div style={styles.searchBox}>
        <Search size={16} color="#9ca3af" />
        <input
          type="text"
          placeholder="Search itineraries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={{ ...styles.tabRow, ...(isPhone ? styles.tabRowPhone : null) }}>
        {ITINERARY_STATUSES.map((status) => {
          const isActive = status === statusFilter;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              style={{
                ...styles.tab,
                ...(isActive ? styles.tabActive : {}),
              }}
            >
              {status}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🗺️</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            No itineraries yet
          </div>
          <div style={{ color: "#6b7280", fontSize: 13.5 }}>
            {search || statusFilter !== "All"
              ? "Try a different search or filter."
              : "Tap Create Itinerary to plan your first sustainable trip."}
          </div>
        </div>
      ) : (
        <div style={{ ...styles.grid, ...(isPhone ? styles.gridPhone : null) }}>
          {visible.map((it) => (
            <ItineraryCard
              key={it.id}
              itinerary={it}
              onOpen={(id) => onNavigate?.("/itinerary/details", id)}
            />
          ))}
        </div>
      )}
    </ItineraryShell>
  );
}

const styles = {
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 20,
  },
  headerRowPhone: { flexDirection: "column", alignItems: "stretch", gap: 14 },
  pageTitle: { fontSize: 26, fontWeight: 800, margin: 0 },
  pageTitlePhone: { fontSize: 21, lineHeight: 1.25 },
  pageSubtitle: { color: "#6b7280", marginTop: 6, marginBottom: 0, fontSize: 14.5 },
  createBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "#22c55e",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "11px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  },
  createBtnPhone: { width: "100%", justifyContent: "center", padding: "13px 18px" },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "12px 16px",
  },
  searchInput: {
    border: "none",
    outline: "none",
    background: "transparent",
    flex: 1,
    fontSize: 14,
  },
  tabRow: { display: "flex", gap: 8, margin: "16px 0 20px", flexWrap: "wrap" },
  // Four status pills don't fit across a 390px screen, and wrapping them onto
  // two rows pushes the cards down. Scrolling the row sideways keeps the
  // filters on one line, the way native apps handle segmented filters.
  tabRowPhone: {
    flexWrap: "nowrap",
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
    scrollbarWidth: "none",
    paddingBottom: 2,
  },
  tab: {
    padding: "7px 18px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#374151",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  tabActive: { background: "#dcfce7", color: "#15803d", borderColor: "#bbf7d0" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: 20,
    paddingBottom: 32,
  },
  // A 300px minimum would overflow a 390px screen once the 16px page gutters
  // are taken off, so phones drop to an explicit single column.
  gridPhone: { gridTemplateColumns: "1fr", gap: 14, paddingBottom: 8 },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    overflow: "hidden",
    padding: 0,
    textAlign: "left",
    cursor: "pointer",
    width: "100%",
    // Column flex + `flex: 1` on the body keeps the stats strip pinned to the
    // bottom of every card, so a two-line title on one card doesn't knock its
    // numbers out of line with its neighbours.
    display: "flex",
    flexDirection: "column",
  },
  cardImage: { width: "100%", height: 160, objectFit: "cover", display: "block" },
  cardBody: { padding: 18, flex: 1, display: "flex", flexDirection: "column" },
  cardTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  cardTitle: { fontWeight: 800, fontSize: 16.5, lineHeight: 1.3 },
  pill: {
    fontSize: 11.5,
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 999,
    whiteSpace: "nowrap",
  },
  cardMetaRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "#6b7280",
    fontSize: 13,
    marginBottom: 5,
  },
  cardStats: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    marginTop: "auto",
    paddingTop: 14,
    borderTop: "1px solid #f3f4f6",
  },
  statLabel: { fontSize: 11.5, color: "#9ca3af", fontWeight: 600, marginBottom: 3 },
  statValue: { fontWeight: 800, fontSize: 15 },
  statValueGreen: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontWeight: 800,
    fontSize: 15,
    color: "#15803d",
  },
  statValueBlue: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontWeight: 800,
    fontSize: 15,
    color: "#2563eb",
  },
  empty: {
    background: "#fff",
    border: "1px dashed #d1d5db",
    borderRadius: 16,
    padding: "48px 24px",
    textAlign: "center",
  },
};
