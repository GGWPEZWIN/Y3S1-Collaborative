import React, { useEffect, useState } from "react";
import { ChevronLeft, Search } from "lucide-react";
import ReportCard from "../components/ReportCard";
import {
  getCurrentUser,
  getTravelHistorySummary,
  getTravelHistory,
} from "../services/dashboardService";

const STATUS_OPTIONS = ["All Trips", "Completed", "Upcoming"];
const SORT_OPTIONS = ["Newest First", "Oldest First", "Highest Score"];

function MiniStat({ value, label, valueColor = "#111827" }) {
  return (
    <div style={styles.miniStat}>
      <div style={{ ...styles.miniStatValue, color: valueColor }}>{value}</div>
      <div style={styles.miniStatLabel}>{label}</div>
    </div>
  );
}

/**
 * TravelHistory
 *
 * Lists completed (and upcoming) trips with search, status filter, and
 * sort controls, each rendered as a ReportCard. Data comes from
 * dashboardService (mock for now).
 *
 * Props: onBack() — called when the "Back" link is clicked.
 */
export default function TravelHistory({ onBack }) {
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(null);
  const [trips, setTrips] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All Trips");
  const [sortBy, setSortBy] = useState("Newest First");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getCurrentUser(), getTravelHistorySummary()]).then(([u, s]) => {
      setUser(u);
      setSummary(s);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    getTravelHistory({ status, sortBy, query }).then((data) => {
      setTrips(data);
      setLoading(false);
    });
  }, [status, sortBy, query]);

  return (
    <div style={styles.page}>
      {/* Top bar */}
      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.logoMark}>🌿</div>
          <span style={styles.brandName}>GreenTrip Malaysia</span>
        </div>
        {user && (
          <div style={styles.userChip}>
            <div style={styles.userText}>
              <div style={styles.userName}>{user.name}</div>
              <div style={styles.userScore}>Eco Score: {user.ecoScore.toLocaleString()}</div>
            </div>
            <div style={styles.avatar}>🐼</div>
          </div>
        )}
      </header>

      <main style={styles.main}>
        <div>
          <h1 style={styles.pageTitle}>Travel History</h1>
          <p style={styles.pageSubtitle}>
            Review your eco-journeys and download personalized report cards
          </p>
        </div>

        <button type="button" onClick={onBack} style={styles.backBtn}>
          <ChevronLeft size={18} />
          Back
        </button>

        {/* Summary stats */}
        {summary && (
          <div style={styles.summaryGrid}>
            <MiniStat value={summary.tripsCompleted} label="Trips Completed" />
            <MiniStat value={summary.avgEcoScore} label="Avg Eco Score" valueColor="#16a34a" />
            <MiniStat value={`${summary.totalCarbonKg} kg`} label="Total CO₂" />
            <MiniStat value={summary.badgesEarned} label="Badges Earned" valueColor="#f59e0b" />
          </div>
        )}

        {/* Search + filters */}
        <div style={styles.filterCard}>
          <div style={styles.searchWrap}>
            <Search size={18} color="#9ca3af" style={styles.searchIcon} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search trips..."
              style={styles.searchInput}
            />
          </div>

          <div style={styles.filterGrid}>
            <label style={styles.filterCol}>
              <span style={styles.filterLabel}>Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.select}>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>

            <label style={styles.filterCol}>
              <span style={styles.filterLabel}>Sort by</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={styles.select}>
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Trip list */}
        {loading ? (
          <div style={styles.emptyState}>Loading trips…</div>
        ) : trips.length === 0 ? (
          <div style={styles.emptyState}>
            No trips match your search — try a different keyword or filter.
          </div>
        ) : (
          <div style={styles.tripList}>
            {trips.map((trip) => (
              <ReportCard
                key={trip.id}
                trip={trip}
                onViewReport={(t) => console.log("view report", t.id)}
                onDownload={(t) => console.log("download report", t.id)}
                onShare={(t) => console.log("share report", t.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f9fafb" },
  header: {
    background: "#fff",
    borderBottom: "1px solid #f3f4f6",
    padding: "16px 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  logoMark: {
    width: 36,
    height: 36,
    background: "#16a34a",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
  },
  brandName: { fontSize: 20, fontWeight: 700, color: "#111827" },
  userChip: { display: "flex", alignItems: "center", gap: 12 },
  userText: { textAlign: "right", lineHeight: 1.3 },
  userName: { fontWeight: 600, color: "#111827" },
  userScore: { fontSize: 13.5, color: "#9ca3af" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#dcfce7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
  },
  main: {
    maxWidth: 1024,
    margin: "0 auto",
    padding: "32px",
    display: "flex",
    flexDirection: "column",
    gap: 24,
    textAlign: "left",
  },
  pageTitle: { fontSize: 28, fontWeight: 800, color: "#111827", margin: 0 },
  pageSubtitle: { color: "#6b7280", marginTop: 6, fontSize: 14.5 },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "transparent",
    border: "none",
    color: "#374151",
    fontWeight: 500,
    fontSize: 14.5,
    cursor: "pointer",
    padding: 0,
    width: "fit-content",
  },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 },
  miniStat: {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #f3f4f6",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    padding: 20,
  },
  miniStatValue: { fontSize: 24, fontWeight: 700 },
  miniStatLabel: { fontSize: 14, color: "#9ca3af", marginTop: 4 },
  filterCard: {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #f3f4f6",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  searchWrap: { position: "relative" },
  searchIcon: { position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" },
  searchInput: {
    width: "100%",
    background: "#f3f4f6",
    borderRadius: 12,
    border: "none",
    padding: "12px 16px 12px 44px",
    fontSize: 14,
    color: "#374151",
    outline: "none",
    boxSizing: "border-box",
  },
  filterGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 },
  filterCol: { display: "flex", flexDirection: "column", gap: 6 },
  filterLabel: { fontSize: 14, fontWeight: 500, color: "#374151" },
  select: {
    background: "#f3f4f6",
    borderRadius: 12,
    border: "none",
    padding: "12px 16px",
    fontSize: 14,
    color: "#374151",
    outline: "none",
  },
  emptyState: { textAlign: "center", color: "#9ca3af", padding: "48px 0" },
  tripList: { display: "flex", flexDirection: "column", gap: 24, paddingBottom: 32 },
};