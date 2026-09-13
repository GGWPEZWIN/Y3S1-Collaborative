import React, {
  useEffect,
  useState,
} from "react";

import {
  Calendar,
  MapPin,
  Search,
  ChevronLeft,
  TrendingDown,
} from "lucide-react";

import {
  getCurrentUser,
  getTravelHistorySummary,
  getTravelHistory,
} from "../../../firebase/travelHistoryService";


export default function TravelHistory({
  onNavigate,
  onBack,
}) {

  const [trips, setTrips] =
    useState([]);

  const [summary, setSummary] =
    useState({
      tripsCompleted: 0,
      avgEcoScore: 0,
      totalCarbonKg: 0,
    });

  const [searchText, setSearchText] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All Trips");

  const [sortBy, setSortBy] =
    useState("Newest First");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  // ==========================================================
  // LOAD DATA
  // ==========================================================

  const loadTravelHistory = async () => {

    try {

      setLoading(true);
      setError("");

      const [
        summaryData,
        tripsData,
      ] = await Promise.all([

        getTravelHistorySummary(),

        getTravelHistory({
          status: statusFilter,
          sortBy,
          queryText: searchText,
        }),

      ]);

      setSummary(summaryData);
      setTrips(tripsData);

    } catch (err) {

      console.error(
        "Failed to load travel history:",
        err
      );

      setError(
        err.message ||
        "Failed to load travel history."
      );

    } finally {

      setLoading(false);

    }
  };


  useEffect(() => {

    loadTravelHistory();

  }, [
    statusFilter,
    sortBy,
    searchText,
  ]);


  // ==========================================================
  // GRADE STYLE
  // ==========================================================

  const getGradeStyle = (
    grade
  ) => {

    if (grade === "A+") {
      return {
        background: "#dcfce7",
        color: "#15803d",
      };
    }

    if (grade === "A") {
      return {
        background: "#dcfce7",
        color: "#16a34a",
      };
    }

    if (grade === "A-") {
      return {
        background: "#ecfccb",
        color: "#4d7c0f",
      };
    }

    if (grade === "B+") {
      return {
        background: "#fef3c7",
        color: "#d97706",
      };
    }

    if (grade === "B") {
      return {
        background: "#fef3c7",
        color: "#d97706",
      };
    }

    if (grade === "C") {
      return {
        background: "#ffedd5",
        color: "#ea580c",
      };
    }

    return {
      background: "#fee2e2",
      color: "#dc2626",
    };
  };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div style={styles.page}>

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div style={styles.header}>

        {/* BACK TO COMMUNITY */}

        <button
          type="button"
          onClick={() =>
            onBack
              ? onBack()
              : onNavigate?.(
                  "/community"
                )
          }
          style={styles.backButton}
        >

          <ChevronLeft size={20} />

          <span>
            Back to Community
          </span>

        </button>


        {/* PAGE TITLE */}

        <div style={styles.titleSection}>

          <h1 style={styles.title}>
            Travel History
          </h1>

          <p style={styles.subtitle}>
            Track your completed journeys
            and environmental impact.
          </p>

        </div>



      </div>


      {/* =====================================================
          SUMMARY
      ====================================================== */}

      <div style={styles.summaryGrid}>

        <SummaryCard
          value={
            summary.tripsCompleted
          }
          label="Trips Completed"
        />

        <SummaryCard
          value={
            summary.avgEcoScore
          }
          label="Avg Eco Score"
          green
        />

        <SummaryCard
          value={`${summary.totalCarbonKg} kg`}
          label="Total CO₂"
        />

      </div>


      {/* =====================================================
          FILTER BAR
      ====================================================== */}

      <div style={styles.filterCard}>

        <div style={styles.searchBox}>

          <Search
            size={18}
            color="#9ca3af"
          />

          <input
            value={searchText}
            onChange={(e) =>
              setSearchText(
                e.target.value
              )
            }
            placeholder="Search trips..."
            style={styles.searchInput}
          />

        </div>


        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value
            )
          }
          style={styles.select}
        >

          <option>
            All Trips
          </option>

          <option>
            Completed
          </option>

          <option>
            Upcoming
          </option>

          <option>
            Cancelled
          </option>

        </select>


        <select
          value={sortBy}
          onChange={(e) =>
            setSortBy(
              e.target.value
            )
          }
          style={styles.select}
        >

          <option>
            Newest First
          </option>

          <option>
            Oldest First
          </option>

          <option>
            Highest Score
          </option>

        </select>

      </div>


      {/* =====================================================
          ERROR
      ====================================================== */}

      {error && (

        <div style={styles.error}>

          <strong>
            Unable to load travel history.
          </strong>

          <div
            style={{
              marginTop: 6,
            }}
          >
            {error}
          </div>

        </div>

      )}


      {/* =====================================================
          TRIPS
      ====================================================== */}

      {loading ? (

        <div style={styles.centerMessage}>
          Loading travel history...
        </div>

      ) : trips.length === 0 ? (

        <div style={styles.emptyState}>

          <div style={styles.emptyIcon}>
            🌱
          </div>

          <h3 style={styles.emptyTitle}>
            No trips found
          </h3>

          <p style={styles.emptyText}>
            Try changing your search or
            filter.
          </p>

        </div>

      ) : (

        <div style={styles.tripList}>

          {trips.map((trip) => {

            const gradeStyle =
              getGradeStyle(
                trip.grade
              );

            const scorePct =
              Math.min(
                Math.max(
                  Number(
                    trip.ecoScore
                  ) || 0,
                  0
                ),
                100
              );

            return (

              <div
                key={trip.id}
                style={styles.tripCard}
              >

                <div
                  style={styles.topBar}
                />


                <div
                  style={styles.tripBody}
                >

                  {/* TRIP HEADER */}

                  <div
                    style={
                      styles.tripHeader
                    }
                  >

                    <div
                      style={
                        styles.tripInfo
                      }
                    >

                      <div
                        style={
                          styles.nameRow
                        }
                      >

                        <h3
                          style={
                            styles.tripName
                          }
                        >
                          {trip.title}
                        </h3>

                        <span
                          style={
                            styles.statusPill
                          }
                        >
                          {trip.status}
                        </span>

                      </div>


                      <div
                        style={
                          styles.metaRow
                        }
                      >

                        <Calendar
                          size={15}
                          color="#9ca3af"
                        />

                        <span>
                          {trip.dateRange ||
                            "Date unavailable"}
                        </span>

                      </div>


                      {trip.location && (

                        <div
                          style={
                            styles.metaRow
                          }
                        >

                          <MapPin
                            size={15}
                            color="#9ca3af"
                          />

                          <span>
                            {trip.location}
                          </span>

                        </div>

                      )}

                    </div>


                    {/* GRADE */}

                    <div
                      style={{
                        ...styles.gradeCircle,
                        background:
                          gradeStyle.background,
                        color:
                          gradeStyle.color,
                      }}
                    >
                      {trip.grade}
                    </div>

                  </div>


                  {/* STATS */}

                  <div
                    style={
                      styles.statsGrid
                    }
                  >

                    {/* SCORE */}

                    <div>

                      <div
                        style={
                          styles.statLabel
                        }
                      >
                        Eco Score
                      </div>

                      <div
                        style={
                          styles.statValueRow
                        }
                      >

                        <span>
                          🌱
                        </span>

                        <span
                          style={
                            styles.statValue
                          }
                        >
                          {trip.ecoScore}
                        </span>

                        <span
                          style={
                            styles.gradeInline
                          }
                        >
                          {trip.grade}
                        </span>

                      </div>

                      <div
                        style={
                          styles.progressTrack
                        }
                      >

                        <div
                          style={{
                            ...styles.progressFill,
                            width:
                              `${scorePct}%`,
                          }}
                        />

                      </div>

                    </div>


                    {/* CARBON */}

                    <div>

                      <div
                        style={
                          styles.statLabel
                        }
                      >
                        Carbon
                      </div>

                      <div
                        style={
                          styles.statValueRow
                        }
                      >

                        <TrendingDown
                          size={17}
                          color="#2563eb"
                        />

                        <span
                          style={
                            styles.statValue
                          }
                        >
                          {trip.carbonKg} kg CO₂
                        </span>

                      </div>

                    </div>


                  </div>

                </div>

              </div>

            );
          })}

        </div>

      )}

    </div>
  );
}


// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  value,
  label,
  green = false,
}) {

  let valueColor =
    "#111827";

  if (green) {
    valueColor =
      "#16a34a";
  }

  return (

    <div
      style={styles.summaryCard}
    >

      <div
        style={{
          ...styles.summaryValue,
          color: valueColor,
        }}
      >
        {value}
      </div>

      <div
        style={
          styles.summaryLabel
        }
      >
        {label}
      </div>

    </div>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles = {

  // ==========================================================
  // PAGE
  // ==========================================================

  page: {
    minHeight: "100vh",
    background: "#f9fafb",
    padding: "48px 54px 60px",
    boxSizing: "border-box",
    width: "100%",
    overflowX: "hidden",
  },


  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    position: "relative",
    marginBottom: 34,
  },

  backButton: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    border: "none",
    background: "transparent",
    color: "#374151",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    padding: 0,
  },

  titleSection: {
    marginTop: 36,
  },

  title: {
    margin: 0,
    fontSize: 42,
    lineHeight: 1.15,
    fontWeight: 800,
    color: "#111827",
    letterSpacing: "-0.8px",
  },

  subtitle: {
    margin: "10px 0 0",
    color: "#6b7280",
    fontSize: 16,
    lineHeight: 1.5,
  },


  // ==========================================================
  // SUMMARY
  // ==========================================================

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: 22,
    marginBottom: 24,
  },

  summaryCard: {
    background: "#fff",
    border: "1px solid #f0f1f3",
    borderRadius: 18,
    padding: "26px 24px",
    boxShadow:
      "0 1px 3px rgba(0,0,0,0.04)",
  },

  summaryValue: {
    fontSize: 30,
    fontWeight: 750,
    marginBottom: 8,
  },

  summaryLabel: {
    fontSize: 14,
    color: "#9ca3af",
  },


  // ==========================================================
  // FILTER
  // ==========================================================

  filterCard: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    background: "#fff",
    border:
      "1px solid #f0f1f3",
    borderRadius: 16,
    padding: 14,
    marginBottom: 24,
  },

  searchBox: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: 8,
    border:
      "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "9px 12px",
    background: "#fff",
  },

  searchInput: {
    border: "none",
    outline: "none",
    width: "100%",
    fontSize: 14,
    background: "transparent",
  },

  select: {
    border:
      "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "10px 14px",
    background: "#fff",
    color: "#374151",
    fontSize: 14,
    outline: "none",
    cursor: "pointer",
  },


  // ==========================================================
  // ERROR
  // ==========================================================

  error: {
    background: "#fef2f2",
    border:
      "1px solid #fecaca",
    color: "#b91c1c",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },


  // ==========================================================
  // LOADING
  // ==========================================================

  centerMessage: {
    padding: 50,
    textAlign: "center",
    color: "#6b7280",
  },


  // ==========================================================
  // EMPTY
  // ==========================================================

  emptyState: {
    background: "#fff",
    padding: 50,
    textAlign: "center",
    borderRadius: 18,
  },

  emptyIcon: {
    fontSize: 40,
  },

  emptyTitle: {
    color: "#111827",
  },

  emptyText: {
    color: "#9ca3af",
  },


  // ==========================================================
  // TRIP LIST
  // ==========================================================

  tripList: {
    display: "flex",
    flexDirection: "column",
    gap: 28,
  },

  tripCard: {
    background: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    border:
      "1px solid #f0f1f3",
    boxShadow:
      "0 1px 3px rgba(0,0,0,0.04)",
  },

  topBar: {
    height: 6,
    background: "#22c55e",
  },

  tripBody: {
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },


  // ==========================================================
  // TRIP HEADER
  // ==========================================================

  tripHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
    gap: 20,
  },

  tripInfo: {
    minWidth: 0,
    flex: 1,
  },

  nameRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },

  tripName: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "#111827",
  },

  statusPill: {
    fontSize: 12,
    fontWeight: 600,
    background: "#dcfce7",
    color: "#15803d",
    padding: "5px 10px",
    borderRadius: 999,
  },

  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 14,
    color: "#6b7280",
    marginTop: 7,
  },

  gradeCircle: {
    width: 54,
    height: 54,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 17,
    fontWeight: 700,
    flexShrink: 0,
  },


  // ==========================================================
  // TRIP STATS
  // ==========================================================

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: 18,
  },

  statLabel: {
    fontSize: 12,
    color: "#9ca3af",
    marginBottom: 5,
  },

  statValueRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },

  statValue: {
    fontSize: 17,
    fontWeight: 700,
    color: "#111827",
  },

  gradeInline: {
    fontSize: 14,
    fontWeight: 600,
    color: "#16a34a",
  },

  progressTrack: {
    width: "100%",
    height: 6,
    background: "#f3f4f6",
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 8,
  },

  progressFill: {
    height: "100%",
    background: "#111827",
    borderRadius: 999,
  },
};