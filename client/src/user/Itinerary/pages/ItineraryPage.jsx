import React, { useEffect, useMemo, useState } from "react";
import { Search, Plus, Calendar, Leaf, Cloud, MapPin, Trash2 } from "lucide-react";
import ItineraryShell from "../components/ItineraryShell";
import useMediaQuery, { BREAKPOINTS } from "../hooks/useMediaQuery";
import {
  ITINERARY_STATUSES,
  MOCK_ITINERARIES,
  formatDate,
  getDestination,
} from "../constants/itineraryData";
import {
  getMyItineraries,
  deleteItinerary,
} from "../../../firebase/itineraryService";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=600&q=80";

/** Map a saved Firestore itinerary onto the shape ItineraryCard expects. */
function savedItineraryToCard(it) {
  const destinations = Array.isArray(it.destinations) ? it.destinations : [];
  return {
    id: it.itineraryId || it.id,
    name: it.title || "Untitled trip",
    status: it.status || "Planning",
    destinationName:
      destinations.map((d) => d.name).join(", ") ||
      it.startLocation?.name ||
      "—",
    startDate: it.dates?.startDate || "",
    endDate: it.dates?.endDate || "",
    // ecoScore is the plan-level preview saved by the wizard (Module 1);
    // carbonKg is still filled in later by Module 2. Dash until present.
    ecoScore: it.ecoScore ?? "—",
    carbonKg: it.carbonKg ?? "—",
    activityIds: Array.isArray(it.activityIds) ? it.activityIds : [],
    imageUrl:
      getDestination(destinations[0]?.destinationId)?.imageUrl || FALLBACK_IMAGE,
    __saved: true,
  };
}

/** Pill colours per itinerary status, matching the Challenges difficulty pills. */
function statusPillStyle(status) {
  if (status === "Active") return { background: "#dcfce7", color: "#15803d" };
  if (status === "Completed") return { background: "#e0e7ff", color: "#4338ca" };
  return { background: "#fef3c7", color: "#b45309" }; // Planning
}

function ItineraryCard({ itinerary, onOpen, onDelete }) {
  // The delete control is a sibling of the card button (never nested inside it)
  // so the card keeps working as a single open-on-click target and the markup
  // stays valid. Only itineraries saved to Firestore can be deleted — the mock
  // sample cards have no id in the database.
  return (
    <div style={styles.cardWrap}>
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

      {itinerary.__saved && (
        <button
          type="button"
          style={styles.deleteBtn}
          title="Delete itinerary"
          aria-label={`Delete ${itinerary.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(itinerary);
          }}
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
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
  const [saved, setSaved] = useState([]);
  // Delete flow: the card awaiting confirmation, an in-flight flag, and a
  // transient success/error message shown at the top of the list.
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState(null);
  const isPhone = useMediaQuery(BREAKPOINTS.phone);

  // Real itineraries this user has saved to Firebase. The mock list is kept
  // below them as sample data so the page never looks empty in a demo.
  useEffect(() => {
    let active = true;
    getMyItineraries()
      .then((rows) => {
        if (active) setSaved(rows.map(savedItineraryToCard));
      })
      .catch((err) => {
        console.warn("Could not load saved itineraries:", err);
      });
    return () => {
      active = false;
    };
  }, []);

  // Auto-dismiss the success/error message so it doesn't linger.
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function handleConfirmDelete() {
    const target = deleteTarget;
    if (!target || deleting) return;

    setDeleting(true);
    try {
      await deleteItinerary(target.id);
      // Drop just this card from the list — no page refresh.
      setSaved((prev) => prev.filter((card) => card.id !== target.id));
      setNotice({ type: "success", text: "Itinerary deleted." });
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete itinerary:", err);
      setNotice({
        type: "error",
        text:
          err?.message ||
          "Could not delete the itinerary. Please try again.",
      });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const allItineraries = useMemo(
    () => [...saved, ...itineraries],
    [saved, itineraries]
  );

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return allItineraries.filter((it) => {
      const matchesStatus = statusFilter === "All" || it.status === statusFilter;
      const matchesSearch =
        needle === "" ||
        it.name.toLowerCase().includes(needle) ||
        it.destinationName.toLowerCase().includes(needle);
      return matchesStatus && matchesSearch;
    });
  }, [allItineraries, search, statusFilter]);

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

      {notice && (
        <div
          role="status"
          style={{
            ...styles.notice,
            ...(notice.type === "error"
              ? styles.noticeError
              : styles.noticeSuccess),
          }}
        >
          {notice.text}
        </div>
      )}

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
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {deleteTarget && (
        <div
          style={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Delete itinerary"
          onClick={() => {
            if (!deleting) setDeleteTarget(null);
          }}
        >
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>Delete itinerary</div>
            <p style={styles.modalText}>
              Are you sure you want to delete this itinerary?
            </p>
            <div style={styles.modalActions}>
              <button
                type="button"
                style={styles.modalCancelBtn}
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                style={styles.modalDeleteBtn}
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
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
  // Positioning context for the overlaid delete button. Stretches so cards in
  // the same grid row stay equal height, matching the previous layout.
  cardWrap: { position: "relative", display: "flex" },
  deleteBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    borderRadius: 8,
    border: "1px solid #fecaca",
    background: "rgba(255, 255, 255, 0.95)",
    color: "#dc2626",
    cursor: "pointer",
    padding: 0,
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    overflow: "hidden",
    padding: 0,
    textAlign: "left",
    cursor: "pointer",
    width: "100%",
    flex: 1,
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
  notice: {
    borderRadius: 10,
    padding: "11px 16px",
    fontSize: 13.5,
    fontWeight: 600,
    marginBottom: 14,
    border: "1px solid",
  },
  noticeSuccess: {
    background: "#dcfce7",
    color: "#15803d",
    borderColor: "#bbf7d0",
  },
  noticeError: {
    background: "#fee2e2",
    color: "#b91c1c",
    borderColor: "#fecaca",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(17, 24, 39, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 50,
  },
  modal: {
    background: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
  },
  modalTitle: { fontSize: 17, fontWeight: 800, marginBottom: 8 },
  modalText: { color: "#4b5563", fontSize: 14, margin: "0 0 20px" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10 },
  modalCancelBtn: {
    background: "#fff",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    padding: "9px 16px",
    fontSize: 13.5,
    fontWeight: 700,
    cursor: "pointer",
  },
  modalDeleteBtn: {
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "9px 16px",
    fontSize: 13.5,
    fontWeight: 700,
    cursor: "pointer",
  },
};
